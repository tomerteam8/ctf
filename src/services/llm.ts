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
      return '\n\nDIFFICULTY: EASY — Be very lenient. If the user\'s prompt is even loosely related to an action, match it and succeed. Accept vague references to assets.';
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
2. Generate 4-8 lines of realistic terminal/tool output appropriate to the action
3. Whether the action succeeds or fails

IMPORTANT RULES:
- All actions are available to attempt. There are no locked actions.
- If an action requires assets, it only succeeds if the user explicitly references or uses the required asset in their prompt. If they try the action without mentioning the asset, it should FAIL with realistic error output showing why (e.g. "Access denied", "Authentication required", "Missing credentials").
- If no action matches the prompt, set matchedActionId to null and provide a helpful message suggesting available actions.
- The revealedNodes and revealedAssets MUST come exactly from the matched action's definition (listed above). Do NOT invent new ones.
- If success is false, revealedNodes and revealedAssets should be empty arrays.
- Terminal logs should look like realistic command-line output (nmap, sqlmap, gobuster, curl, etc.)

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

function parseResponse(content: string): LLMResponse {
  const jsonStr = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  const parsed: LLMResponse = JSON.parse(jsonStr);
  return {
    matchedActionId: parsed.matchedActionId ?? null,
    success: parsed.success ?? false,
    logs: parsed.logs ?? [],
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
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
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
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
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
    const error = await response.text();
    throw new Error(`Claude proxy error: ${response.status} - ${error}`);
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

  let raw: string;
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
