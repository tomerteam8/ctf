import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PentestNode, Asset, Achievement, ActionResult, Difficulty } from '../data/types';
import { sampleNodes } from '../data/gameData';
import { sendPrompt, LLM_NEEDS_KEY, LLM_PROVIDER } from '../services/llm';

interface PromptMessage {
  role: 'user' | 'assistant';
  content: string;
  success?: boolean;
  matchedActionId?: string | null;
}

interface GameState {
  nodes: Map<string, PentestNode>;
  assets: Asset[];
  selectedNodeId: string | null;
  actionResult: ActionResult | null;
  executingAction: boolean;
  executingPrompt: string;
  apiKey: string;
  promptHistory: Record<string, PromptMessage[]>;
  pendingPromptText: string;
  difficulty: Difficulty;
  nodeFailures: Record<string, number>;
  capturedFlag: { id: string; value: string } | null;
  capturedFlags: string[];
  achievements: Achievement[];
  completedActions: Record<string, string[]>;

  selectNode: (id: string | null) => void;
  executePrompt: (nodeId: string, prompt: string) => Promise<void>;
  discoverNode: (id: string) => void;
  addAsset: (asset: Asset) => void;
  clearActionResult: () => void;
  hasAsset: (type: string) => boolean;
  setApiKey: (key: string) => void;
  setPendingPromptText: (text: string) => void;
  setDifficulty: (d: Difficulty) => void;
  clearFlag: () => void;
  revealAllNodes: () => void;
  resetGame: () => void;
}

const buildInitialNodes = () => {
  const m = new Map<string, PentestNode>();
  sampleNodes.forEach((node) => m.set(node.id, node));
  return m;
};

const PERSIST_KEY = 'peter-game-progress';

