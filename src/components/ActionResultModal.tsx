import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';

// Contextual loading lines based on keywords in the user's prompt
function buildFallbackLines(prompt: string, nodeTitle: string): string[] {
  const p = prompt.toLowerCase();

  const header = `> Targeting ${nodeTitle}...`;

  if (p.includes('nmap') || p.includes('port') || p.includes('scan')) {
    return [
      header,
      '> Starting Nmap 7.94 ( https://nmap.org )',
      `> Scanning ${nodeTitle}...`,
      '> Discovering open ports...',
      '> Running service detection scripts...',
      '> Analyzing results...',
    ];
  }
  if (p.includes('dir') || p.includes('enum') || p.includes('gobuster') || p.includes('ffuf')) {
    return [
      header,
      '> Initializing directory brute-force...',
      '> Loading wordlist: /usr/share/wordlists/common.txt',
      '> Sending requests... [==========>          ] 47%',
      '> Filtering responses by status code...',
      '> Compiling discovered endpoints...',
    ];
  }
  if (p.includes('sql') || p.includes('inject') || p.includes('sqlmap')) {
    return [
      header,
      '> Launching sqlmap against target parameter...',
      '> Testing for SQL injection vectors...',
      '> Payload: \' OR 1=1 --',
      '> Analyzing server responses...',
      '> Checking injectable parameters...',
    ];
  }
  if (p.includes('ssrf') || p.includes('fetch') || p.includes('request forgery')) {
    return [
      header,
      '> Crafting SSRF payload...',
      '> Probing internal network via URL parameter...',
      '> Sending request to internal endpoint...',
      '> Analyzing redirects and response body...',
      '> Mapping discovered internal services...',
    ];
  }
  if (p.includes('brute') || p.includes('password') || p.includes('credential') || p.includes('login')) {
    return [
      header,
      '> Loading credential wordlist...',
      '> Attempting authentication bypass...',
      '> Testing username:password combinations...',
      '> Analyzing server responses for valid sessions...',
    ];
  }
  if (p.includes('curl') || p.includes('post') || p.includes('api') || p.includes('endpoint')) {
    return [
      header,
      '> Crafting HTTP request...',
      '> Sending payload to target endpoint...',
      '> Awaiting server response...',
      '> Parsing response headers and body...',
    ];
  }
  if (p.includes('whois') || p.includes('dns') || p.includes('lookup') || p.includes('recon')) {
    return [
      header,
      '> Querying WHOIS database...',
      '> Resolving DNS records...',
      '> Gathering registrar information...',
      '> Compiling results...',
    ];
  }
  if (p.includes('admin') || p.includes('privilege') || p.includes('escalat')) {
    return [
      header,
      '> Attempting privilege escalation...',
      '> Forging authorization token...',
      '> Sending crafted request to admin endpoint...',
      '> Verifying elevated access...',
    ];
  }

  // Generic fallback
  return [
    header,
    '> Initializing attack framework...',
    '> Establishing connection to target...',
    '> Analyzing attack surface...',
    '> Processing results...',
  ];
}

export default function ActionResultModal() {
  const actionResult = useGameStore((s) => s.actionResult);
  const executingAction = useGameStore((s) => s.executingAction);
  const executingPrompt = useGameStore((s) => s.executingPrompt);
  const clearActionResult = useGameStore((s) => s.clearActionResult);
  const nodes = useGameStore((s) => s.nodes);
  const selectedNodeId = useGameStore((s) => s.selectedNodeId);
  const [lines, setLines] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);

  const nodeTitle = selectedNodeId ? (nodes.get(selectedNodeId)?.title ?? 'target') : 'target';
  const fallbackLines = useMemo(
    () => buildFallbackLines(executingPrompt, nodeTitle),
    [executingPrompt, nodeTitle],
  );

  useEffect(() => {
    if (executingAction) {
      setLines([]);
      setShowResult(false);
      let i = 0;
      const iv = setInterval(() => {
        if (i < fallbackLines.length) { setLines((p) => [...p, fallbackLines[i]]); i++; }
        else clearInterval(iv);
      }, 600);
      return () => clearInterval(iv);
    }

    if (actionResult && actionResult.logs && actionResult.logs.length > 0) {
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
      }, 300);
      return () => clearInterval(iv);
    }

    if (actionResult) {
      setLines([]);
      setShowResult(true);
    }
  }, [executingAction, actionResult, fallbackLines]);

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
              padding: 24, maxWidth: 560, width: '90%',
            }}
          >
            {showingTerminal ? (
              <div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 16, alignItems: 'center' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff3366' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff9900' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00ff88' }} />
                  <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8, fontFamily: 'monospace' }}>peter@{nodeTitle.toLowerCase().replace(/\s+/g, '-')}</span>
                </div>
                <div style={{ background: '#0a0e17', borderRadius: 8, padding: 16, fontFamily: 'monospace', fontSize: 12, minHeight: 140, maxHeight: 320, overflowY: 'auto' }}>
                  {lines.map((l, i) => {
                    // Color output lines based on content
                    const line = typeof l === 'string' ? l : String(l ?? '');
                    let color = '#00ff88';
                    if (line.includes('ERROR') || line.includes('FAIL') || line.includes('denied') || line.includes('refused')) color = '#ff3366';
                    else if (line.includes('WARNING') || line.includes('timeout') || line.includes('filtered')) color = '#ff9900';
                    else if (line.startsWith('>') || line.startsWith('$')) color = '#00f0ff';
                    else if (line.includes('open') || line.includes('found') || line.includes('SUCCESS') || line.includes('discovered')) color = '#00ff88';

                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        style={{ color, marginBottom: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                      >
                        {line}
                      </motion.div>
                    );
                  })}
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
