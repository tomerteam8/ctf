import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';

// Contextual loading lines based on keywords in the user's prompt.
// Written as security assessment steps — no raw terminal/tool output.
// Ordered most-specific first; first match wins.
function buildFallbackLines(prompt: string, nodeTitle: string, baseUrl: string): string[] {
  const p = prompt.toLowerCase();
  const host = baseUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '') || 'shop.target.com';

  // ── Service / network discovery ─────────────────────────────────────
  if (p.includes('scan') || p.includes('service') || p.includes('port') || p.includes('exposed') || p.includes('running') || p.includes('open port') || p.includes('nmap')) {
    return [
      `> Initiating service discovery against ${host}...`,
      '> Probing for exposed network services...',
      '> Identifying service versions and configurations...',
      '> Checking for unnecessary exposed ports...',
      '> Assessing external attack surface...',
      '> Compiling service inventory...',
    ];
  }

  // ── Hidden endpoints / undocumented pages ────────────────────────────
  if (p.includes('hidden') || p.includes('undocumented') || p.includes('discover') || p.includes('endpoint') || p.includes('path') || p.includes('directory') || p.includes('api') || p.includes('legacy') || p.includes('deprecated') || p.includes('wordlist')) {
    return [
      `> Probing ${nodeTitle} for undocumented endpoints...`,
      '> Testing common administrative and debug paths...',
      '> Checking for legacy or deprecated API versions...',
      '> Analyzing server responses for hidden functionality...',
      '> Cross-referencing discovered paths...',
      '> Compiling endpoint inventory...',
    ];
  }

  // ── Injection / input validation ────────────────────────────────────
  if (p.includes('inject') || p.includes('sql') || p.includes('input') || p.includes('sanitiz') || p.includes('validat') || p.includes('user_type') || p.includes('parameter') || p.includes('field') || p.includes('form')) {
    return [
      `> Testing input handling on ${nodeTitle}...`,
      '> Submitting test payloads to input fields...',
      '> Analyzing how the backend processes unexpected input...',
      '> Checking for proper input sanitization...',
      '> Evaluating error responses for information leakage...',
      '> Assessing injection risk...',
    ];
  }

  // ── Access control / authorization ──────────────────────────────────
  if (p.includes('access') || p.includes('authoriz') || p.includes('other user') || p.includes('someone else') || p.includes('boundary') || p.includes('customer') || p.includes('permission')) {
    return [
      `> Testing access controls on ${nodeTitle}...`,
      '> Checking authorization boundaries between users...',
      '> Attempting to access resources outside current scope...',
      '> Evaluating role-based access enforcement...',
      '> Analyzing response differences across privilege levels...',
      '> Assessing access control posture...',
    ];
  }

  // ── Privilege escalation / role change ──────────────────────────────
  if (p.includes('escalat') || p.includes('privilege') || p.includes('role') || p.includes('employee') || p.includes('admin') || p.includes('upgrade') || p.includes('elevat')) {
    return [
      '> Assessing current privilege level...',
      '> Testing for privilege escalation vectors...',
      '> Attempting to modify account role parameters...',
      `> Sending modified request to ${nodeTitle}...`,
      '> Evaluating backend role enforcement...',
      '> Analyzing response for access changes...',
    ];
  }

  // ── Social engineering / support ────────────────────────────────────
  if (p.includes('social') || p.includes('convince') || p.includes('pretend') || p.includes('support') || p.includes('agent') || p.includes('help desk') || p.includes('chat') || p.includes('trick') || p.includes('phish') || p.includes('pose as')) {
    return [
      '> Initiating support interaction...',
      '> Establishing rapport with agent...',
      '> Presenting pretext scenario...',
      '> Assessing agent verification procedures...',
      '> Testing social engineering resistance...',
      '> Evaluating response to privilege request...',
    ];
  }

  // ── Credential / authentication testing ─────────────────────────────
  if (p.includes('password') || p.includes('credential') || p.includes('default') || p.includes('login') || p.includes('authenticat') || p.includes('brute') || p.includes('guess')) {
    return [
      `> Testing authentication on ${nodeTitle}...`,
      '> Checking for default or weak credentials...',
      '> Evaluating password policy enforcement...',
      '> Testing account lockout mechanisms...',
      '> Assessing authentication security posture...',
    ];
  }

  // ── Internal network / SSRF ─────────────────────────────────────────
  if (p.includes('internal') || p.includes('ssrf') || p.includes('localhost') || p.includes('127.0.0') || p.includes('10.') || p.includes('192.168') || p.includes('reach') || p.includes('probe') || p.includes('network')) {
    return [
      '> Testing for access to internal network resources...',
      `> Probing server-side request handling on ${nodeTitle}...`,
      '> Checking if the server can be directed to internal addresses...',
      '> Evaluating URL validation and allow-list controls...',
      '> Mapping accessible internal services...',
      '> Assessing network segmentation effectiveness...',
    ];
  }

  // ── CVE / known vulnerability exploitation ──────────────────────────
  if (p.includes('cve') || p.includes('exploit') || p.includes('vulnerability') || p.includes('vuln') || p.includes('known') || p.includes('patch') || p.includes('version')) {
    return [
      `> Identifying software version on ${nodeTitle}...`,
      '> Cross-referencing against known vulnerability databases...',
      '> Checking for applicable CVEs...',
      '> Evaluating exploit prerequisites...',
      '> Testing vulnerability conditions...',
      '> Assessing exploitability and defensive mitigations...',
    ];
  }

  // ── Data exposure / exfiltration ────────────────────────────────────
  if (p.includes('data') || p.includes('export') || p.includes('exfil') || p.includes('pii') || p.includes('customer') || p.includes('dump') || p.includes('extract') || p.includes('sensitive')) {
    return [
      `> Assessing data exposure on ${nodeTitle}...`,
      '> Evaluating scope of accessible records...',
      '> Checking for bulk data export capabilities...',
      '> Testing access restrictions on sensitive data...',
      '> Analyzing data classification and protection controls...',
      '> Assessing business impact of data exposure...',
    ];
  }

  // ── Registration / account creation ─────────────────────────────────
  if (p.includes('register') || p.includes('sign up') || p.includes('create account') || p.includes('new account')) {
    return [
      '> Submitting account registration request...',
      '> Testing registration with test credentials...',
      '> Evaluating account creation controls...',
      '> Checking for authenticated session...',
      '> Verifying access to authenticated features...',
    ];
  }

  // ── Token / session security ────────────────────────────────────────
  if (p.includes('token') || p.includes('session') || p.includes('jwt') || p.includes('cookie') || p.includes('forge') || p.includes('tamper')) {
    return [
      '> Analyzing session token structure...',
      '> Evaluating token signing and integrity...',
      '> Testing for token tampering vulnerabilities...',
      '> Checking token expiration and rotation policies...',
      '> Assessing session management security...',
    ];
  }

  // ── File upload testing ─────────────────────────────────────────────
  if (p.includes('upload') || p.includes('file') || p.includes('image') || p.includes('avatar') || p.includes('attachment')) {
    return [
      '> Testing file upload restrictions...',
      '> Evaluating content type validation...',
      '> Checking for server-side file processing...',
      '> Testing upload with modified file headers...',
      '> Assessing upload security controls...',
    ];
  }

  // ── Price / payment / checkout manipulation ─────────────────────────
  if (p.includes('price') || p.includes('payment') || p.includes('checkout') || p.includes('discount') || p.includes('coupon') || p.includes('refund') || p.includes('purchase') || p.includes('order') || p.includes('cart') || p.includes('cost')) {
    return [
      `> Testing pricing integrity on ${nodeTitle}...`,
      '> Evaluating server-side price validation...',
      '> Checking for discount and coupon abuse vectors...',
      '> Testing transaction controls...',
      '> Assessing financial impact potential...',
    ];
  }

  // ── Email / notification manipulation ───────────────────────────────
  if (p.includes('email') || p.includes('mail') || p.includes('unsubscribe') || p.includes('notification') || p.includes('marketing')) {
    return [
      `> Testing email functionality on ${nodeTitle}...`,
      '> Evaluating input handling in email fields...',
      '> Checking for notification delivery manipulation...',
      '> Testing impact on other users\' preferences...',
      '> Assessing business disruption potential...',
    ];
  }

  // ── Monitoring / diagnostic tools ───────────────────────────────────
  if (p.includes('monitor') || p.includes('health') || p.includes('diagnostic') || p.includes('ping') || p.includes('status') || p.includes('zabbix') || p.includes('grafana')) {
    return [
      `> Accessing diagnostic tools on ${nodeTitle}...`,
      '> Evaluating available monitoring capabilities...',
      '> Testing diagnostic input handling...',
      '> Checking for command execution vectors...',
      '> Assessing management interface security...',
    ];
  }

  // ── Wiki / documentation / runbook ──────────────────────────────────
  if (p.includes('wiki') || p.includes('doc') || p.includes('runbook') || p.includes('knowledge') || p.includes('search') || p.includes('edit') || p.includes('modify')) {
    return [
      `> Reviewing content on ${nodeTitle}...`,
      '> Searching for sensitive information in documentation...',
      '> Evaluating content access controls...',
      '> Checking edit permissions and approval workflows...',
      '> Assessing information exposure risk...',
    ];
  }

  // ── Explore / enumerate features ────────────────────────────────────
  if (p.includes('explore') || p.includes('enumerate') || p.includes('what') || p.includes('feature') || p.includes('module') || p.includes('available') || p.includes('look') || p.includes('check') || p.includes('review') || p.includes('investigate') || p.includes('assess')) {
    return [
      `> Exploring available features on ${nodeTitle}...`,
      '> Mapping accessible functionality...',
      '> Evaluating feature exposure and controls...',
      '> Analyzing configuration and permissions...',
      '> Compiling assessment findings...',
    ];
  }

  // ── Technology / fingerprinting ─────────────────────────────────────
  if (p.includes('technology') || p.includes('stack') || p.includes('framework') || p.includes('fingerprint') || p.includes('identify')) {
    return [
      `> Identifying technology stack on ${nodeTitle}...`,
      '> Analyzing server response headers...',
      '> Detecting frameworks and libraries in use...',
      '> Cross-referencing versions against vulnerability databases...',
      '> Compiling technology profile...',
    ];
  }

  // ── Domain / certificate reconnaissance ─────────────────────────────
  if (p.includes('domain') || p.includes('certificate') || p.includes('ssl') || p.includes('tls') || p.includes('whois') || p.includes('dns') || p.includes('subdomain')) {
    return [
      `> Investigating domain and certificate information for ${host}...`,
      '> Checking certificate transparency logs...',
      '> Reviewing registration and ownership records...',
      '> Analyzing SSL/TLS configuration...',
      '> Compiling reconnaissance findings...',
    ];
  }

  // ── Concurrent / race condition testing ─────────────────────────────
  if (p.includes('concurrent') || p.includes('race') || p.includes('simultaneous') || p.includes('parallel') || p.includes('double')) {
    return [
      `> Testing concurrent request handling on ${nodeTitle}...`,
      '> Submitting parallel requests...',
      '> Evaluating transaction integrity under load...',
      '> Checking for timing-based vulnerabilities...',
      '> Assessing concurrency controls...',
    ];
  }

  // ── Print / job history ─────────────────────────────────────────────
  if (p.includes('print') || p.includes('job') || p.includes('cups') || p.includes('history') || p.includes('log')) {
    return [
      `> Reviewing activity logs on ${nodeTitle}...`,
      '> Checking for sensitive information in historical records...',
      '> Evaluating data retention and access controls...',
      '> Analyzing logged metadata...',
      '> Assessing information leakage through logs...',
    ];
  }

  // ── Backup / archive ───────────────────────────────────────────────
  if (p.includes('backup') || p.includes('archive') || p.includes('restore') || p.includes('veeam') || p.includes('snapshot')) {
    return [
      `> Assessing backup infrastructure on ${nodeTitle}...`,
      '> Checking backup console access controls...',
      '> Evaluating archive encryption and protection...',
      '> Testing for accessible backup files...',
      '> Assessing data recovery risk...',
    ];
  }

  // ── Active Directory / LDAP / Kerberos ──────────────────────────────
  if (p.includes('directory') || p.includes('ldap') || p.includes('kerberos') || p.includes('active directory') || p.includes('ad ') || p.includes('domain')) {
    return [
      `> Testing directory service on ${nodeTitle}...`,
      '> Evaluating authentication requirements...',
      '> Checking for unauthenticated access...',
      '> Assessing user enumeration controls...',
      '> Analyzing directory security posture...',
    ];
  }

  // ── Generic fallback ──────────────────────────────────────────────────
  return [
    `> Initiating security assessment of ${nodeTitle}...`,
    `> Connecting to ${host}...`,
    '> Analyzing target configuration...',
    '> Evaluating security controls...',
    '> Processing assessment results...',
  ];
}

