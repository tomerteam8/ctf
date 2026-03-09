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
- QUESTIONS ARE NOT ACTIONS: If the user's prompt is only a question (e.g. "What services are running?", "Is the database exposed?") without describing any action or intent to test, set matchedActionId to null and success to false. This applies to ALL difficulty levels. The user must describe a test or investigation, not just ask a question.
- ASSET REQUIREMENTS (Normal/Hard only): If a test requires prior intelligence (assets), it only succeeds if the user explicitly references that intelligence in their prompt. If they try the test without mentioning the required asset, it should FAIL with output explaining why (e.g. "Access denied — no valid credentials provided", "This requires authenticated access"). On Easy difficulty, accept vague references to assets.
- If no test matches the prompt, set matchedActionId to null, set success to false, and provide assessment output showing the approach was tried but yielded no exploitable findings. Include a brief message suggesting the user try a different angle.
- ASSET HINTS ON FAILURE: When the user fails and they have gathered intelligence (assets) that could be useful at this target, subtly hint at it in the failure message. For example, mention "previously gathered intelligence may be relevant here" or reference the general type of finding without giving away the exact solution. Do NOT name the specific test to perform — just nudge toward using what they already have.
- The revealedNodes and revealedAssets MUST come exactly from the matched test's definition (listed above). Do NOT invent new ones.
- If success is false, revealedNodes and revealedAssets should be empty arrays.

OUTPUT STYLE — write as a security assessment report, not raw tool output:
- Use the language of penetration test findings and risk assessments
- Structure output as assessment steps: "Testing...", "Finding:", "Result:", "Risk:"
- Include relevant technical indicators (IP addresses, HTTP status codes, service versions) but frame them as evidence supporting findings, not as raw terminal dumps
- For service discovery: list discovered services with their risk posture ("Port 5432 exposed — PostgreSQL accepting external connections")
- For injection testing: describe the test approach and outcome ("Tested input validation on password field — backend accepts arbitrary values in user_type parameter")
- For access control tests: describe what was accessible and what the business impact is
- For failed tests: describe what was tested and why it didn't work ("Input sanitization prevents template injection — autoescaping is properly configured")
- On success: emphasize the business risk and impact of the finding
- On failure: emphasize the defensive control that prevented exploitation
- Include the target URL/IP from the current target's baseUrl in the output
- Do NOT use raw shell prompts ($), command-line syntax, or tool-specific output formatting. Write prose findings, not terminal logs.

Valid asset types: api_key, credentials, db_credentials, logic_flaw, token, certificate
Valid action categories: recon, exploit, enumeration, analysis

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
