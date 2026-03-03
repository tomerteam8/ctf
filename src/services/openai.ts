import type { PentestNode, Asset, LLMResponse, Difficulty } from '../data/types';

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

Respond ONLY with JSON in this exact format:
{
  "matchedActionId": "action_id_or_null",
  "success": true_or_false,
  "logs": ["line1", "line2", ...],
  "message": "Summary of what happened",
  "revealedNodes": ["node_id1", ...],
  "revealedAssets": [{"type": "asset_type", "name": "Asset Name", "value": "asset_value"}, ...]
}${getDifficultyInstructions(difficulty)}`;
}

export async function sendPrompt(
  prompt: string,
  node: PentestNode,
  assets: Asset[],
  history: { role: string; content: string }[],
  apiKey: string,
  difficulty: Difficulty = 'normal'
): Promise<LLMResponse> {
  const systemPrompt = buildSystemPrompt(node, assets, difficulty);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: prompt },
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  const parsed: LLMResponse = JSON.parse(content);

  return {
    matchedActionId: parsed.matchedActionId ?? null,
    success: parsed.success ?? false,
    logs: parsed.logs ?? [],
    message: parsed.message ?? '',
    revealedNodes: parsed.revealedNodes ?? [],
    revealedAssets: parsed.revealedAssets ?? [],
  };
}