// Actions with business impact — tints the success modal red.
// Severity levels: 'moderate' (slight), 'severe' (medium), 'critical' (strong red).
type ImpactSeverity = 'moderate' | 'severe' | 'critical';
const BUSINESS_IMPACT_ACTIONS: Record<string, ImpactSeverity> = {
  // === Critical — catastrophic breach ===
  full_db_exfiltration: 'critical',
  pii_exfiltration: 'critical',
  payroll_data_access: 'critical',
  ping_command_injection: 'critical',
  refund_redirect: 'critical',

  // === Severe — significant damage ===
  bulk_customer_export: 'severe',
  payment_info_harvest: 'severe',
  cloud_credential_theft: 'severe',
  ssrf_create_admin: 'severe',
  sqli_data_exfil: 'severe',
  upload_webshell: 'severe',
  admin_session_steal: 'severe',
  jenkins_script_console: 'severe',

  // === Moderate — concerning but contained ===
  sqli_user_type: 'moderate',
  crack_password_hashes: 'moderate',
  zero_inventory: 'moderate',
  supplier_data_exfil: 'moderate',
  vendor_payment_exfil: 'moderate',
  store_credit_fraud: 'moderate',
  ftp_anon_login: 'moderate',
  webhook_forge: 'moderate',
  webhook_idor: 'moderate',
  contact_account_takeover: 'moderate',
  session_hijack: 'moderate',
  export_idor: 'moderate',
  internal_phish: 'moderate',
  redis_rce: 'moderate',
  confluence_rce: 'moderate',
  jenkins_cred_dump: 'moderate',
  shipment_redirect: 'moderate',
};

