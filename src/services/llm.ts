import type { PentestNode, Asset, LLMResponse, Difficulty } from '../data/types';
import { sendPromptToServer } from './auth';

export type LLMProvider = 'openai' | 'anthropic' | 'local';

export const LLM_PROVIDER: LLMProvider =
  (import.meta.env.VITE_LLM_PROVIDER as LLMProvider) || 'openai';

export const LLM_NEEDS_KEY = LLM_PROVIDER !== 'local';

const LLM_MODEL: string =
  import.meta.env.VITE_LLM_MODEL ||
  (LLM_PROVIDER === 'openai' ? 'gpt-4o-mini' : 'claude-sonnet-4-20250514');

// ---------------------------------------------------------------------------
// Prompt building (shared across all providers)
// ---------------------------------------------------------------------------

function getDifficultyInstructions(difficulty: Difficulty): string {
  switch (difficulty) {
    case 'easy':
      return '\n\nDIFFICULTY: EASY — Be lenient. The user must describe what they want to test or investigate, not just ask a question. They do NOT need technical jargon — plain language like "check what services are exposed", "test if we can access other users\' data", "look for ways to reach internal systems" is fine. Match based on intent: e.g. "see what\'s running on this server" should match a service discovery action. Accept vague references to assets.';
    case 'normal':
      return '\n\nDIFFICULTY: NORMAL — Be moderate. The user should clearly describe the security test they want to perform. They must reference required assets by name or type. CRITICAL: If an action has required assets, the user MUST explicitly mention the asset name or value in their prompt. If they do not, you MUST set success to false. No exceptions.';
    case 'hard':
      return '\n\nDIFFICULTY: HARD — Be very strict. Only match if the user describes the specific vulnerability class or attack technique. CRITICAL: If an action has required assets, the user MUST include the exact asset name and value in their prompt. If they do not, you MUST set success to false. No exceptions. Vague prompts like "hack it" or "test the security" without specifying the approach and credentials should ALWAYS fail.';
  }
}

