import { useState, useEffect } from 'react';
import { adminLogin, getAdminConfig, saveAdminConfig, deleteAdminConfig, fetchAppConfig } from '../services/auth';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';

const OPENAI_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'];
const ANTHROPIC_MODELS = ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'];

const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%', marginTop: 6,
  padding: '10px 14px', borderRadius: 8,
  border: '1px solid #2a3a5c', background: 'rgba(10,14,23,0.8)',
  color: '#e2e8f0', fontSize: 13, fontFamily: 'monospace',
  outline: 'none', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: '#94a3b8',
  textTransform: 'uppercase', letterSpacing: '0.1em',
  display: 'block', marginTop: 20,
};

const sectionStyle: React.CSSProperties = {
  background: 'rgba(17,24,39,0.8)',
  border: '1px solid #2a3a5c',
  borderRadius: 12,
  padding: 24,
  marginBottom: 16,
};

const btnBase: React.CSSProperties = {
  width: '100%', marginTop: 16, padding: '10px 0', borderRadius: 8,
  fontWeight: 700, fontSize: 12, textTransform: 'uppercase',
  letterSpacing: '0.1em', cursor: 'pointer',
};

export default function AdminPanel() {
  const adminToken = useAuthStore((s) => s.adminToken);
  const setAdminToken = useAuthStore((s) => s.setAdminToken);
  const adminLogout = useAuthStore((s) => s.adminLogout);
  const setAppConfig = useAuthStore((s) => s.setAppConfig);

  const difficulty = useGameStore((s) => s.difficulty);
  const adminDifficulty = useGameStore((s) => s.adminDifficulty);
  const setAdminDifficulty = useGameStore((s) => s.setAdminDifficulty);
  const resetGame = useGameStore((s) => s.resetGame);
  const revealAllNodes = useGameStore((s) => s.revealAllNodes);
  const quickUnlockStage1 = useGameStore((s) => s.quickUnlockStage1);
  const quickUnlockStage2 = useGameStore((s) => s.quickUnlockStage2);

  const [phase, setPhase] = useState<'login' | 'panel'>(adminToken ? 'panel' : 'login');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Server config state
  const [currentConfig, setCurrentConfig] = useState<{ hasKey: boolean; provider: string | null; model: string | null } | null>(null);
  const [provider, setProvider] = useState<'openai' | 'anthropic'>('openai');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    const root = document.getElementById('root');
    if (root) root.style.height = 'auto';
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
      if (root) root.style.height = '';
    };
  }, []);

  type UnlockStage = 'stage1' | 'stage2' | 'all';
  type UnlockState = 'idle' | 'confirming' | 'done';

  const UNLOCK_KEY = 'peter-admin-unlocks';
  const loadUnlocks = (): Partial<Record<UnlockStage, UnlockState>> => {
    try {
      return JSON.parse(localStorage.getItem(UNLOCK_KEY) || '{}');
    } catch { return {}; }
  };
  const [unlockStates, setUnlockStates] = useState<Record<UnlockStage, UnlockState>>(() => {
    const saved = loadUnlocks();
    return {
      stage1: saved.stage1 ?? 'idle',
      stage2: saved.stage2 ?? 'idle',
      all: saved.all ?? 'idle',
    };
  });

  const saveUnlocks = (next: Record<UnlockStage, UnlockState>) => {
    localStorage.setItem(UNLOCK_KEY, JSON.stringify(next));
    setUnlockStates(next);
  };

  const confirmUnlock = (stage: UnlockStage) => {
    setUnlockStates((s) => ({ ...s, [stage]: 'confirming' }));
  };
  const cancelUnlock = (stage: UnlockStage) => {
    setUnlockStates((s) => ({ ...s, [stage]: 'idle' }));
  };
  const executeUnlock = (stage: UnlockStage) => {
    if (stage === 'stage1') quickUnlockStage1();
    else if (stage === 'stage2') quickUnlockStage2();
    else revealAllNodes();
    saveUnlocks({ ...unlockStates, [stage]: 'done' });
  };
  const resetUnlocks = () => {
    saveUnlocks({ stage1: 'idle', stage2: 'idle', all: 'idle' });
  };

  useEffect(() => {
    if (phase === 'panel' && adminToken) {
      getAdminConfig(adminToken)
        .then((cfg) => {
          setCurrentConfig(cfg);
          if (cfg.provider && cfg.provider !== 'local') {
            setProvider(cfg.provider as 'openai' | 'anthropic');
          }
          if (cfg.model) setModel(cfg.model);
        })
        .catch(() => {
          adminLogout();
          setPhase('login');
        });
    }
  }, [phase, adminToken, adminLogout]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const token = await adminLogin(adminPassword);
      setAdminToken(token);
      setAdminPassword('');
      setPhase('panel');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey && !currentConfig?.hasKey) {
      setSaveError('API key is required');
      return;
    }
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      await saveAdminConfig(adminToken!, { apiKey, provider, model });
      const cfg = await getAdminConfig(adminToken!);
      setCurrentConfig(cfg);
      setApiKey('');
      const appCfg = await fetchAppConfig();
      setAppConfig(appCfg);
      setSaveSuccess('Configuration saved');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      await deleteAdminConfig(adminToken!);
      const cfg = await getAdminConfig(adminToken!);
      setCurrentConfig(cfg);
      setApiKey('');
      setConfirmDelete(false);
      const appCfg = await fetchAppConfig();
      setAppConfig(appCfg);
      setSaveSuccess('API key removed');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  const modelOptions = provider === 'openai' ? OPENAI_MODELS : ANTHROPIC_MODELS;

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0e17',
      overflowY: 'auto',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '40px 16px',
    }}>
      {/* Header */}
      <div style={{ width: '100%', maxWidth: 560, marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#00f0ff', letterSpacing: '0.3em', margin: 0 }}>
          PETER<span style={{ display: 'inline-block', width: 2, height: 20, background: '#00f0ff', marginLeft: 4, verticalAlign: 'middle' }} />
        </h1>
        <p style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 4 }}>
          Admin Control Panel
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: 560 }}>

        {/* Login */}
        {phase === 'login' && (
          <div style={sectionStyle}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', margin: '0 0 12px' }}>Authentication</h2>
            <form onSubmit={handleLogin}>
              <label style={labelStyle}>Admin Password</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Admin password"
                autoFocus
                style={inputStyle}
              />
              {loginError && <p style={{ fontSize: 11, color: '#ff3366', marginTop: 6 }}>{loginError}</p>}
              <button
                type="submit"
                disabled={loginLoading || !adminPassword}
                style={{
                  ...btnBase,
                  background: 'rgba(0,240,255,0.15)', border: '1px solid rgba(0,240,255,0.3)',
                  color: '#00f0ff', opacity: !adminPassword ? 0.5 : 1,
                }}
              >
                {loginLoading ? 'Authenticating…' : 'Login'}
              </button>
            </form>
          </div>
        )}

        {/* Panel */}
        {phase === 'panel' && (
          <>
            {/* Server Config */}
            <div style={sectionStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>Server LLM Config</h2>
                <button
                  onClick={() => { adminLogout(); setPhase('login'); }}
                  style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Logout
                </button>
              </div>

              {/* Status */}
              <div style={{
                padding: '8px 12px', borderRadius: 8, marginTop: 12,
                background: currentConfig?.hasKey ? 'rgba(0,255,136,0.05)' : 'rgba(255,51,102,0.05)',
                border: `1px solid ${currentConfig?.hasKey ? 'rgba(0,255,136,0.2)' : 'rgba(255,51,102,0.2)'}`,
              }}>
                <span style={{ fontSize: 12, color: currentConfig?.hasKey ? '#00ff88' : '#ff3366', fontWeight: 700 }}>
                  {currentConfig?.hasKey
                    ? `● Active — ${currentConfig.provider} / ${currentConfig.model || 'default model'}`
                    : '○ No server key — users provide their own API keys'}
                </span>
              </div>

              {/* Provider */}
              <label style={labelStyle}>Provider</label>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                {(['openai', 'anthropic'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => { setProvider(p); setModel(''); }}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
                      border: `1px solid ${provider === p ? 'rgba(0,240,255,0.4)' : '#2a3a5c'}`,
                      background: provider === p ? 'rgba(0,240,255,0.12)' : 'rgba(17,24,39,0.8)',
                      color: provider === p ? '#00f0ff' : '#94a3b8',
                      fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}
                  >
                    {p === 'openai' ? 'OpenAI' : 'Anthropic'}
                  </button>
                ))}
              </div>

              {/* Model */}
              <label style={labelStyle}>Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                style={{ ...inputStyle, fontFamily: 'inherit', cursor: 'pointer' }}
              >
                <option value="">Default</option>
                {modelOptions.map((m) => <option key={m} value={m}>{m}</option>)}
                <option value="__custom">Custom…</option>
              </select>
              {model === '__custom' && (
                <input
                  type="text"
                  placeholder="Enter model name"
                  onChange={(e) => setModel(e.target.value)}
                  style={{ ...inputStyle, marginTop: 6 }}
                />
              )}

              {/* API Key */}
              <label style={labelStyle}>
                API Key{currentConfig?.hasKey && <span style={{ color: '#64748b', marginLeft: 6 }}>(leave blank to keep current)</span>}
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={currentConfig?.hasKey ? '••••••••  (unchanged)' : 'sk-... or sk-ant-...'}
                style={inputStyle}
              />

              {saveError && <p style={{ fontSize: 11, color: '#ff3366', marginTop: 8 }}>{saveError}</p>}
              {saveSuccess && <p style={{ fontSize: 11, color: '#00ff88', marginTop: 8 }}>{saveSuccess}</p>}

              <button
                onClick={handleSave}
                disabled={saving || (!apiKey && !currentConfig?.hasKey)}
                style={{
                  ...btnBase,
                  background: 'rgba(0,240,255,0.15)', border: '1px solid rgba(0,240,255,0.3)',
                  color: '#00f0ff', opacity: (!apiKey && !currentConfig?.hasKey) ? 0.5 : 1,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Saving…' : 'Save Configuration'}
              </button>

              {currentConfig?.hasKey && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #2a3a5c' }}>
                  {!confirmDelete ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      style={{
                        ...btnBase, marginTop: 0,
                        background: 'rgba(255,51,102,0.08)', border: '1px solid rgba(255,51,102,0.3)',
                        color: '#ff3366',
                      }}
                    >
                      Remove API Key
                    </button>
                  ) : (
                    <>
                      <p style={{ fontSize: 11, color: '#ff3366', textAlign: 'center', marginBottom: 8 }}>
                        Users will need to provide their own key.
                      </p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => setConfirmDelete(false)}
                          style={{ ...btnBase, marginTop: 0, flex: 1, background: 'rgba(17,24,39,0.8)', border: '1px solid #2a3a5c', color: '#94a3b8' }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDelete}
                          disabled={saving}
                          style={{ ...btnBase, marginTop: 0, flex: 1, background: 'rgba(255,51,102,0.2)', border: '1px solid rgba(255,51,102,0.5)', color: '#ff3366' }}
                        >
                          Confirm
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Game Controls */}
            <div style={sectionStyle}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', margin: '0 0 12px' }}>Game Controls</h2>

              {/* Difficulty */}
              <label style={{ ...labelStyle, marginTop: 0 }}>Difficulty Control</label>
              <p style={{ fontSize: 10, color: '#64748b', margin: '4px 0 6px', lineHeight: 1.5 }}>
                {adminDifficulty === 'manual'
                  ? 'Players can change difficulty freely.'
                  : `Locked to ${adminDifficulty} — players cannot change it.`}
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['easy', 'normal', 'hard', 'manual'] as const).map((d) => {
                  const active = adminDifficulty === d;
                  const color = d === 'easy' ? '#00ff88' : d === 'normal' ? '#00f0ff' : d === 'hard' ? '#ff3366' : '#94a3b8';
                  return (
                    <button
                      key={d}
                      onClick={() => setAdminDifficulty(d)}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
                        border: `1px solid ${active ? color : '#2a3a5c'}`,
                        background: active ? `${color}22` : 'rgba(17,24,39,0.8)',
                        color: active ? color : '#64748b',
                        fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
              {adminDifficulty !== 'manual' && (
                <p style={{ fontSize: 10, color: '#64748b', marginTop: 6 }}>
                  Current game difficulty: <span style={{ color: adminDifficulty === 'easy' ? '#00ff88' : adminDifficulty === 'normal' ? '#00f0ff' : '#ff3366', fontWeight: 700 }}>{difficulty}</span>
                </p>
              )}

              {/* Unlock shortcuts */}
              <label style={labelStyle}>Unlock Shortcuts</label>
              {(() => {
                const stages: { key: UnlockStage; label: string; color: string }[] = [
                  { key: 'stage1', label: 'Stage 1', color: '#00ff88' },
                  { key: 'stage2', label: 'Stage 2', color: '#00f0ff' },
                  { key: 'all',    label: 'All Nodes', color: '#a855f7' },
                ];
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                    {stages.map(({ key, label, color }) => {
                      const state = unlockStates[key];
                      const done = state === 'done';
                      const confirming = state === 'confirming';
                      return (
                        <div key={key}>
                          {!confirming ? (
                            <button
                              onClick={() => !done && confirmUnlock(key)}
                              style={{
                                ...btnBase, marginTop: 0, width: '100%',
                                background: done ? `${color}22` : 'rgba(17,24,39,0.8)',
                                border: `1px solid ${done ? color : '#2a3a5c'}`,
                                color: done ? color : '#94a3b8',
                                cursor: done ? 'default' : 'pointer',
                              }}
                            >
                              {done ? `✓ ${label} Unlocked` : `Unlock ${label}`}
                            </button>
                          ) : (
                            <div style={{ border: `1px solid ${color}44`, borderRadius: 8, padding: '10px 12px', background: `${color}08` }}>
                              <p style={{ fontSize: 11, color, textAlign: 'center', margin: '0 0 8px', fontWeight: 600 }}>
                                Unlock {label} for all players?
                              </p>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                  onClick={() => cancelUnlock(key)}
                                  style={{ ...btnBase, marginTop: 0, flex: 1, background: 'rgba(17,24,39,0.8)', border: '1px solid #2a3a5c', color: '#94a3b8' }}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => executeUnlock(key)}
                                  style={{ ...btnBase, marginTop: 0, flex: 1, background: `${color}22`, border: `1px solid ${color}66`, color }}
                                >
                                  Confirm
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <button
                      onClick={resetUnlocks}
                      style={{ ...btnBase, marginTop: 4, background: 'rgba(100,116,139,0.08)', border: '1px solid rgba(100,116,139,0.3)', color: '#64748b' }}
                    >
                      Reset Unlock Options
                    </button>
                  </div>
                );
              })()}

              {/* Reset */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #2a3a5c' }}>
                {!confirmReset ? (
                  <button
                    onClick={() => setConfirmReset(true)}
                    style={{ ...btnBase, marginTop: 0, background: 'rgba(255,51,102,0.08)', border: '1px solid rgba(255,51,102,0.3)', color: '#ff3366' }}
                  >
                    ↺ Reset Game Control
                  </button>
                ) : (
                  <>
                    <p style={{ fontSize: 11, color: '#ff3366', textAlign: 'center', marginBottom: 8 }}>
                      This will erase all progress and reset all unlock stages.
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => setConfirmReset(false)}
                        style={{ ...btnBase, marginTop: 0, flex: 1, background: 'rgba(17,24,39,0.8)', border: '1px solid #2a3a5c', color: '#94a3b8' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => { resetGame(); resetUnlocks(); setConfirmReset(false); }}
                        style={{ ...btnBase, marginTop: 0, flex: 1, background: 'rgba(255,51,102,0.2)', border: '1px solid rgba(255,51,102,0.5)', color: '#ff3366' }}
                      >
                        Confirm Reset
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
