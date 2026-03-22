/**
 * PETER — Backend server
 *
 * Handles:
 *   - JWT authentication (user + admin)
 *   - Admin LLM config management (API key, provider, model)
 *   - LLM proxy (OpenAI, Anthropic, local Claude CLI)
 *   - Static frontend serving in production
 *
 * Environment variables:
 *   USER_PASSWORD     — if set, all users must log in to use the app
 *   ADMIN_PASSWORD    — required for admin panel access
 *   JWT_SECRET        — JWT signing secret (auto-generated if omitted)
 *   PORT              — server port (default: 3001)
 *   CORS_ORIGIN       — allowed CORS origin (default: http://localhost:5173)
 *
 * Usage:
 *   node --env-file=.env server.mjs
 */

import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execFileSync, execFile } from 'child_process';
import { createHash, randomBytes } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function log(level, message, extra) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${level}: ${message}${extra ? ' ' + JSON.stringify(extra) : ''}`;
  console.log(line);
}

// ---------------------------------------------------------------------------
// Config persistence
// ---------------------------------------------------------------------------

const CONFIG_FILE = join(__dirname, 'server-config.json');

let serverConfig = { apiKey: null, provider: null, model: null };

if (existsSync(CONFIG_FILE)) {
  try {
    serverConfig = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
    log('INFO', `Loaded server config: provider=${serverConfig.provider}, hasKey=${!!serverConfig.apiKey}`);
  } catch (e) {
    log('WARN', 'Failed to parse server-config.json, starting fresh');
  }
}

function saveConfig() {
  writeFileSync(CONFIG_FILE, JSON.stringify(serverConfig, null, 2));
}

// ---------------------------------------------------------------------------
// Game state persistence (admin difficulty + unlock stages)
// ---------------------------------------------------------------------------

const GAME_STATE_FILE = join(__dirname, 'server-game-state.json');

let gameState = {
  adminDifficulty: 'manual',
  unlocks: { stage1: 'idle', stage2: 'idle', all: 'idle' },
};

if (existsSync(GAME_STATE_FILE)) {
  try {
    gameState = JSON.parse(readFileSync(GAME_STATE_FILE, 'utf8'));
    log('INFO', `Loaded game state: adminDifficulty=${gameState.adminDifficulty}`);
  } catch (e) {
    log('WARN', 'Failed to parse server-game-state.json, starting fresh');
  }
}

function saveGameState() {
  writeFileSync(GAME_STATE_FILE, JSON.stringify(gameState, null, 2));
}

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const USER_PASSWORD = process.env.USER_PASSWORD || null;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || null;
const JWT_SECRET = process.env.JWT_SECRET || randomBytes(32).toString('hex');
const PORT = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGINS = new Set(
  (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .concat(['http://localhost:5173', 'http://127.0.0.1:5173'])
);
const IS_PROD = process.env.NODE_ENV === 'production';

if (!ADMIN_PASSWORD) {
  log('WARN', 'ADMIN_PASSWORD not set — admin panel is disabled');
}
if (!USER_PASSWORD) {
  log('INFO', 'USER_PASSWORD not set — authentication is disabled');
}

// ---------------------------------------------------------------------------
// Local Claude CLI (optional, dev mode)
// ---------------------------------------------------------------------------

let CLAUDE_PATH = null;
try {
  CLAUDE_PATH = execFileSync('which', ['claude'], { encoding: 'utf-8' }).trim();
  log('INFO', `Claude CLI available at: ${CLAUDE_PATH}`);
} catch {
  log('INFO', 'Claude CLI not found — local mode unavailable');
}

const childEnv = { ...process.env };
delete childEnv.CLAUDECODE;

function runClaude(systemPrompt, messages) {
  return new Promise((resolve, reject) => {
    const fullPrompt = [
      systemPrompt,
      '',
      '--- Conversation history ---',
      ...messages.map((m) => `${m.role}: ${m.content}`),
    ].join('\n');

    const child = execFile(CLAUDE_PATH, [
      '--output-format', 'stream-json',
      '--verbose',
      '-p', '-',
    ], {
      env: childEnv,
      timeout: 180000,
      maxBuffer: 4 * 1024 * 1024,
    }, (err, stdout) => {
      if (err) return reject(err);

      const lines = stdout.split('\n').filter(Boolean);
      let resultText = null;
      for (const line of lines) {
        try {
          const obj = JSON.parse(line);
          if (obj.type === 'result' && obj.result) resultText = obj.result;
        } catch { /* skip */ }
      }

      if (resultText !== null) {
        // Strip markdown fences if present
        const fenceMatch = resultText.match(/```(?:\w*)\s*\n([\s\S]*?)\n```/);
        resolve(fenceMatch ? fenceMatch[1] : resultText);
      } else {
        reject(new Error('No result in Claude output'));
      }
    });

    child.stdin.write(fullPrompt);
    child.stdin.end();
  });
}

// ---------------------------------------------------------------------------
// LLM calls
// ---------------------------------------------------------------------------

async function callOpenAI(apiKey, model, systemPrompt, messages) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${err}`);
  }
  const data = await response.json();
  return data.choices[0].message.content;
}