export const useGameStore = create<GameState>()(
  persist(
  (set, get) => ({
  nodes: buildInitialNodes(),
  assets: [],
  selectedNodeId: null,
  actionResult: null,
  executingAction: false,
  executingPrompt: '',
  apiKey: localStorage.getItem('peter-openai-key') || '',
  promptHistory: {},
  pendingPromptText: '',
  difficulty: (localStorage.getItem('peter-difficulty') as Difficulty) || 'normal',
  nodeFailures: {},
  capturedFlag: null,
  capturedFlags: [],
  achievements: [],
  completedActions: {},

  selectNode: (id) => set({ selectedNodeId: id }),

  setPendingPromptText: (text) => set({ pendingPromptText: text }),

  setDifficulty: (d) => {
    localStorage.setItem('peter-difficulty', d);
    set({ difficulty: d });
  },

  hasAsset: (type) => get().assets.some((a) => a.type === type),

  setApiKey: (key) => {
    localStorage.setItem('peter-openai-key', key);
    set({ apiKey: key });
  },

  discoverNode: (id) => {
    set((state) => {
      const nodes = new Map(state.nodes);
      const node = nodes.get(id);
      if (node && !node.discovered) {
        nodes.set(id, { ...node, discovered: true, status: 'available' });
      }
      return { nodes };
    });
  },

  addAsset: (asset) => {
    set((state) => {
      const isDupe = state.assets.some(
        (a) => a.type === asset.type && a.value === asset.value,
      );
      if (isDupe) return state;
      return { assets: [...state.assets, asset] };
    });
  },

  clearActionResult: () => set({ actionResult: null }),
  clearFlag: () => set({ capturedFlag: null }),

  revealAllNodes: () => {
    set((state) => {
      const nodes = new Map(state.nodes);
      for (const [id, node] of nodes) {
        if (!node.discovered) {
          nodes.set(id, { ...node, discovered: true, status: 'available' });
        }
      }
      return { nodes };
    });
  },

  executePrompt: async (nodeId, prompt) => {
    if (prompt.trim() === 'R') {
      get().revealAllNodes();
      return;
    }

    const state = get();
    const node = state.nodes.get(nodeId);
    if (!node) return;

    if (LLM_NEEDS_KEY && !state.apiKey) {
      set({
        actionResult: {
          success: false,
          message: `No ${LLM_PROVIDER === 'openai' ? 'OpenAI' : 'Anthropic'} API key set. Click the gear icon in the header to add one.`,
          revealedNodes: [],
          revealedAssets: [],
        },
      });
      return;
    }

    // Add user message to history
    const nodeHistory = state.promptHistory[nodeId] || [];
    const updatedHistory = [...nodeHistory, { role: 'user' as const, content: prompt }];
    set({
      executingAction: true,
      executingPrompt: prompt,
      promptHistory: { ...state.promptHistory, [nodeId]: updatedHistory },
    });

    try {
      const llmResponse = await sendPrompt(
        prompt,
        node,
        state.assets,
        nodeHistory.map((m) => ({ role: m.role, content: m.content })),
        state.apiKey,
        state.difficulty
      );

      // Find the matched action to get its reveals
      const matchedAction = llmResponse.matchedActionId
        ? node.possibleActions.find((a) => a.id === llmResponse.matchedActionId)
        : null;


      // Server-side asset guard: on normal/hard, enforce that required assets
      // are referenced in the prompt. GPT alone can't be trusted for this.
      if (
        llmResponse.success &&
        matchedAction &&
        matchedAction.requiredAssets.length > 0 &&
        state.difficulty !== 'easy'
      ) {
        const promptLower = prompt.toLowerCase();
        for (const requiredType of matchedAction.requiredAssets) {
          // Find matching assets the player owns
          const ownedAssets = state.assets.filter((a) => a.type === requiredType);
          if (ownedAssets.length === 0) {
            // Player doesn't even have the asset — force fail
            llmResponse.success = false;
            llmResponse.message = `Access denied — you don't have the required ${requiredType.replace('_', ' ')}.`;
            llmResponse.revealedNodes = [];
            llmResponse.revealedAssets = [];
            break;
          }
          // Check that the prompt references at least one owned asset (name or value)
          const mentioned = ownedAssets.some(
            (a) =>
              promptLower.includes(a.name.toLowerCase()) ||
              promptLower.includes(a.value.toLowerCase())
          );
          if (!mentioned) {
            llmResponse.success = false;
            llmResponse.message = `Authentication failed — you need to specify the ${requiredType.replace('_', ' ')} in your command.`;
            llmResponse.revealedNodes = [];
            llmResponse.revealedAssets = [];
            break;
          }
        }
      }

      // Add assistant response to history (after asset guard so it reflects final success/failure)
      const historyWithResponse = [
        ...updatedHistory,
        { role: 'assistant' as const, content: llmResponse.message, success: llmResponse.success, matchedActionId: llmResponse.matchedActionId },
      ];

      // Build revealed assets from the action definition (not from GPT's response)
      const revealedAssets: Asset[] =
        llmResponse.success && matchedAction
          ? (matchedAction.revealsAssets || []).map((a, i) => ({
              id: `${matchedAction.id}_asset_${i}_${Date.now()}`,
              type: a.type,
              name: a.name,
              value: a.value,
              discoveredAt: nodeId,
              discoveredBy: matchedAction.id,
            }))
          : [];

      // Build revealed achievements from the action definition
      const revealedAchievements: Achievement[] =
        llmResponse.success && matchedAction
          ? (matchedAction.revealsAchievements || []).map((a, i) => ({
              id: `${matchedAction.id}_ach_${i}_${Date.now()}`,
              name: a.name,
              description: a.description,
              discoveredAt: nodeId,
            }))
          : [];


      // Use the action's revealsNodes (not GPT's) for game state integrity
      const revealedNodes =
        llmResponse.success && matchedAction ? matchedAction.revealsNodes : [];

      set((s) => {
        const nodes = new Map(s.nodes);

        // Reveal nodes
        revealedNodes.forEach((nid) => {
          const n = nodes.get(nid);
          if (n && !n.discovered) {
            nodes.set(nid, { ...n, discovered: true, status: 'available' });
          }
        });

        // A "no-reward" action has no reveals — it's designed to fail.
        // When matched (even on failure), count it as done so the hint disappears and counter decrements.
        const isNoReward = matchedAction &&
          !matchedAction.revealsNodes.length &&
          !(matchedAction.revealsAssets?.length) &&
          !(matchedAction.revealsAchievements?.length);
        const shouldMarkDone = matchedAction && (llmResponse.success || isNoReward);

        // Track completed actions per node
        const completedActions = { ...s.completedActions };
        if (shouldMarkDone) {
          const existing = completedActions[nodeId] || [];
          if (!existing.includes(matchedAction!.id)) {
            completedActions[nodeId] = [...existing, matchedAction!.id];
          }
        }

        // Mark node completed only when all actions have been executed
        if (shouldMarkDone) {
          const currentNode = nodes.get(nodeId);
          if (currentNode) {
            const doneCount = (completedActions[nodeId] || []).length;
            const allDone = doneCount >= currentNode.possibleActions.length;
            nodes.set(nodeId, { ...currentNode, status: allDone ? 'completed' : 'available' });
          }
        }

        // Track failures per node
        const nodeFailures = { ...s.nodeFailures };
        if (!llmResponse.success) {
          nodeFailures[nodeId] = (nodeFailures[nodeId] || 0) + 1;
        }

        // Check for flag triggers
        const flagMap: Record<string, { id: string; value: string }> = {
          sqli_user_type: { id: 'sqli_user_type', value: 'FLAG{employee_discount_privilege_escalation}' },
          chat_social_engineer: { id: 'chat_social_engineer', value: 'FLAG{social_engineering_privilege_escalation}' },
          ping_command_injection: { id: 'ping_command_injection', value: 'FLAG{complete_takeover_reverse_shell}' },
        };
        const flag = llmResponse.success && matchedAction?.id && flagMap[matchedAction.id]
          ? flagMap[matchedAction.id]
          : null;
        const capturedFlags = flag && !s.capturedFlags.includes(flag.id)
          ? [...s.capturedFlags, flag.id]
          : s.capturedFlags;

        // Merge achievements (deduplicate by name)
        const newAchievements = revealedAchievements.filter(
          (a) => !s.achievements.some((e) => e.name === a.name),
        );

        return {
          nodes,
          assets: [...s.assets, ...revealedAssets],
          achievements: [...s.achievements, ...newAchievements],
          completedActions,
          executingAction: false,
          executingPrompt: '',
          nodeFailures,
          capturedFlag: flag ?? s.capturedFlag,
          capturedFlags,
          promptHistory: { ...s.promptHistory, [nodeId]: historyWithResponse },
          actionResult: {
            success: llmResponse.success,
            message: llmResponse.message,
            revealedNodes,
            revealedAssets,
            logs: llmResponse.logs,
            matchedActionId: llmResponse.matchedActionId,
          },
        };
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const historyWithError = [
        ...updatedHistory,
        { role: 'assistant' as const, content: `Error: ${errorMsg}`, success: false },
      ];
      set((s) => ({
        executingAction: false,
        executingPrompt: '',
        promptHistory: { ...s.promptHistory, [nodeId]: historyWithError },
        actionResult: {
          success: false,
          message: `Error: ${errorMsg}`,
          revealedNodes: [],
          revealedAssets: [],
        },
      }));
    }
  },

  resetGame: () => {
    const { apiKey, difficulty } = get();
    set({
      nodes: buildInitialNodes(),
      assets: [],
      achievements: [],
      completedActions: {},
      capturedFlags: [],
      capturedFlag: null,
      promptHistory: {},
      nodeFailures: {},
      selectedNodeId: null,
      actionResult: null,
      executingAction: false,
      executingPrompt: '',
      pendingPromptText: '',
      apiKey,
      difficulty,
    });
  },
  }),
  {
    name: PERSIST_KEY,
    partialize: (state) => ({
      nodes: state.nodes,
      assets: state.assets,
      achievements: state.achievements,
      completedActions: state.completedActions,
      capturedFlags: state.capturedFlags,
      capturedFlag: state.capturedFlag,
      promptHistory: state.promptHistory,
      nodeFailures: state.nodeFailures,
    }),
    storage: {
      getItem: (name) => {
        const str = localStorage.getItem(name);
        if (!str) return null;
        const data = JSON.parse(str);
        if (data.state?.nodes) {
          data.state.nodes = new Map(data.state.nodes);
        }
        return data;
      },
      setItem: (name, value) => {
        const toStore = {
          ...value,
          state: {
            ...value.state,
            nodes: Array.from((value.state.nodes as Map<string, PentestNode>).entries()),
          },
        };
        localStorage.setItem(name, JSON.stringify(toStore));
      },
      removeItem: (name) => localStorage.removeItem(name),
    },
  }
));
