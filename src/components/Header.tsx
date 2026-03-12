import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Difficulty } from '../data/types';
import { LLM_NEEDS_KEY } from '../services/llm';
import type { AppView } from '../App';
import { useIsMobile, HEADER_H_DESKTOP, HEADER_H_MOBILE } from '../hooks/useIsMobile';
import { useAuthStore } from '../store/authStore';
import AdminPanel from './AdminPanel';

const st = {
  bar: {
    position: 'fixed' as const, top: 0, left: 0, right: 0,
    background: 'rgba(17,24,39,0.95)', backdropFilter: 'blur(12px)',
    borderBottom: '1px solid #2a3a5c', zIndex: 50,
  },
  title: { fontSize: 22, fontWeight: 800, color: '#00f0ff', letterSpacing: '0.3em' },
  caret: {
    display: 'inline-block', width: 2, height: 20, background: '#00f0ff',
    marginLeft: 4, verticalAlign: 'middle', animation: 'blink 1s step-end infinite',
  },
  sub: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.15em', marginLeft: 12 },
  stat: { fontSize: 12, color: '#94a3b8', marginLeft: 24 },
  statNum: { fontWeight: 700 },
  dot: (color: string, delay: number) => ({
    width: 8, height: 8, borderRadius: '50%', background: color,
    animation: `blink 1.5s ease-in-out ${delay}s infinite`,
  }),
};