async function callAnthropic(apiKey, model, systemPrompt, messages) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
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
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic error ${response.status}: ${err}`);
  }
  const data = await response.json();
  return data.content[0].text;
}

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------

function signToken(payload, expiresIn = '2h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------

function requireAuth(req, res, next) {
  if (!USER_PASSWORD) return next();
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = verifyToken(auth.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'Session expired — please log in again' });
  }
}

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = verifyToken(auth.slice(7));
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Admin session expired' });
  }
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || CORS_ORIGINS.has(origin)) {
      cb(null, true);
    } else {
      cb(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '128kb' }));

// ---------------------------------------------------------------------------
// Public routes
// ---------------------------------------------------------------------------

// App config — tells frontend what auth/mode to use
app.get('/api/config', (req, res) => {
  const hasServerKey = !!(serverConfig.apiKey || (CLAUDE_PATH && serverConfig.provider === 'local'));
  res.json({
    requiresAuth: !!USER_PASSWORD,
    hasServerKey,
    provider: serverConfig.provider,
    model: serverConfig.model,
  });
});

// User login
app.post('/api/auth/login', (req, res) => {
  if (!USER_PASSWORD) return res.json({ token: null });
  const { password } = req.body;
  if (!password || password !== USER_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  const token = signToken({ role: 'user' }, '2h');
  log('INFO', 'User logged in');
  res.json({ token });
});

// Admin login
app.post('/api/auth/admin', (req, res) => {
  if (!ADMIN_PASSWORD) return res.status(503).json({ error: 'Admin not configured' });
  const { password } = req.body;
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid admin password' });
  }
  const token = signToken({ role: 'admin' }, '8h');
  log('INFO', 'Admin logged in');
  res.json({ token });
});

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Game state routes
// ---------------------------------------------------------------------------

// Public — returns current admin difficulty + unlock states
app.get('/api/game-state', (req, res) => {
  res.json(gameState);
});

// ---------------------------------------------------------------------------
// Admin routes
// ---------------------------------------------------------------------------

// Get current config (key masked)
app.get('/api/admin/config', requireAdmin, (req, res) => {
  res.json({
    hasKey: !!serverConfig.apiKey,
    provider: serverConfig.provider,
    model: serverConfig.model,
  });
});

// Set API key + provider + model
app.post('/api/admin/config', requireAdmin, (req, res) => {
  const { apiKey, provider, model } = req.body;
  if (!provider) {
    return res.status(400).json({ error: 'provider is required' });
  }
  // apiKey is required unless server already has one (in which case blank = keep existing)
  const resolvedKey = apiKey || serverConfig.apiKey;
  if (!resolvedKey) {
    return res.status(400).json({ error: 'apiKey is required' });
  }
  const validProviders = ['openai', 'anthropic', 'local'];
  if (!validProviders.includes(provider)) {
    return res.status(400).json({ error: `Invalid provider. Must be one of: ${validProviders.join(', ')}` });
  }
  serverConfig = { apiKey: resolvedKey, provider, model: model || null };
  saveConfig();
  log('INFO', `Admin updated config: provider=${provider}, model=${model || 'default'}`);
  res.json({ success: true, provider, model: model || null });
});

// Set admin difficulty + unlock stages
app.post('/api/admin/game-state', requireAdmin, (req, res) => {
  const { adminDifficulty, unlocks } = req.body;
  const validDifficulties = ['easy', 'normal', 'hard', 'manual'];
  const validStates = ['idle', 'done'];
  if (!adminDifficulty || !validDifficulties.includes(adminDifficulty)) {
    return res.status(400).json({ error: 'Invalid adminDifficulty' });
  }
  if (!unlocks || typeof unlocks !== 'object') {
    return res.status(400).json({ error: 'Invalid unlocks' });
  }
  for (const key of ['stage1', 'stage2', 'all']) {
    if (unlocks[key] && !validStates.includes(unlocks[key])) {
      return res.status(400).json({ error: `Invalid unlock state for ${key}` });
    }
  }
  gameState = {
    adminDifficulty,
    unlocks: {
      stage1: unlocks.stage1 || 'idle',
      stage2: unlocks.stage2 || 'idle',
      all: unlocks.all || 'idle',
    },
  };
  saveGameState();
  log('INFO', `Admin updated game state: difficulty=${adminDifficulty}`);
  res.json({ success: true });
});

// Delete API key — return to local mode
app.delete('/api/admin/config', requireAdmin, (req, res) => {
  serverConfig = { apiKey: null, provider: null, model: null };
  saveConfig();
  log('INFO', 'Admin deleted server API key');
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// LLM proxy
// ---------------------------------------------------------------------------

app.post('/api/prompt', requireAuth, async (req, res) => {
  const { systemPrompt, messages } = req.body;

  if (!systemPrompt || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request: systemPrompt and messages required' });
  }

  const provider = serverConfig.provider;
  const hasKey = !!(serverConfig.apiKey || (CLAUDE_PATH && provider === 'local'));

  if (!hasKey || !provider) {
    return res.status(400).json({ error: 'No LLM configured on server. Ask your admin to set an API key.' });
  }

  const userMsg = messages[messages.length - 1]?.content || '';
  log('INFO', `Prompt [${provider}]: "${userMsg.slice(0, 60)}${userMsg.length > 60 ? '…' : ''}"`);

  const start = Date.now();
  try {
    let result;
    if (provider === 'openai') {
      result = await callOpenAI(serverConfig.apiKey, serverConfig.model, systemPrompt, messages);
    } else if (provider === 'anthropic') {
      result = await callAnthropic(serverConfig.apiKey, serverConfig.model, systemPrompt, messages);
    } else if (provider === 'local') {
      if (!CLAUDE_PATH) return res.status(503).json({ error: 'Claude CLI not found on server' });
      if (IS_PROD) return res.status(503).json({ error: 'Local mode not available in production' });
      result = await runClaude(systemPrompt, messages);
    }
    log('INFO', `LLM responded (${Date.now() - start}ms)`);
    res.json({ result });
  } catch (err) {
    log('ERROR', `LLM call failed (${Date.now() - start}ms): ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Serve frontend in production
// ---------------------------------------------------------------------------

if (IS_PROD) {
  const distPath = join(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  log('INFO', `Server running on port ${PORT}`);
  log('INFO', `Auth: ${USER_PASSWORD ? 'enabled' : 'disabled'} | Admin: ${ADMIN_PASSWORD ? 'enabled' : 'disabled'}`);
  log('INFO', `Server key: ${serverConfig.apiKey ? `configured (${serverConfig.provider})` : 'none'}`);
});
