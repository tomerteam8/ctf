import { useState } from 'react';
import { login } from '../services/auth';
import { useAuthStore } from '../store/authStore';

export default function LoginModal() {
  const setToken = useAuthStore((s) => s.setToken);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      const token = await login(password);
      setToken(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(10,14,23,0.97)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#111827', border: '1px solid #2a3a5c', borderRadius: 16,
        padding: '40px 36px', width: '100%', maxWidth: 380,
        boxShadow: '0 0 60px rgba(0,240,255,0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔐</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#00f0ff', letterSpacing: '0.2em', margin: 0 }}>
            PETER
          </h2>
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            Pentest Quest
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Access Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoFocus
            style={{
              display: 'block', width: '100%', marginTop: 6,
              padding: '12px 14px', borderRadius: 8,
              border: `1px solid ${error ? 'rgba(255,51,102,0.5)' : '#2a3a5c'}`,
              background: 'rgba(10,14,23,0.8)', color: '#e2e8f0',
              fontSize: 14, fontFamily: 'monospace', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {error && (
            <p style={{ fontSize: 11, color: '#ff3366', marginTop: 6 }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%', marginTop: 16, padding: '12px 0', borderRadius: 8,
              background: loading ? 'rgba(0,240,255,0.08)' : 'rgba(0,240,255,0.15)',
              border: '1px solid rgba(0,240,255,0.3)',
              color: '#00f0ff', fontWeight: 700, fontSize: 13,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: !password ? 0.5 : 1,
            }}
          >
            {loading ? 'Authenticating…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
