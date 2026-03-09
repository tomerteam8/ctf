import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import ActionCard from './ActionCard';
import type { InfoSeverity } from '../data/types';

const typeIcons: Record<string, string> = {
  internet_server: '🌐', web_page: '📄',
  database: '🗄️', api: '⚡', network: '🖥️',
};

const severityColor: Record<InfoSeverity, string> = {
  critical: '#ff3366',
  high: '#ff6b35',
  medium: '#ffc107',
  info: '#94a3b8',
};

const zoneColor: Record<string, string> = {
  Perimeter: '#f59e0b',
  Corporate: '#3b82f6',
  'Dev/CI': '#fbbf24',
  Development: '#fbbf24',
  Management: '#a855f7',
};

const statusBadge = (status: string): React.CSSProperties => ({
  display: 'inline-block', padding: '4px 10px', borderRadius: 6,
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
  background: status === 'locked' ? 'rgba(255,51,102,0.2)' : status === 'available' ? 'rgba(0,240,255,0.2)' : 'rgba(0,255,136,0.2)',
  color: status === 'locked' ? '#ff3366' : status === 'available' ? '#00f0ff' : '#00ff88',
});

export default function NodePanel() {
  const selectedNodeId = useGameStore((s) => s.selectedNodeId);
  const nodes = useGameStore((s) => s.nodes);
  const selectNode = useGameStore((s) => s.selectNode);
  const executePrompt = useGameStore((s) => s.executePrompt);
  const executingAction = useGameStore((s) => s.executingAction);
  const promptHistory = useGameStore((s) => s.promptHistory);
  const pendingPromptText = useGameStore((s) => s.pendingPromptText);
  const setPendingPromptText = useGameStore((s) => s.setPendingPromptText);
  const difficulty = useGameStore((s) => s.difficulty);
  const nodeFailures = useGameStore((s) => s.nodeFailures);
  const completedActions = useGameStore((s) => s.completedActions);
  const node = selectedNodeId ? nodes.get(selectedNodeId) : null;

  const [input, setInput] = useState('');
  const [showServiceInfo, setShowServiceInfo] = useState(false);
  const [hintWarning, setHintWarning] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const history = selectedNodeId ? promptHistory[selectedNodeId] || [] : [];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history.length]);

  // Collapse service info when switching nodes
  useEffect(() => {
    setShowServiceInfo(false);
  }, [selectedNodeId]);

  // Pick up pending prompt text from asset clicks
  useEffect(() => {
    if (pendingPromptText) {
      setInput(pendingPromptText);
      setPendingPromptText('');
      inputRef.current?.focus();
    }
  }, [pendingPromptText, setPendingPromptText]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || !selectedNodeId || executingAction) return;

    // Block bare hint submissions
    if (node) {
      const hints = node.possibleActions
        .filter((a) => a.showAsHint !== false && a.hint)
        .map((a) => a.hint!.toLowerCase());
      if (hints.includes(text.toLowerCase())) {
        setHintWarning(text);
        return;
      }
    }

    setInput('');
    executePrompt(selectedNodeId, text);
  };

  const handleHintClick = (text: string) => {
    if (!selectedNodeId || executingAction) return;
    setInput((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
    inputRef.current?.focus();
  };

  return (
    <AnimatePresence>
      {node && (
        <motion.div
          key="panel"
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{
            position: 'fixed', right: 0, top: 0, height: '100%', width: 380,
            background: 'rgba(17,24,39,0.97)', backdropFilter: 'blur(12px)',
            borderLeft: '1px solid #2a3a5c', zIndex: 60,
            display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Scrollable content area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, paddingBottom: 0 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 28 }}>{typeIcons[node.type] || '📦'}</span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>{node.title}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {node.type.replace('_', ' ')}
                  </div>
                </div>
              </div>
              <button
                onClick={() => selectNode(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <span style={statusBadge(node.status)}>{node.status}</span>
            </div>

            {/* Info box */}
            <div style={{
              marginBottom: 16, padding: 14, borderRadius: 10,
              background: 'rgba(10,14,23,0.5)', border: '1px solid #2a3a5c',
            }}>
              <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>{node.data}</p>
              <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 12, color: zoneColor[node.zone ?? ''] || '#00f0ff' }}>{node.baseUrl}</div>
            </div>

            {/* Service Details (expandable) — filter by difficulty for nodes with children */}
            {node.serviceInfo && node.serviceInfo.length > 0 && (() => {
              const hasChildren = node.possibleActions.some((a) => a.revealsNodes.length > 0);
              const filteredInfo = hasChildren
                ? node.serviceInfo.filter((d) => {
                    if (difficulty === 'easy') return true;
                    if (difficulty === 'normal') return d.severity !== 'critical';
                    // hard: only show non-severity (neutral) details
                    return !d.severity;
                  })
                : node.serviceInfo;
              return filteredInfo.length > 0;
            })() && (
              <div style={{ marginBottom: 16 }}>
                <button
                  onClick={() => setShowServiceInfo(!showServiceInfo)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #2a3a5c',
                    background: 'rgba(10,14,23,0.5)',
                    color: '#94a3b8',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    cursor: 'pointer',
                  }}
                >
                  <span>Service Details</span>
                  <span style={{ fontSize: 10, transition: 'transform 0.2s', transform: showServiceInfo ? 'rotate(180deg)' : 'rotate(0)' }}>
                    ▼
                  </span>
                </button>
                {showServiceInfo && (
                  <div style={{
                    marginTop: 4,
                    padding: 10,
                    borderRadius: '0 0 8px 8px',
                    background: 'rgba(10,14,23,0.5)',
                    border: '1px solid #2a3a5c',
                    borderTop: 'none',
                  }}>
                    {(() => {
                      const hasChildren = node.possibleActions.some((a) => a.revealsNodes.length > 0);
                      return (hasChildren
                        ? node.serviceInfo!.filter((d) => {
                            if (difficulty === 'easy') return true;
                            if (difficulty === 'normal') return d.severity !== 'critical';
                            return !d.severity;
                          })
                        : node.serviceInfo!
                      );
                    })().map((detail, i, arr) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          padding: '5px 0',
                          borderBottom: i < arr.length - 1 ? '1px solid rgba(42,58,92,0.5)' : 'none',
                        }}
                      >
                        <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0, marginRight: 12 }}>
                          {detail.label}
                        </span>
                        <span style={{
                          fontSize: 11,
                          fontFamily: 'monospace',
                          textAlign: 'right',
                          color: detail.severity ? severityColor[detail.severity] : '#e2e8f0',
                          fontWeight: detail.severity && detail.severity !== 'info' ? 600 : 400,
                        }}>
                          {detail.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Hint chips */}
            {(() => {
              const showHints =
                difficulty === 'easy' ||
                (difficulty === 'normal' && (nodeFailures[node.id] || 0) >= 3);
              // hard → never show
              return showHints ? (
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{
                    fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em',
                    color: '#94a3b8', marginBottom: 8, fontWeight: 700,
                  }}>
                    Hints
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                    {node.possibleActions
                      .filter((a) => a.showAsHint !== false)
                      .filter((a) => !(difficulty === 'easy' && (completedActions[node.id] || []).includes(a.id)))
                      .map((action) => (
                        <ActionCard
                          key={action.id}
                          action={action}
                          onClickHint={handleHintClick}
                        />
                      ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Chat history */}
            {history.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <h3 style={{
                  fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em',
                  color: '#94a3b8', marginBottom: 8, fontWeight: 700,
                }}>
                  History
                </h3>
                {history.map((msg, i) => {
                  const isUser = msg.role === 'user';
                  const isFail = !isUser && msg.success === false;
                  // "No-reward" actions are designed to fail — show yellow instead of red
                  const matchedAction = !isUser && msg.matchedActionId
                    ? node?.possibleActions.find((a) => a.id === msg.matchedActionId)
                    : undefined;
                  const isNoReward = matchedAction
                    ? !matchedAction.revealsNodes.length && !(matchedAction.revealsAssets?.length) && !(matchedAction.revealsAchievements?.length)
                    : false;
                  const isExpectedFail = isFail && isNoReward;
                  const bg = isUser ? 'rgba(0,240,255,0.1)' : isExpectedFail ? 'rgba(251,191,36,0.08)' : isFail ? 'rgba(255,51,102,0.1)' : 'rgba(0,255,136,0.1)';
                  const border = isUser ? 'rgba(0,240,255,0.2)' : isExpectedFail ? 'rgba(251,191,36,0.2)' : isFail ? 'rgba(255,51,102,0.2)' : 'rgba(0,255,136,0.2)';
                  const color = isUser ? '#00f0ff' : isExpectedFail ? '#fbbf24' : isFail ? '#ff3366' : '#00ff88';
                  const label = isUser ? 'You' : isExpectedFail ? 'No Finding' : isFail ? 'Failed' : 'Success';
                  return (
                    <div
                      key={i}
                      style={{
                        marginBottom: 8,
                        padding: '8px 12px',
                        borderRadius: 8,
                        fontSize: 12,
                        lineHeight: 1.5,
                        background: bg,
                        border: `1px solid ${border}`,
                        color,
                      }}
                    >
                      <span style={{ fontSize: 9, textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.1em' }}>
                        {label}
                      </span>
                      <div style={{ marginTop: 2 }}>{msg.content}</div>
                    </div>
                  );
                })}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Prompt input - fixed at bottom */}
          <div style={{
            padding: 16,
            borderTop: '1px solid #2a3a5c',
            background: 'rgba(10,14,23,0.8)',
          }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={executingAction ? 'Executing...' : 'What do you want to try?'}
                disabled={executingAction}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #2a3a5c',
                  background: 'rgba(17,24,39,0.8)',
                  color: '#e2e8f0',
                  fontSize: 13,
                  fontFamily: 'monospace',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleSend}
                disabled={executingAction || !input.trim()}
                style={{
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: '1px solid rgba(0,240,255,0.3)',
                  background: executingAction || !input.trim() ? 'rgba(17,24,39,0.8)' : 'rgba(0,240,255,0.15)',
                  color: executingAction || !input.trim() ? '#94a3b8' : '#00f0ff',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: executingAction || !input.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {executingAction ? '...' : '▶'}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Hint warning modal */}
      {hintWarning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setHintWarning(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <motion.div
            initial={{ scale: 0.85, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#111827', border: '1px solid #ff9900',
              borderRadius: 12, padding: 24, maxWidth: 380, width: '90%',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>&#x26A0;</div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#ffc107', marginBottom: 8 }}>
              Be more specific
            </h3>
            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 16 }}>
              "{hintWarning}" is too vague. Describe the specific technique or tool you want to use and what you're trying to achieve.
            </p>
            <button
              onClick={() => {
                setHintWarning(null);
                inputRef.current?.focus();
              }}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 8,
                background: 'rgba(255,193,7,0.15)', border: '1px solid rgba(255,193,7,0.3)',
                color: '#ffc107', fontWeight: 700, fontSize: 12,
                textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
