import { useState, useEffect } from 'react';
import { adminLogin, getAdminConfig, saveAdminConfig, deleteAdminConfig, fetchAppConfig } from '../services/auth';
import { useAuthStore } from '../store/authStore';

const OPENAI_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'];
const ANTHROPIC_MODELS = ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'];

interface Props {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: Props) {
  const adminToken = useAuthStore((s) => s.adminToken);
  const setAdminToken = useAuthStore((s) => s.setAdminToken);
  const adminLogout = useAuthStore((s) => s.adminLogout);
  const setAppConfig = useAuthStore((s) => s.setAppConfig);

  const [phase, setPhase] = useState<'login' | 'panel'>(adminToken ? 'panel' : 'login');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Panel state
  const [currentConfig, setCurrentConfig] = useState<{ hasKey: boolean; provider: string | null; model: string | null } | null>(null);
  const [provider, setProvider] = useState<'openai' | 'anthropic'>('openai');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Load current config when entering panel
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
          // Token expired or invalid
          adminLogout();
          setPhase('login');
        });
    }
  }, [phase, adminToken, adminLogout]);

  const handleAdminLogin = async (e: React.FormEvent) => {
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
    // Require a key if server doesn't already have one
    if (!apiKey && !currentConfig?.hasKey) {
      setSaveError('API key is required');
      return;
    }
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      // Server keeps existing key if apiKey is empty and one is already stored
      await saveAdminConfig(adminToken!, { apiKey, provider, model });
      // Re-fetch to confirm
      const cfg = await getAdminConfig(adminToken!);
      setCurrentConfig(cfg);
      setApiKey('');
      // Refresh app config so frontend knows server has a key now
      const appCfg = await fetchAppConfig();
      setAppConfig(appCfg);
      setSaveSuccess('Configuration saved successfully');
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
      // Refresh app config
      const appCfg = await fetchAppConfig();
      setAppConfig(appCfg);
      setSaveSuccess('API key removed — users will use their own keys');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  const modelOptions = provider === 'openai' ? OPENAI_MODELS : ANTHROPIC_MODELS;

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
    display: 'block', marginTop: 16,
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)', zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#111827', border: '1px solid #2a3a5c', borderRadius: 12,
          padding: 24, maxWidth: 440, width: '90%',
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
            🔑 Admin Panel
          </h3>
          {phase === 'panel' && (
            <button
              onClick={() => { adminLogout(); setPhase('login'); }}
              style={{
                background: 'none', border: 'none', color: '#64748b',
                fontSize: 11, cursor: 'pointer', textDecoration: 'underline',
              }}
            >
              Logout admin
            </button>
          )}
        </div>

        {/* Admin login */}
        {phase === 'login' && (
          <form onSubmit={handleAdminLogin}>
            <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 16 }}>
              Enter the admin password to manage the server LLM configuration.
            </p>
            <label style={labelStyle}>Admin Password</label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Admin password"
              autoFocus
              style={inputStyle}
            />
            {loginError && (
              <p style={{ fontSize: 11, color: '#ff3366', marginTop: 6 }}>{loginError}</p>
            )}
            <button
              type="submit"
              disabled={loginLoading || !adminPassword}
              style={{
                width: '100%', marginTop: 16, padding: '10px 0', borderRadius: 8,
                background: 'rgba(0,240,255,0.15)', border: '1px solid rgba(0,240,255,0.3)',
                color: '#00f0ff', fontWeight: 700, fontSize: 12,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                cursor: loginLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {loginLoading ? 'Authenticating…' : 'Login as Admin'}
            </button>
          </form>
        )}

        {/* Config panel */}
        {phase === 'panel' && (
          <>
            {/* Current status */}
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: currentConfig?.hasKey ? 'rgba(0,255,136,0.05)' : 'rgba(255,51,102,0.05)',
              border: `1px solid ${currentConfig?.hasKey ? 'rgba(0,255,136,0.2)' : 'rgba(255,51,102,0.2)'}`,
              marginBottom: 16,
            }}>
              <span style={{ fontSize: 12, color: currentConfig?.hasKey ? '#00ff88' : '#ff3366', fontWeight: 700 }}>
                {currentConfig?.hasKey
                  ? `● Server key active — ${currentConfig.provider} / ${currentConfig.model || 'default model'}`
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
                    flex: 1, padding: '8px 0', borderRadius: 8,
                    border: `1px solid ${provider === p ? 'rgba(0,240,255,0.4)' : '#2a3a5c'}`,
                    background: provider === p ? 'rgba(0,240,255,0.12)' : 'rgba(17,24,39,0.8)',
                    color: provider === p ? '#00f0ff' : '#94a3b8',
                    fontWeight: 700, fontSize: 11, textTransform: 'uppercase',
                    letterSpacing: '0.05em', cursor: 'pointer',
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
              {modelOptions.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
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
              API Key {currentConfig?.hasKey && <span style={{ color: '#64748b' }}>(leave blank to keep current)</span>}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={currentConfig?.hasKey ? '••••••••  (unchanged)' : 'sk-... or sk-ant-...'}
              style={inputStyle}
            />

            {/* Messages */}
            {saveError && <p style={{ fontSize: 11, color: '#ff3366', marginTop: 8 }}>{saveError}</p>}
            {saveSuccess && <p style={{ fontSize: 11, color: '#00ff88', marginTop: 8 }}>{saveSuccess}</p>}

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving || (!apiKey && !currentConfig?.hasKey)}
              style={{
                width: '100%', marginTop: 16, padding: '10px 0', borderRadius: 8,
                background: 'rgba(0,240,255,0.15)', border: '1px solid rgba(0,240,255,0.3)',
                color: '#00f0ff', fontWeight: 700, fontSize: 12,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: (!apiKey && !currentConfig?.hasKey) ? 0.5 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save Configuration'}
            </button>

            {/* Delete key */}
            {currentConfig?.hasKey && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #2a3a5c' }}>
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    style={{
                      width: '100%', padding: '10px 0', borderRadius: 8,
                      background: 'rgba(255,51,102,0.08)', border: '1px solid rgba(255,51,102,0.3)',
                      color: '#ff3366', fontWeight: 700, fontSize: 12,
                      textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
                    }}
                  >
                    Delete API Key → Switch to Local Mode
                  </button>
                ) : (
                  <div>
                    <p style={{ fontSize: 11, color: '#ff3366', textAlign: 'center', marginBottom: 8 }}>
                      This will remove the server API key. Users will need to provide their own key.
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        style={{
                          flex: 1, padding: '10px 0', borderRadius: 8,
                          background: 'rgba(17,24,39,0.8)', border: '1px solid #2a3a5c',
                          color: '#94a3b8', fontWeight: 700, fontSize: 12,
                          textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={saving}
                        style={{
                          flex: 1, padding: '10px 0', borderRadius: 8,
                          background: 'rgba(255,51,102,0.2)', border: '1px solid rgba(255,51,102,0.5)',
                          color: '#ff3366', fontWeight: 700, fontSize: 12,
                          textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
                        }}
                      >
                        Confirm Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
