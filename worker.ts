/**
 * Cloudflare Worker entry point for PETER backend.
 *
 * Implements the same API as server.mjs but using the Workers runtime:
 *   - Web Crypto API for JWT (no jsonwebtoken)
 *   - KV namespace for mutable admin config (no fs)
 *   - Env var fallbacks: API_KEY, LLM_PROVIDER, LLM_MODEL
 *   - Static assets via ASSETS binding
 *
 * Secrets (set via `wrangler secret put`):
 *   USER_PASSWORD, ADMIN_PASSWORD, JWT_SECRET
 *
 * Optional KV namespace binding named CONFIG for runtime admin config.
 */

export interface Env {
  USER_PASSWORD?: string;
  ADMIN_PASSWORD?: string;
  JWT_SECRET?: string;
  // Runtime-mutable config stored in KV (set via admin panel)
  CONFIG?: KVNamespace;
  // Env var fallbacks for API config (used when KV has no value)
  API_KEY?: string;
  LLM_PROVIDER?: string;
  LLM_MODEL?: string;
  // Static frontend assets
  ASSETS: Fetcher;
}

interface ServerConfig {
  apiKey: string | null;
  provider: string | null;
  model: string | null;
}

interface GameState {
  adminDifficulty: string;
  unlocks: { stage1: string; stage2: string; all: string };
}

const DEFAULT_GAME_STATE: GameState = {
  adminDifficulty: 'manual',
  unlocks: { stage1: 'idle', stage2: 'idle', all: 'idle' },
};

// ── JWT (HS256 via Web Crypto) ───────────────────────────────────────────────

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64urlDecode(str: string): Uint8Array {
  return Uint8Array.from(
    atob(str.replace(/-/g, '+').replace(/_/g, '/')),
    (c) => c.charCodeAt(0),
  );
}

async function hmacKey(secret: string, usage: ('sign' | 'verify')[]): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usage,
  );
}

async function signToken(
  payload: Record<string, unknown>,
  secret: string,
  expiresInSeconds = 7200,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const enc = (obj: unknown) =>
    b64url(new TextEncoder().encode(JSON.stringify(obj)).buffer as ArrayBuffer);
  const header = enc({ alg: 'HS256', typ: 'JWT' });
  const body = enc({ ...payload, iat: now, exp: now + expiresInSeconds });
  const sig = b64url(
    await crypto.subtle.sign('HMAC', await hmacKey(secret, ['sign']),
      new TextEncoder().encode(`${header}.${body}`)),
  );
  return `${header}.${body}.${sig}`;
}

async function verifyToken(token: string, secret: string): Promise<Record<string, unknown>> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token');
  const [header, body, sig] = parts;
  const valid = await crypto.subtle.verify(
    'HMAC',
    await hmacKey(secret, ['verify']),
    b64urlDecode(sig),
    new TextEncoder().encode(`${header}.${body}`),
  );
  if (!valid) throw new Error('Invalid signature');
  const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
  return payload;
}

// ── CORS / response helpers ──────────────────────────────────────────────────

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