function buildSystemPrompt(node: PentestNode, assets: Asset[], difficulty: Difficulty): string {
  const actionsDesc = node.possibleActions
    .map((a) => {
      const reveals = [];
      if (a.revealsNodes.length > 0) reveals.push(`Reveals nodes: ${a.revealsNodes.join(', ')}`);
      if (a.revealsAssets && a.revealsAssets.length > 0)
        reveals.push(`Reveals assets: ${a.revealsAssets.map((ra) => `${ra.name} (${ra.type})`).join(', ')}`);
      return `- ${a.name} [id: ${a.id}] (${a.category}): ${a.description}
  Required assets: ${a.requiredAssets.join(', ') || 'none'}
  ${reveals.join('\n  ')}`;
    })
    .join('\n');

  const assetsDesc =
    assets.length > 0
      ? assets.map((a) => `- ${a.name} (${a.type}): ${a.value}`).join('\n')
      : 'None';

  return `You are a security assessment simulation engine for an executive cybersecurity training exercise. The user is a CISO-level participant investigating a target system. They will describe security tests in business and risk language, not necessarily using technical tool names.

Current target: ${node.title} (${node.type}) at ${node.baseUrl}
Description: ${node.data}

Available security tests:
${actionsDesc}

Intelligence gathered so far:
${assetsDesc}

Based on the user's prompt, determine:
1. Which security test (if any) they are trying to perform
2. Generate 8-15 lines of assessment output in the style of a penetration test report — structured findings, not raw terminal dumps
3. Whether the test succeeds or fails

IMPORTANT RULES:
- All tests are available to attempt. There are no locked tests.
- ACTION MATCHING (Normal/Hard): Only match a test if the user's described approach aligns with what the test represents. Do NOT match loosely by category. For example, checking for exposed services is NOT the same as testing for hidden endpoints; testing for injection flaws is NOT the same as testing access controls. If the user describes a valid security concern that does not correspond to any listed test, set matchedActionId to null, set success to false, and show assessment output indicating the test found no exploitable weakness. On EASY difficulty, match by intent — e.g. "check what services are exposed" matches service discovery, "test if we can access internal systems" matches SSRF. The described intent must still align with what the test actually does.
- GUIDANCE REQUESTS: If the user is asking for help, advice, what to try next, or how to proceed — keywords like "what should I do", "help me", "give me a hint", "what can I try", "I'm stuck", "what are my options", "what would you suggest", "guide me", "next steps" — set matchedActionId to null, success to false, guidance to true, logs to []. Then in message write tactical advice calibrated to difficulty:
  * Easy: Be a cooperative mentor. List every remaining available action by name in plain language and explain exactly what it would do and why it is worth trying. For each, write one sentence saying what to type — e.g. "Try scanning for hidden endpoints by saying something like 'run feroxbuster on the app to find hidden directories'". Call out any gathered assets and tell the user exactly which target they apply to and how to use them. Leave nothing implicit — if there are 4 possible next moves, name all 4.
  * Normal: suggest general attack categories without naming exact techniques. Point to suspicious service-info entries as starting points. Mention asset types (not values) if relevant.
  * Hard: acknowledge the target only, tell them to re-read the service details and think about what each piece of information implies. No hints.
  NEVER name a specific action ID string from the list above.
- QUESTIONS THAT ARE NOT GUIDANCE: If the user asks a bare factual question about the target without intent to act (e.g. "Is the database exposed?", "What services are running?"), set matchedActionId to null, success to false, guidance to false, and in message briefly tell them to try running a test rather than just asking.
- ASSET REQUIREMENTS (Normal/Hard only): If a test requires prior intelligence (assets), it only succeeds if the user explicitly references that intelligence in their prompt. If they try the test without mentioning the required asset, it should FAIL with output explaining why (e.g. "Access denied — no valid credentials provided", "This requires authenticated access"). On Easy difficulty, accept vague references to assets.
- If no test matches the prompt, set matchedActionId to null, set success to false, and provide assessment output showing the approach was tried but yielded no exploitable findings. Include a brief message suggesting the user try a different angle.
- ASSET HINTS ON FAILURE: When the user fails and they have gathered intelligence (assets) that could be useful at this target: on Normal/Hard subtly hint at it ("previously gathered intelligence may be relevant here"). On Easy, be direct — name the asset type and tell the user to include it in their next attempt (e.g. "You have employee credentials — try referencing them explicitly in your command").
- The revealedNodes and revealedAssets MUST come exactly from the matched test's definition (listed above). Do NOT invent new ones.
- If success is false, revealedNodes and revealedAssets should be empty arrays.

OUTPUT STYLE — produce authentic penetration testing terminal output using real open-source tools:

logs field (10–18 lines): Write the $ shell commands and their raw stdout that a pentester would actually run. Pick the right tool for the job:

DIRECTORY / ENDPOINT DISCOVERY
  Use feroxbuster or ffuf. Show the command with wordlist, status filter, and target URL, then print the discovered paths (status code, size, words, path). Example:
    $ feroxbuster -u https://shop.target.com -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -s 200,301,302,403 -x php,js,json --silent
    200      GET   1423l   4821w  /api/v1/users
    301      GET      0l      0w  /admin  ->  /admin/
    200      GET    312l    987w  /api/v1/orders
    403      GET     11l     21w  /api/internal

WEB CRAWLING / SPIDERING
  Use katana. Show the command, then print discovered URLs and forms:
    $ katana -u https://shop.target.com -d 3 -jc -kf all -silent
    https://shop.target.com/checkout
    https://shop.target.com/api/v1/cart [POST] field=qty,product_id

SERVICE / PORT DISCOVERY
  Use nmap with -sV -sC. Show the full port table and relevant NSE script output.
    $ nmap -sV -sC -p 80,443,5432,6379 203.0.113.10 --open

PARAMETER / INPUT FUZZING
  Use ffuf with FUZZ marker. Show the command and matching responses:
    $ ffuf -u https://shop.target.com/api/v1/user?id=FUZZ -w /usr/share/seclists/Fuzzing/integers.txt -fc 404 -mc all

SQL INJECTION
  Use sqlmap for detection, then show the extracted payload and DB response rows:
    $ sqlmap -u "https://shop.target.com/checkout" --data="user_type=guest" --dbms=postgresql --level=3 --risk=2 --batch
  Or show a manual Python requests payload when sqlmap is overkill.

SSRF / PATH TRAVERSAL
  Show curl or a Python requests script with the crafted URL, then raw server response body.

COMMAND INJECTION / RCE
  Show the injected payload in context (curl -d or Python post), then raw shell output from the server.
    $ curl -s -X POST http://10.30.1.10:9000/zabbix/scripts/ping -d 'host=127.0.0.1; id'
    uid=998(zabbix) gid=998(zabbix) groups=998(zabbix)

JWT / TOKEN ANALYSIS
  Show jwt_tool or a Python decode snippet, then the decoded header and payload JSON.
    $ jwt_tool eyJhbGci... -d
  Or: python3 -c "import jwt; print(jwt.decode(token, options={'verify_signature':False}))"

CREDENTIAL / AUTH TESTING
  Show curl or hydra, then the server response (200 with session cookie, or 401 body).

DATABASE ACCESS (psql / redis-cli)
  Show the psql or redis-cli connection command, then query + result rows.
    $ psql -h 203.0.113.10 -U postgres -d shop -c "SELECT id,email,password FROM users LIMIT 5;"

CERTIFICATE / DOMAIN RECON
  Show curl -I or openssl s_client, then the certificate fields.
    $ openssl s_client -connect shop.target.com:443 </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates

CVE EXPLOITATION
  Show the relevant PoC Python script invocation and raw response.

RULES:
- Always use exact IPs, ports, URLs, and service versions from the target node data above.
- Use realistic flags, wordlists (/usr/share/seclists/...), and output formatting for each tool.
- Flow: command → raw output → (if needed) follow-up command → final result.
- On failure: show the tool output that indicates the block (WAF intercept, 401/403 body, filtered port, sanitized input).
- Never invent tools. Stick to: feroxbuster, ffuf, katana, nmap, sqlmap, hydra, curl, jwt_tool, psql, redis-cli, openssl, nuclei, python3 requests.

message field: One concise sentence summarising the finding and its risk/impact for a technical audience.

Valid asset types: api_key, credentials, db_credentials, logic_flaw, token, certificate
Valid action categories: recon, exploit, enumeration, analysis

Respond ONLY with JSON in this exact format (no markdown, no code fences, just raw JSON):
{
  "matchedActionId": "action_id_or_null",
  "success": true_or_false,
  "guidance": false,
  "logs": ["line1", "line2", ...],
  "message": "Summary of what happened",
  "revealedNodes": ["node_id1", ...],
  "revealedAssets": [{"type": "asset_type", "name": "Asset Name", "value": "asset_value"}, ...]
}
Set "guidance": true only for guidance/help requests (see GUIDANCE REQUESTS rule). For all action attempts set "guidance": false.${getDifficultyInstructions(difficulty)}`;
}

