import type { PentestNode, Asset, LLMResponse, Difficulty } from '../data/types';

export type LLMProvider = 'openai' | 'anthropic' | 'local';

export const LLM_PROVIDER: LLMProvider =
  (import.meta.env.VITE_LLM_PROVIDER as LLMProvider) || 'local';

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
      return '\n\nDIFFICULTY: EASY — Be lenient. Accept loose descriptions of techniques. However, the user MUST describe a technique, tool, or specific action they are performing — not just ask a question. Prompts that are only questions (e.g. "What services are running?", "Is access open?", "Can you see others\' data?") without describing HOW they plan to find out MUST fail. The user needs to name a tool, technique, or attack method. Accept vague references to assets.';
    case 'normal':
      return '\n\nDIFFICULTY: NORMAL — Be moderate. The user should clearly describe what they want to do. They must reference required assets by name or type. CRITICAL: If an action has required assets, the user MUST explicitly mention the asset name or value in their prompt. If they do not, you MUST set success to false. No exceptions.';
    case 'hard':
      return '\n\nDIFFICULTY: HARD — Be very strict. Only match if the user precisely describes the specific technique or tool. CRITICAL: If an action has required assets, the user MUST include the exact asset name and value in their prompt. If they do not, you MUST set success to false. No exceptions. Vague prompts like "hack it" or "dump the tables" without specifying credentials should ALWAYS fail.';
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

  return `You are a pentest simulation engine. The user is interacting with a target node in a hacking game.

Current node: ${node.title} (${node.type}) at ${node.baseUrl}
Description: ${node.data}

Available actions:
${actionsDesc}

User's current assets:
${assetsDesc}

Based on the user's prompt, determine:
1. Which action (if any) they are trying to perform
2. Generate 8-15 lines of realistic, varied terminal/tool output appropriate to the action
3. Whether the action succeeds or fails

IMPORTANT RULES:
- All actions are available to attempt. There are no locked actions.
- STRICT ACTION MATCHING: Only match an action if the user's described technique is specifically what the action represents. Do NOT match loosely by category. For example, directory enumeration (gobuster, dirb, dirbuster) is NOT the same as port scanning (nmap); SQL injection is NOT the same as XSS. If the user describes a valid security technique that does not correspond to any listed action, set matchedActionId to null, set success to false, and show realistic output of the technique running but finding nothing useful (e.g. "0 results found", "no vulnerable endpoints discovered", timeouts, 403s).
- QUESTIONS ARE NOT ACTIONS: If the user's prompt is only a question (e.g. "What services are running?", "Is the database exposed?", "Can you escalate your role?") without describing a specific technique, tool, or method, you MUST set matchedActionId to null and success to false. Respond with a message like "You need to specify what technique or tool you want to use." The user must describe HOW they plan to attack, not just WHAT they want to know.
- If an action requires assets, it only succeeds if the user explicitly references or uses the required asset in their prompt. If they try the action without mentioning the asset, it should FAIL with realistic error output showing why (e.g. "Access denied", "Authentication required", "Missing credentials").
- If no action matches the prompt, set matchedActionId to null, set success to false, and provide realistic terminal output showing the technique was attempted but yielded no useful results. Include a brief message suggesting the user try a different approach.
- The revealedNodes and revealedAssets MUST come exactly from the matched action's definition (listed above). Do NOT invent new ones.
- If success is false, revealedNodes and revealedAssets should be empty arrays.

LOG OUTPUT GUIDELINES — make the terminal logs immersive and specific to what the user typed:
- Mirror the tools/techniques the user mentioned (nmap, sqlmap, curl, gobuster, burpsuite, etc.)
- Include realistic details: IP addresses, ports, HTTP status codes, response sizes, timestamps
- For scans: show discovered ports/services progressively, include version info
- For SQL injection: show payloads attempted, server responses, extracted data
- For SSRF: show crafted URLs, internal responses, discovered endpoints
- For enumeration: show directory paths, status codes, response sizes
- For brute force: show attempts, failures, then the successful combo
- On failure: show realistic error output (connection refused, 403 forbidden, WAF blocks, timeouts)
- Vary the style — not every line should start with ">". Mix command prompts ($), tool output, status lines, and raw data
- Include the target URL/IP from the current node's baseUrl in the output

Respond ONLY with JSON in this exact format (no markdown, no code fences, just raw JSON):
{
  "matchedActionId": "action_id_or_null",
  "success": true_or_false,
  "logs": ["line1", "line2", ...],
  "message": "Summary of what happened",
  "revealedNodes": ["node_id1", ...],
  "revealedAssets": [{"type": "asset_type", "name": "Asset Name", "value": "asset_value"}, ...]
}${getDifficultyInstructions(difficulty)}`;
}

// ---------------------------------------------------------------------------
// Parse response (shared)
// ---------------------------------------------------------------------------

function parseResponse(content: string | Record<string, unknown>): LLMResponse {
  const parsed = typeof content === 'string' ? JSON.parse(content) : content;
  return {
    matchedActionId: parsed.matchedActionId ?? null,
    success: parsed.success ?? false,
    logs: (parsed.logs ?? []).map((l) => typeof l === 'string' ? l : String(l ?? '')),
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
// Public API (drop-in replacement for the old sendPrompt)
// ---------------------------------------------------------------------------

export async function sendPrompt(
  prompt: string,
  node: PentestNode,
  assets: Asset[],
  history: { role: string; content: string }[],
  apiKey: string,
  difficulty: Difficulty = 'normal',
): Promise<LLMResponse> {
  const systemPrompt = buildSystemPrompt(node, assets, difficulty);
  const messages = [...history, { role: 'user', content: prompt }];

  let raw: string | Record<string, unknown>;
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

  return parseResponse(raw);
}