function json(data: unknown, status = 200, origin: string | null = null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

// ── Config (KV-backed with env var fallback) ─────────────────────────────────

async function getConfig(env: Env): Promise<ServerConfig> {
  if (env.CONFIG) {
    const stored = await env.CONFIG.get('server-config', 'json') as ServerConfig | null;
    if (stored) return stored;
  }
  return { apiKey: env.API_KEY ?? null, provider: env.LLM_PROVIDER ?? null, model: env.LLM_MODEL ?? null };
}

async function saveConfig(env: Env, config: ServerConfig): Promise<void> {
  if (!env.CONFIG) throw new Error('KV storage not configured — add a CONFIG KV namespace binding in wrangler.jsonc');
  await env.CONFIG.put('server-config', JSON.stringify(config));
}

// ── LLM calls ────────────────────────────────────────────────────────────────

async function callOpenAI(
  apiKey: string, model: string | null,
  systemPrompt: string, messages: { role: string; content: string }[],
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
  const data = await res.json() as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content;
}

async function callAnthropic(
  apiKey: string, model: string | null,
  systemPrompt: string, messages: { role: string; content: string }[],
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-4-6',
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
  const data = await res.json() as { content: { text: string }[] };
  return data.content[0].text;
}

// ── Main fetch handler ────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const secret = env.JWT_SECRET || 'dev-secret-change-me';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    try {
      // GET /api/game-state — public, returns admin difficulty + unlock states
      if (url.pathname === '/api/game-state' && request.method === 'GET') {
        const state = env.CONFIG
          ? ((await env.CONFIG.get('game-state', 'json') as GameState | null) ?? DEFAULT_GAME_STATE)
          : DEFAULT_GAME_STATE;
        return json(state, 200, origin);
      }

      // GET /api/config
      if (url.pathname === '/api/config' && request.method === 'GET') {
        const cfg = await getConfig(env);
        return json({
          requiresAuth: !!env.USER_PASSWORD,
          hasServerKey: !!cfg.apiKey,
          provider: cfg.provider,
          model: cfg.model,
        }, 200, origin);
      }

      // POST /api/auth/login
      if (url.pathname === '/api/auth/login' && request.method === 'POST') {
        if (!env.USER_PASSWORD) return json({ token: null }, 200, origin);
        const { password } = await request.json() as { password: string };
        if (password !== env.USER_PASSWORD) return json({ error: 'Invalid password' }, 401, origin);
        return json({ token: await signToken({ role: 'user' }, secret, 7200) }, 200, origin);
      }

      // POST /api/auth/admin
      if (url.pathname === '/api/auth/admin' && request.method === 'POST') {
        if (!env.ADMIN_PASSWORD) return json({ error: 'Admin not configured' }, 503, origin);
        const { password } = await request.json() as { password: string };
        if (password !== env.ADMIN_PASSWORD) return json({ error: 'Invalid admin password' }, 401, origin);
        return json({ token: await signToken({ role: 'admin' }, secret, 28800) }, 200, origin);
      }

      // Admin routes — require valid admin JWT
      if (url.pathname.startsWith('/api/admin/')) {
        const auth = request.headers.get('Authorization');
        if (!auth?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401, origin);
        let adminPayload: Record<string, unknown>;
        try {
          adminPayload = await verifyToken(auth.slice(7), secret);
        } catch {
          return json({ error: 'Admin session expired' }, 401, origin);
        }
        if (adminPayload.role !== 'admin') return json({ error: 'Forbidden' }, 403, origin);

        if (url.pathname === '/api/admin/game-state' && request.method === 'POST') {
          if (!env.CONFIG) return json({ error: 'KV storage not configured' }, 503, origin);
          const body = await request.json() as { adminDifficulty?: string; unlocks?: Record<string, string> };
          const validDifficulties = ['easy', 'normal', 'hard', 'manual'];
          if (!body.adminDifficulty || !validDifficulties.includes(body.adminDifficulty)) {
            return json({ error: 'Invalid adminDifficulty' }, 400, origin);
          }
          const unlocks = body.unlocks ?? {};
          const newState: GameState = {
            adminDifficulty: body.adminDifficulty,
            unlocks: {
              stage1: unlocks.stage1 === 'done' ? 'done' : 'idle',
              stage2: unlocks.stage2 === 'done' ? 'done' : 'idle',
              all: unlocks.all === 'done' ? 'done' : 'idle',
            },
          };
          await env.CONFIG.put('game-state', JSON.stringify(newState));
          return json({ success: true }, 200, origin);
        }

        if (url.pathname === '/api/admin/config') {
          if (request.method === 'GET') {
            const cfg = await getConfig(env);
            return json({ hasKey: !!cfg.apiKey, provider: cfg.provider, model: cfg.model }, 200, origin);
          }
          if (request.method === 'POST') {
            const body = await request.json() as { apiKey?: string; provider?: string; model?: string };
            if (!body.provider) return json({ error: 'provider is required' }, 400, origin);
            if (!['openai', 'anthropic'].includes(body.provider)) return json({ error: 'Invalid provider' }, 400, origin);
            const current = await getConfig(env);
            const resolvedKey = body.apiKey || current.apiKey;
            if (!resolvedKey) return json({ error: 'apiKey is required' }, 400, origin);
            await saveConfig(env, { apiKey: resolvedKey, provider: body.provider, model: body.model || null });
            return json({ success: true }, 200, origin);
          }
          if (request.method === 'DELETE') {
            await saveConfig(env, { apiKey: null, provider: null, model: null });
            return json({ success: true }, 200, origin);
          }
        }

        return json({ error: 'Not found' }, 404, origin);
      }

      // POST /api/prompt — LLM proxy
      if (url.pathname === '/api/prompt' && request.method === 'POST') {
        if (env.USER_PASSWORD) {
          const auth = request.headers.get('Authorization');
          if (!auth?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401, origin);
          try {
            await verifyToken(auth.slice(7), secret);
          } catch {
            return json({ error: 'Session expired — please log in again' }, 401, origin);
          }
        }

        const { systemPrompt, messages } = await request.json() as {
          systemPrompt: string;
          messages: { role: string; content: string }[];
        };
        if (!systemPrompt || !Array.isArray(messages)) {
          return json({ error: 'Invalid request: systemPrompt and messages required' }, 400, origin);
        }

        const cfg = await getConfig(env);
        if (!cfg.apiKey || !cfg.provider) {
          return json({ error: 'No LLM configured on server. Ask your admin to set an API key.' }, 400, origin);
        }

        let result: string;
        if (cfg.provider === 'openai') {
          result = await callOpenAI(cfg.apiKey, cfg.model, systemPrompt, messages);
        } else if (cfg.provider === 'anthropic') {
          result = await callAnthropic(cfg.apiKey, cfg.model, systemPrompt, messages);
        } else {
          return json({ error: `Unsupported provider: ${cfg.provider}` }, 400, origin);
        }
        return json({ result }, 200, origin);
      }

      // Fall through to static assets (SPA fallback: serve index.html for unknown paths)
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status === 404) {
        return env.ASSETS.fetch(new Request(new URL('/', url).toString()));
      }
      return assetResponse;

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Internal server error';
      return json({ error: msg }, 500, origin);
    }
  },
};