export default function Header({ view, onViewChange }: { view: AppView; onViewChange: (v: AppView) => void }) {
  const nodes = useGameStore((s) => s.nodes);
  const assets = useGameStore((s) => s.assets);
  const apiKey = useGameStore((s) => s.apiKey);
  const setApiKey = useGameStore((s) => s.setApiKey);
  const difficulty = useGameStore((s) => s.difficulty);
  const setDifficulty = useGameStore((s) => s.setDifficulty);
  const [text, setText] = useState('');
  const resetGame = useGameStore((s) => s.resetGame);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [keyInput, setKeyInput] = useState(apiKey);
  const [confirmReset, setConfirmReset] = useState(false);
  const isMobile = useIsMobile();

  const appConfig = useAuthStore((s) => s.appConfig);
  const serverModeActive = !!appConfig?.hasServerKey;

  const discovered = Array.from(nodes.values()).filter((n) => n.discovered).length;

  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setText('PETER'.slice(0, i));
      if (i >= 5) clearInterval(iv);
    }, 150);
    return () => clearInterval(iv);
  }, []);

  const handleSaveKey = () => {
    setApiKey(keyInput);
    setShowSettings(false);
  };

  const diffColor = difficulty === 'easy' ? '#00ff88' : difficulty === 'normal' ? '#00f0ff' : '#ff3366';
  const diffBg = difficulty === 'easy' ? 'rgba(0,255,136,0.2)' : difficulty === 'normal' ? 'rgba(0,240,255,0.2)' : 'rgba(255,51,102,0.2)';

  // Settings button is green if: server mode active OR local key is set OR no key needed
  const settingsOk = serverModeActive || !LLM_NEEDS_KEY || !!apiKey;

  const diffBadge = (
    <span style={{
      padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.1em',
      background: diffBg, color: diffColor,
    }}>
      {difficulty}
    </span>
  );

  const settingsBtn = (
    <button
      onClick={() => { setKeyInput(apiKey); setShowSettings(true); }}
      title="Settings"
      style={{
        background: 'none',
        border: `1px solid ${settingsOk ? 'rgba(0,255,136,0.3)' : 'rgba(255,51,102,0.3)'}`,
        borderRadius: 8, padding: '6px 8px', cursor: 'pointer', fontSize: 16, lineHeight: 1,
        color: settingsOk ? '#00ff88' : '#ff3366',
      }}
    >
      ⚙
    </button>
  );

  const adminBtn = (
    <button
      onClick={() => setShowAdmin(true)}
      title="Admin Panel"
      style={{
        background: 'none',
        border: '1px solid rgba(165,85,247,0.3)',
        borderRadius: 8, padding: '6px 8px', cursor: 'pointer', fontSize: 14, lineHeight: 1,
        color: '#a855f7',
      }}
    >
      🔑
    </button>
  );

  const viewToggle = (
    <div style={{ display: 'flex', gap: 2, background: 'rgba(10,14,23,0.6)', borderRadius: 8, padding: 3, ...(isMobile && { flex: 1 }) }}>
      {(['graph', 'network'] as AppView[]).map((v) => {
        const active = view === v;
        const labels: Record<AppView, string> = { graph: '⬡  Attack Graph', network: '🗺  Network Map' };
        return (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            style={{
              padding: isMobile ? '8px 12px' : '4px 12px',
              borderRadius: 6,
              border: active ? '1px solid rgba(0,240,255,0.4)' : '1px solid transparent',
              background: active ? 'rgba(0,240,255,0.12)' : 'transparent',
              color: active ? '#00f0ff' : '#64748b',
              fontWeight: active ? 700 : 400,
              fontSize: 11,
              cursor: 'pointer',
              letterSpacing: '0.05em',
              transition: 'all 0.15s',
              fontFamily: 'inherit',
              ...(isMobile && { flex: 1, textAlign: 'center' }),
            }}
          >
            {labels[v]}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      <div style={{ ...st.bar, height: isMobile ? HEADER_H_MOBILE : HEADER_H_DESKTOP }}>
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: HEADER_H_MOBILE / 2 }}>
              <span style={{ ...st.title, fontSize: 18 }}>{text}<span style={st.caret} /></span>
              <div style={{ display: 'flex', gap: 6 }}>
                {adminBtn}
                {settingsBtn}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', height: HEADER_H_MOBILE / 2, borderTop: '1px solid rgba(42,58,92,0.6)', gap: 8 }}>
              {viewToggle}
              {diffBadge}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%', padding: '0 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={st.title}>{text}<span style={st.caret} /></span>
              <span style={st.sub}>Pentest Quest</span>
            </div>
            {viewToggle}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={st.stat}><span style={{ ...st.statNum, color: '#00f0ff' }}>{discovered}</span> / {nodes.size} nodes</span>
              <span style={st.stat}><span style={{ ...st.statNum, color: '#00ff88' }}>{assets.length}</span> assets</span>
              <div style={{ display: 'flex', gap: 4, marginLeft: 12 }}>
                <div style={st.dot('#00ff88', 0)} />
                <div style={st.dot('#00f0ff', 0.3)} />
                <div style={st.dot('#ff3366', 0.6)} />
              </div>
              {diffBadge}
              {adminBtn}
              {settingsBtn}
            </div>
          </div>
        )}
      </div>

      {/* Settings modal */}
      {showSettings && (
        <div
          onClick={() => setShowSettings(false)}
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
              padding: 24, maxWidth: 420, width: '90%',
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>Settings</h3>

            {/* API key section */}
            {serverModeActive ? (
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 16,
                background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)',
              }}>
                <p style={{ fontSize: 12, color: '#00ff88', fontWeight: 700, margin: 0 }}>
                  ● Server mode active
                </p>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>
                  LLM calls are handled by the server. No API key needed.
                </p>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 16 }}>
                  {LLM_NEEDS_KEY
                    ? 'Enter your API key to enable LLM-driven actions.'
                    : 'Using local Claude CLI — no API key needed.'}
                </p>
                {LLM_NEEDS_KEY && (
                  <>
                    <label style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      API Key
                    </label>
                    <input
                      type="password"
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      placeholder="sk-..."
                      style={{
                        width: '100%', marginTop: 6, padding: '10px 14px',
                        borderRadius: 8, border: '1px solid #2a3a5c',
                        background: 'rgba(10,14,23,0.8)', color: '#e2e8f0',
                        fontSize: 13, fontFamily: 'monospace', outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </>
                )}
              </>
            )}

            <label style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginTop: 16 }}>
              Difficulty
            </label>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => {
                const active = difficulty === d;
                const color = d === 'easy' ? '#00ff88' : d === 'normal' ? '#00f0ff' : '#ff3366';
                return (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 8,
                      border: `1px solid ${active ? color : '#2a3a5c'}`,
                      background: active ? `${color}22` : 'rgba(17,24,39,0.8)',
                      color: active ? color : '#94a3b8',
                      fontWeight: 700, fontSize: 11, textTransform: 'uppercase',
                      letterSpacing: '0.1em', cursor: 'pointer',
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 8, lineHeight: 1.5 }}>
              {difficulty === 'easy'
                ? 'Loose matching — vague prompts are accepted. Hints are always visible.'
                : difficulty === 'normal'
                  ? 'You must describe the technique clearly and reference required assets by name. Hints appear after 3 failures.'
                  : 'Exact tool names and asset values required. No hints provided.'}
            </p>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                onClick={handleSaveKey}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8,
                  background: 'rgba(0,240,255,0.15)', border: '1px solid rgba(0,240,255,0.3)',
                  color: '#00f0ff', fontWeight: 700, fontSize: 12,
                  textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
                }}
              >
                Save
              </button>
              <button
                onClick={() => setShowSettings(false)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8,
                  background: 'rgba(17,24,39,0.8)', border: '1px solid #2a3a5c',
                  color: '#94a3b8', fontWeight: 700, fontSize: 12,
                  textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #2a3a5c' }}>
              {!confirmReset ? (
                <button
                  onClick={() => setConfirmReset(true)}
                  style={{
                    width: '100%', padding: '10px 0', borderRadius: 8,
                    background: 'rgba(255,51,102,0.08)', border: '1px solid rgba(255,51,102,0.3)',
                    color: '#ff3366', fontWeight: 700, fontSize: 12,
                    textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
                  }}
                >
                  ↺ Restart Game
                </button>
              ) : (
                <div>
                  <p style={{ fontSize: 11, color: '#ff3366', textAlign: 'center', marginBottom: 8 }}>
                    This will erase all progress. Settings are kept.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setConfirmReset(false)}
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
                      onClick={() => { resetGame(); setConfirmReset(false); setShowSettings(false); }}
                      style={{
                        flex: 1, padding: '10px 0', borderRadius: 8,
                        background: 'rgba(255,51,102,0.2)', border: '1px solid rgba(255,51,102,0.5)',
                        color: '#ff3366', fontWeight: 700, fontSize: 12,
                        textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
                      }}
                    >
                      Confirm Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin panel */}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
    </>
  );
}
