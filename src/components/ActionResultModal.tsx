import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';

const fallbackLines = [
  '> Initializing exploit framework...',
  '> Establishing connection to target...',
  '> Analyzing response vectors...',
  '> Processing results...',
];

export default function ActionResultModal() {
  const actionResult = useGameStore((s) => s.actionResult);
  const executingAction = useGameStore((s) => s.executingAction);
  const clearActionResult = useGameStore((s) => s.clearActionResult);
  const nodes = useGameStore((s) => s.nodes);
  const [lines, setLines] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);

  // When we get a result with logs, animate them first before showing the result
  useEffect(() => {
    if (executingAction) {
      setLines([]);
      setShowResult(false);
      // Show fallback loading lines while waiting for GPT
      let i = 0;
      const iv = setInterval(() => {
        if (i < fallbackLines.length) { setLines((p) => [...p, fallbackLines[i]]); i++; }
        else clearInterval(iv);
      }, 500);
      return () => clearInterval(iv);
    }

    if (actionResult && actionResult.logs && actionResult.logs.length > 0) {
      // GPT response arrived — show its logs with animation
      setLines([]);
      setShowResult(false);
      let i = 0;
      const logLines = actionResult.logs;
      const iv = setInterval(() => {
        if (i < logLines.length) {
          setLines((p) => [...p, logLines[i]]);
          i++;
        } else {
          clearInterval(iv);
          setTimeout(() => setShowResult(true), 400);
        }
      }, 350);
      return () => clearInterval(iv);
    }

    if (actionResult) {
      // No logs (e.g. error) — show result directly
      setLines([]);
      setShowResult(true);
    }
  }, [executingAction, actionResult]);

  const show = executingAction || actionResult;
  const showingTerminal = executingAction || (actionResult && !showResult);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => !executingAction && showResult && clearActionResult()}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(4px)', zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <motion.div
            initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#111827', border: '1px solid #2a3a5c', borderRadius: 12,
              padding: 24, maxWidth: 500, width: '90%',
            }}
          >
            {showingTerminal ? (
              <div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 16, alignItems: 'center' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff3366' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff9900' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00ff88' }} />
                  <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8, fontFamily: 'monospace' }}>terminal@peter</span>
                </div>
                <div style={{ background: '#0a0e17', borderRadius: 8, padding: 16, fontFamily: 'monospace', fontSize: 12, minHeight: 120 }}>
                  {lines.map((l, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ color: '#00ff88', marginBottom: 4 }}>
                      {l}
                    </motion.div>
                  ))}
                  <span style={{ display: 'inline-block', width: 8, height: 16, background: '#00f0ff', animation: 'blink 1s step-end infinite' }} />
                </div>
              </div>
            ) : actionResult && showResult ? (
              <div>
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                  style={{ textAlign: 'center', fontSize: 40, marginBottom: 12 }}
                >
                  {actionResult.success ? '✅' : '❌'}
                </motion.div>
                <h3 style={{
                  textAlign: 'center', fontSize: 16, fontWeight: 700, marginBottom: 8,
                  color: actionResult.success ? '#00ff88' : '#ff3366',
                }}>
                  {actionResult.success ? 'ACTION SUCCESSFUL' : 'ACTION FAILED'}
                </h3>
                <p style={{ textAlign: 'center', fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
                  {actionResult.message}
                </p>

                {actionResult.revealedNodes.length > 0 && (
                  <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: 'rgba(0,240,255,0.1)', border: '1px solid rgba(0,240,255,0.3)' }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#00f0ff', fontWeight: 700, marginBottom: 8 }}>
                      Nodes Revealed
                    </div>
                    {actionResult.revealedNodes.map((nid) => (
                      <motion.div key={nid} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} style={{ fontSize: 13, color: '#e2e8f0' }}>
                        + {nodes.get(nid)?.title || nid}
                      </motion.div>
                    ))}
                  </div>
                )}

                {actionResult.revealedAssets.length > 0 && (
                  <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)' }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#00ff88', fontWeight: 700, marginBottom: 8 }}>
                      Assets Discovered
                    </div>
                    {actionResult.revealedAssets.map((a) => (
                      <motion.div key={a.id} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} style={{ fontSize: 13, marginBottom: 4 }}>
                        <span style={{ color: '#e2e8f0' }}>{a.name}</span>
                        <span style={{ fontSize: 10, color: '#00ff88', fontFamily: 'monospace', marginLeft: 8 }}>{a.value}</span>
                      </motion.div>
                    ))}
                  </div>
                )}

                <button
                  onClick={clearActionResult}
                  style={{
                    width: '100%', padding: '10px 0', borderRadius: 8,
                    background: 'rgba(0,240,255,0.15)', border: '1px solid rgba(0,240,255,0.3)',
                    color: '#00f0ff', fontWeight: 700, fontSize: 12,
                    textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
                  }}
                >
                  Continue
                </button>
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