const IMPACT_STYLES: Record<ImpactSeverity, { border: string; bg: string; headerColor: string; buttonBg: string; buttonBorder: string; buttonColor: string }> = {
  moderate: {
    border: '1px solid rgba(255,150,50,0.4)',
    bg: 'linear-gradient(180deg, rgba(255,100,50,0.08) 0%, #111827 40%)',
    headerColor: '#ffaa44',
    buttonBg: 'rgba(255,150,50,0.15)',
    buttonBorder: '1px solid rgba(255,150,50,0.3)',
    buttonColor: '#ffaa44',
  },
  severe: {
    border: '1px solid rgba(255,51,102,0.4)',
    bg: 'linear-gradient(180deg, rgba(255,51,102,0.12) 0%, #111827 40%)',
    headerColor: '#ff6680',
    buttonBg: 'rgba(255,51,102,0.15)',
    buttonBorder: '1px solid rgba(255,51,102,0.3)',
    buttonColor: '#ff6680',
  },
  critical: {
    border: '1px solid rgba(255,30,60,0.5)',
    bg: 'linear-gradient(180deg, rgba(255,30,60,0.18) 0%, #111827 40%)',
    headerColor: '#ff3366',
    buttonBg: 'rgba(255,30,60,0.2)',
    buttonBorder: '1px solid rgba(255,30,60,0.4)',
    buttonColor: '#ff3366',
  },
};

