export interface AppConfig {
  requiresAuth: boolean;
  hasServerKey: boolean;
  provider: string | null;
  model: string | null;
}

export interface AdminConfig {
  hasKey: boolean;
  provider: string | null;
  model: string | null;
}

export async function fetchAppConfig(): Promise<AppConfig> {
  const res = await fetch('/api/config');
  if (!res.ok) throw new Error('Failed to fetch app config');
  return res.json();
}

export async function login(password: string): Promise<string | null> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || 'Invalid password');
  }
  const data = await res.json() as { token: string | null };
  return data.token;
}

export async function adminLogin(password: string): Promise<string> {
  const res = await fetch('/api/auth/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || 'Invalid admin password');
  }
  const data = await res.json() as { token: string };
  return data.token;
}

export async function getAdminConfig(adminToken: string): Promise<AdminConfig> {
  const res = await fetch('/api/admin/config', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!res.ok) throw new Error('Unauthorized');
  return res.json();
}

export async function saveAdminConfig(
  adminToken: string,
  config: { apiKey: string; provider: string; model: string },
): Promise<void> {
  const res = await fetch('/api/admin/config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || 'Failed to save config');
  }
}

export async function deleteAdminConfig(adminToken: string): Promise<void> {
  const res = await fetch('/api/admin/config', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!res.ok) throw new Error('Failed to delete config');
}

export interface ServerGameState {
  adminDifficulty: 'easy' | 'normal' | 'hard' | 'manual';
  unlocks: { stage1: 'idle' | 'done'; stage2: 'idle' | 'done'; all: 'idle' | 'done' };
}

const DEFAULT_SERVER_GAME_STATE: ServerGameState = {
  adminDifficulty: 'manual',
  unlocks: { stage1: 'idle', stage2: 'idle', all: 'idle' },
};

export async function fetchGameState(): Promise<ServerGameState> {
  try {
    const res = await fetch('/api/game-state');
    if (!res.ok) return DEFAULT_SERVER_GAME_STATE;
    return res.json();
  } catch {
    return DEFAULT_SERVER_GAME_STATE;
  }
}

export async function saveAdminGameState(adminToken: string, state: ServerGameState): Promise<void> {
  const res = await fetch('/api/admin/game-state', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify(state),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || 'Failed to save game state');
  }
}

export async function sendPromptToServer(
  token: string | null,
  systemPrompt: string,
  messages: { role: string; content: string }[],
): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('/api/prompt', {
    method: 'POST',
    headers,
    body: JSON.stringify({ systemPrompt, messages }),
  });

  if (res.status === 401) {
    throw new Error('__SESSION_EXPIRED__');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || 'Server error');
  }
  const data = await res.json() as { result: string };
  return data.result;
}