// ---------------------------------------------------------------------------
// Parse response (shared)
// ---------------------------------------------------------------------------

function parseResponse(content: string | Record<string, unknown>): LLMResponse {
  const parsed = typeof content === 'string' ? JSON.parse(content) : content;
  return {
    matchedActionId: parsed.matchedActionId ?? null,
    success: parsed.success ?? false,
    guidance: parsed.guidance === true,
    logs: (parsed.logs ?? []).map((l: unknown) => typeof l === 'string' ? l : String(l ?? '')),
    message: parsed.message ?? '',
    revealedNodes: parsed.revealedNodes ?? [],
    revealedAssets: parsed.revealedAssets ?? [],
  };
}

// ---------------------------------------------------------------------------
// Provider implementations
// ---------------------------------------------------------------------------

async function sendOpenAI(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  apiKey: string,
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    }),
  });
  if (!response.ok) {
    throw new Error('Failed to reach the AI service. Please check your API key and try again.');
  }
  const data = await response.json();
  return data.choices[0].message.content;
}

async function sendAnthropic(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  apiKey: string,
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      temperature: 0.7,
    }),
  });
  if (!response.ok) {
    throw new Error('Failed to reach the AI service. Please check your API key and try again.');
  }
  const data = await response.json();
  return data.content[0].text;
}

async function sendLocal(
  systemPrompt: string,
  messages: { role: string; content: string }[],
): Promise<string> {
  let response: Response;
  try {
    response = await fetch('http://127.0.0.1:3001/api/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt, messages }),
    });
  } catch {
    throw new Error(
      'Cannot reach local Claude proxy at 127.0.0.1:3001. ' +
      'Start it with: node server.mjs'
    );
  }
  if (!response.ok) {
    let userMessage: string;
    try {
      const body = await response.json();
      userMessage = body.error || 'An unexpected error occurred.';
    } catch {
      userMessage = 'Something went wrong. Please contact the developer and refer them to server.log.';
    }
    throw new Error(userMessage);
  }
  const data = await response.json();
  return data.response;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function sendPrompt(
  prompt: string,
  node: PentestNode,
  assets: Asset[],
  history: { role: string; content: string }[],
  apiKey: string,
  difficulty: Difficulty = 'normal',
  serverToken?: string | null,
): Promise<LLMResponse> {
  const systemPrompt = buildSystemPrompt(node, assets, difficulty);
  const messages = [...history, { role: 'user', content: prompt }];

  let raw: string | Record<string, unknown>;

  if (serverToken !== undefined) {
    // Server mode: proxy through backend using server's API key
    raw = await sendPromptToServer(serverToken, systemPrompt, messages);
  } else {
    switch (LLM_PROVIDER) {
      case 'openai':
        raw = await sendOpenAI(systemPrompt, messages, apiKey);
        break;
      case 'anthropic':
        raw = await sendAnthropic(systemPrompt, messages, apiKey);
        break;
      case 'local':
        raw = await sendLocal(systemPrompt, messages);
        break;
    }
  }

  return parseResponse(raw);
}