export default function ActionResultModal() {
  const actionResult = useGameStore((s) => s.actionResult);
  const executingAction = useGameStore((s) => s.executingAction);
  const executingPrompt = useGameStore((s) => s.executingPrompt);
  const clearActionResult = useGameStore((s) => s.clearActionResult);
  const nodes = useGameStore((s) => s.nodes);
  const selectedNodeId = useGameStore((s) => s.selectedNodeId);
  const [lines, setLines] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);

  const selectedNode = selectedNodeId ? nodes.get(selectedNodeId) : null;
  const nodeTitle = selectedNode?.title ?? 'target';
  const nodeBaseUrl = selectedNode?.baseUrl ?? 'https://shop.target.com';
  const fallbackLines = useMemo(
    () => buildFallbackLines(executingPrompt, nodeTitle, nodeBaseUrl),
    [executingPrompt, nodeTitle, nodeBaseUrl],
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

  // Compute business-impact severity for the modal card styling
  const cardImpact = actionResult?.success && actionResult.matchedActionId && showResult
    ? BUSINESS_IMPACT_ACTIONS[actionResult.matchedActionId] ?? null
    : null;
  const cardImpactStyle = cardImpact ? IMPACT_STYLES[cardImpact] : null;

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
              background: cardImpactStyle?.bg ?? '#111827',
              border: cardImpactStyle?.border ?? '1px solid #2a3a5c',
              borderRadius: 12,
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
            ) : actionResult && showResult ? (() => {
              const impact = actionResult.success && actionResult.matchedActionId
                ? BUSINESS_IMPACT_ACTIONS[actionResult.matchedActionId] ?? null
                : null;
              const impactStyle = impact ? IMPACT_STYLES[impact] : null;
              return (
              <div>
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                  style={{ textAlign: 'center', fontSize: 40, marginBottom: 12 }}
                >
                  {actionResult.success ? (impact ? '⚠️' : '✅') : '❌'}
                </motion.div>
                <h3 style={{
                  textAlign: 'center', fontSize: 16, fontWeight: 700, marginBottom: 8,
                  color: actionResult.success ? (impactStyle?.headerColor ?? '#00ff88') : '#ff3366',
                }}>
                  {actionResult.success
                    ? (impact ? 'BREACH SUCCESSFUL' : 'ACTION SUCCESSFUL')
                    : 'ACTION FAILED'}
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
                    background: impactStyle?.buttonBg ?? 'rgba(0,240,255,0.15)',
                    border: impactStyle?.buttonBorder ?? '1px solid rgba(0,240,255,0.3)',
                    color: impactStyle?.buttonColor ?? '#00f0ff',
                    fontWeight: 700, fontSize: 12,
                    textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
                  }}
                >
                  Continue
                </button>
              </div>
              );
            })() : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
