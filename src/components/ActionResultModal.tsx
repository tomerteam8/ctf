import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';

// Contextual loading lines based on keywords in the user's prompt.
// Two tiers:
//   1. Specific tool names → realistic tool output ($ commands), parameterized per node
//   2. Technique/concept keywords → descriptive `>` prefixed lines
// Both `$` and `>` render cyan. Ordered most-specific first; first match wins.
function buildFallbackLines(prompt: string, nodeTitle: string, baseUrl: string): string[] {
  const p = prompt.toLowerCase();
  const host = baseUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '') || 'shop.target.com';
  const path = baseUrl.replace(/^https?:\/\/[^/]+/, '') || '/';

  // =====================================================================
  // TIER 1 — Specific tool names → realistic tool output
  // =====================================================================

  // ── nmap / masscan / rustscan ─────────────────────────────────────────
  if (p.includes('nmap')) {
    return [
      `$ nmap -sC -sV ${host}`,
      `Starting Nmap 7.94SVN ( https://nmap.org )`,
      `Nmap scan report for ${host}`,
      '> Discovering open ports...',
      '> Running service detection scripts...',
      `> NSE: Running scripts against ${nodeTitle}...`,
      '> Compiling scan results...',
    ];
  }
  if (p.includes('masscan')) {
    return [
      `$ masscan ${host} -p0-65535 --rate=10000`,
      `Starting masscan 1.3.2 at ${new Date().toISOString().slice(0, 19)}`,
      `> Scanning ${host} at 10000 packets/sec...`,
      '> Discovered open ports...',
      '> Scan complete, processing results...',
    ];
  }
  if (p.includes('rustscan')) {
    return [
      `$ rustscan -a ${host} -- -sV`,
      '> Open ports: 21, 80, 443, 6379',
      `> Handing off to nmap for service detection on ${host}...`,
      '> Running version probes...',
      '> Compiling results...',
    ];
  }

  // ── gobuster / ffuf / dirb / dirsearch / feroxbuster ──────────────────
  if (p.includes('gobuster')) {
    return [
      `$ gobuster dir -u ${baseUrl} -w /usr/share/seclists/Discovery/Web-Content/raft-medium.txt -t 50`,
      'Gobuster v3.6',
      `> Brute-forcing directories on ${host}...`,
      '> Sending requests... [==========>          ] 47%',
      '> Filtering by status code...',
      '> Sending requests... [===================> ] 94%',
      '> Compiling discovered endpoints...',
    ];
  }
  if (p.includes('ffuf')) {
    return [
      `$ ffuf -u ${baseUrl}/FUZZ -w common.txt -mc 200,301,401,403`,
      `> FUZZ wordlist: common.txt (4727 entries)`,
      `> Targeting ${host}...`,
      '> Filtering responses...',
      '> Progress: [4727/4727] — Elapsed: [00:00:08]',
    ];
  }
  if (p.includes('dirb')) {
    return [
      `$ dirb ${baseUrl} /usr/share/wordlists/dirb/common.txt`,
      `DIRB v2.22`,
      `> Scanning ${baseUrl}...`,
      '> Testing entries... [==========>          ] 47%',
      '> Compiling discovered paths...',
    ];
  }
  if (p.includes('dirsearch')) {
    return [
      `$ dirsearch -u ${baseUrl} -e php,js,html`,
      `> Target: ${baseUrl}`,
      '> Wordlist size: 9847',
      '> Scanning... [===================> ] 94%',
      '> Compiling results...',
    ];
  }
  if (p.includes('feroxbuster')) {
    return [
      `$ feroxbuster -u ${baseUrl} -w raft-medium.txt`,
      `> Target: ${baseUrl}`,
      '> Threads: 50 | Wordlist: raft-medium.txt',
      '> Scanning recursively...',
      '> Processing discovered paths...',
    ];
  }

  // ── sqlmap ────────────────────────────────────────────────────────────
  if (p.includes('sqlmap')) {
    return [
      `$ sqlmap -u "${baseUrl}" --data="user_type=test" --batch --level=3`,
      `        ___`,
      `       __H__`,
      ` ___ ___[']_____ ___ ___  {1.8.12#stable}`,
      `|_ -| . ["]     | .'| . |`,
      `|___|_  [']_|_|_|__,|  _|`,
      `      |_|V...       |_|`,
      `> Testing connection to ${host}...`,
      `> Testing parameters on ${nodeTitle}...`,
      '> Checking if target is protected by WAF/IPS...',
      '> Heuristic test shows parameter might be injectable...',
    ];
  }

  // ── curl ──────────────────────────────────────────────────────────────
  if (p.includes('curl')) {
    return [
      `$ curl -s -v ${baseUrl}`,
      `> GET ${path} HTTP/2`,
      `> Host: ${host}`,
      '> User-Agent: Mozilla/5.0',
      `< HTTP/2 200`,
      '< content-type: application/json',
      `> Parsing response from ${nodeTitle}...`,
    ];
  }

  // ── hydra ─────────────────────────────────────────────────────────────
  if (p.includes('hydra')) {
    return [
      `$ hydra -L users.txt -P rockyou.txt ${host} https-post-form "${path}:email=^USER^&pass=^PASS^:Invalid"`,
      'Hydra v9.5 (c) 2023 by van Hauser/THC',
      `> Attacking ${host}...`,
      '[DATA] max 16 tasks per 1 server',
      '> Attempt 2847 / 14344321 — ~896 tries/min...',
      '> Analyzing responses for valid sessions...',
    ];
  }
  if (p.includes('medusa')) {
    return [
      `$ medusa -h ${host} -U users.txt -P passwords.txt -M http`,
      `Medusa v2.2`,
      `> Targeting ${nodeTitle}...`,
      '> Testing credential combinations (16 threads)...',
      '> Monitoring for account lockout...',
    ];
  }

  // ── nikto ─────────────────────────────────────────────────────────────
  if (p.includes('nikto')) {
    return [
      `$ nikto -h ${baseUrl}`,
      `- Nikto v2.5.0`,
      `+ Target Hostname: ${host}`,
      `+ Server: nginx/1.24.0`,
      '+ X-Powered-By: Express',
      `> Testing ${nodeTitle} for known vulnerabilities...`,
      '> Compiling vulnerability report...',
    ];
  }

  // ── nuclei ────────────────────────────────────────────────────────────
  if (p.includes('nuclei')) {
    return [
      `$ nuclei -u ${baseUrl} -t cves/ -t exposures/`,
      `[INF] nuclei v3.1.0`,
      `[INF] Templates loaded: 7482`,
      `> Scanning ${nodeTitle}...`,
      '> Checking CVE templates against target...',
      '> Processing template matches...',
    ];
  }

  // ── whatweb / wappalyzer ──────────────────────────────────────────────
  if (p.includes('whatweb')) {
    return [
      `$ whatweb -a 3 ${baseUrl}`,
      `${baseUrl} [200 OK]`,
      `  HTTPServer[nginx/1.24.0], X-Powered-By[Express]`,
      `> Fingerprinting ${nodeTitle}...`,
      '> Cross-referencing versions with vulnerability databases...',
    ];
  }
  if (p.includes('wappalyzer')) {
    return [
      `$ wappalyzer ${baseUrl}`,
      `> Analyzing ${nodeTitle}...`,
      '> Detected: nginx, Express.js, Node.js, React',
      '> Identifying library versions...',
      '> Checking for known vulnerabilities...',
    ];
  }

  // ── hashcat / john ────────────────────────────────────────────────────
  if (p.includes('hashcat')) {
    return [
      '$ hashcat -m 16500 jwt.txt /usr/share/wordlists/rockyou.txt',
      '> Loading hash file...',
      '> Attack mode: dictionary',
      '> Speed: 1.2 MH/s',
      '> Testing candidate passwords...',
      '> Analyzing results...',
    ];
  }
  if (p.includes('john')) {
    return [
      '$ john --wordlist=rockyou.txt hash.txt',
      'Loaded 1 password hash',
      '> Running wordlist attack...',
      '> Press any key for status...',
      '> Analyzing cracked results...',
    ];
  }

  // ── redis-cli ─────────────────────────────────────────────────────────
  if (p.includes('redis-cli')) {
    return [
      `$ redis-cli -h ${host} -p 6379`,
      `${host}:6379> INFO server`,
      '(error) NOAUTH Authentication required.',
      '> Testing common passwords...',
      '> Checking for protected mode bypass...',
    ];
  }

  // ── netcat / nc ───────────────────────────────────────────────────────
  if (p.includes('netcat') || /\bnc\b/.test(p)) {
    return [
      `$ nc -nv ${host} 443`,
      `Connection to ${host} port 443 [tcp] succeeded!`,
      '> Sending raw request...',
      `> Reading response from ${nodeTitle}...`,
      '> Analyzing banner...',
    ];
  }

  // ── burp ──────────────────────────────────────────────────────────────
  if (p.includes('burp')) {
    return [
      `> Burp Suite intercepting traffic to ${host}...`,
      `> Captured request: ${path}`,
      '> Sending to Repeater...',
      '> Modifying parameters...',
      `> Forwarding modified request to ${nodeTitle}...`,
      '> Analyzing response diff...',
    ];
  }

  // ── amass / subfinder ─────────────────────────────────────────────────
  if (p.includes('amass')) {
    return [
      `$ amass enum -d ${host}`,
      '> Querying certificate transparency logs...',
      '> Brute-forcing subdomains...',
      `> Enumerating ${host}...`,
      '> Compiling subdomain list...',
    ];
  }
  if (p.includes('subfinder')) {
    return [
      `$ subfinder -d ${host} -silent`,
      `> Querying passive sources for ${host}...`,
      '> Sources: crtsh, virustotal, hackertarget...',
      '> Compiling discovered subdomains...',
    ];
  }

  // ── dig / nslookup ────────────────────────────────────────────────────
  if (p.includes('dig')) {
    return [
      `$ dig +short ${host}`,
      '203.0.113.42',
      `$ dig +short MX ${host}`,
      `10 mail.${host}.`,
      '> Compiling DNS records...',
    ];
  }
  if (p.includes('nslookup')) {
    return [
      `$ nslookup ${host}`,
      `Server: 8.8.8.8`,
      `Address: 203.0.113.42`,
      '> Resolving additional records...',
    ];
  }

  // ── whois ─────────────────────────────────────────────────────────────
  if (p.includes('whois')) {
    return [
      `$ whois ${host}`,
      `Domain Name: ${host.toUpperCase()}`,
      'Registrar: NameCheap, Inc.',
      'Creation Date: 2019-03-14',
      '> Gathering registrar information...',
    ];
  }

  // =====================================================================
  // TIER 2 — Technique / concept keywords → descriptive lines
  // =====================================================================

  // ── SQL injection ─────────────────────────────────────────────────────
  if (p.includes('sql') || p.includes('union select') || p.includes('column') || p.includes('user_type')) {
    return [
      `> Testing ${nodeTitle} for SQL injection vectors...`,
      '> Sending error-based detection payload...',
      '> Analyzing server error responses for DB fingerprint...',
      '> Backend identified: PostgreSQL',
      '> Testing UNION-based injection on target parameter...',
      '> Adjusting payload column count...',
      '> Extracting data from response...',
    ];
  }

  // ── Directory / path enumeration ──────────────────────────────────────
  if (p.includes('directory') || p.includes('dir enum') || p.includes('path brute') || p.includes('enumerate endpoint') || p.includes('hidden endpoint')) {
    return [
      `> Loading wordlist for directory brute-force...`,
      `> Brute-forcing directories on ${nodeTitle}...`,
      '> Sending requests... [==========>          ] 47%',
      '> Filtering responses by status code...',
      '> Sending requests... [===================> ] 94%',
      '> Compiling discovered endpoints...',
    ];
  }

  // ── XSS ───────────────────────────────────────────────────────────────
  if (p.includes('xss') || p.includes('cross-site') || p.includes('script') || p.includes('reflected') || p.includes('stored xss')) {
    return [
      `> Testing ${nodeTitle} for reflected XSS...`,
      '> Injecting script tags into input parameters...',
      '> Checking output encoding in response body...',
      '> Trying event handler payloads...',
      '> Evaluating Content-Security-Policy header...',
      '> Analyzing response for unescaped reflection points...',
    ];
  }

  // ── SSRF ──────────────────────────────────────────────────────────────
  if (p.includes('ssrf') || p.includes('server-side request') || p.includes('request forgery') || p.includes('internal network') || p.includes('internal endpoint')) {
    return [
      '> Crafting SSRF payload targeting internal network...',
      '> Submitting URL parameter pointing to 127.0.0.1...',
      '> Probing internal IP range 10.0.0.0/24...',
      '> Received response from 10.0.0.5:8080 — internal service detected',
      '> Enumerating additional internal hosts...',
      '> Mapping discovered internal services...',
    ];
  }

  // ── Command injection ─────────────────────────────────────────────────
  if (p.includes('command inject') || p.includes('rce') || p.includes('remote code') || p.includes('shell') || p.includes('ping') || p.includes('os command') || p.includes(';') || p.includes('$(') || p.includes('`')) {
    return [
      `> Testing ${nodeTitle} for command injection...`,
      '> Injecting shell metacharacters into parameter...',
      '> Payload: ;id',
      '> Analyzing response for command output...',
      '> Testing alternative separators: | && $()',
      '> Checking for blind command injection via timing...',
    ];
  }

  // ── IDOR / access control ─────────────────────────────────────────────
  if (p.includes('idor') || p.includes('insecure direct') || p.includes('access control') || p.includes('authorization bypass') || p.includes('other user')) {
    return [
      '> Enumerating object IDs on target endpoint...',
      '> Sending requests with sequential IDs (1..20)...',
      '> Comparing response codes across user boundaries...',
      '> Checking horizontal privilege escalation...',
      '> Testing parameter tampering on resource identifiers...',
      '> Analyzing access control enforcement...',
    ];
  }

  // ── JWT / token attacks ───────────────────────────────────────────────
  if (p.includes('jwt') || p.includes('token') || p.includes('forge') || p.includes('hs256') || p.includes('secret')) {
    return [
      '> Decoding JWT payload from session cookie...',
      '> Token claims: {"uid":1024,"type":"user"}',
      '> Algorithm: HS256 — symmetric signing',
      '> Attempting to crack signing secret...',
      '> Testing algorithm confusion (HS256 → none)...',
      '> Analyzing token expiration and validation...',
    ];
  }

  // ── Registration / account creation ───────────────────────────────────
  if (p.includes('register') || p.includes('sign up') || p.includes('signup') || p.includes('create account') || p.includes('new account')) {
    return [
      '> Sending registration request to sign-up endpoint...',
      '> Submitting email and password...',
      '> Received 201 Created response...',
      '> Extracting session token from Set-Cookie header...',
      '> Verifying authenticated session...',
    ];
  }

  // ── Brute force / credential stuffing ─────────────────────────────────
  if (p.includes('brute force') || p.includes('brute-force') || p.includes('credential stuff')) {
    return [
      '> Loading credential wordlist (14 million entries)...',
      `> Launching brute-force attack against ${nodeTitle}...`,
      '> Testing username:password combinations (16 threads)...',
      '> Attempt 2847 / 14344321 — ~896 tries/min...',
      '> Monitoring for rate limiting or account lockout...',
      '> Analyzing responses for valid sessions...',
    ];
  }
  if (p.includes('password') || p.includes('credential') || p.includes('login') || p.includes('authenticate')) {
    return [
      `> Attempting authentication against ${nodeTitle}...`,
      '> Testing common credential pairs...',
      '> Checking for default credentials...',
      '> Analyzing response for session tokens...',
      '> Checking for account lockout policy...',
      '> Measuring response timing for user enumeration...',
    ];
  }

  // ── File upload attacks ───────────────────────────────────────────────
  if (p.includes('upload') || p.includes('web shell') || p.includes('webshell') || p.includes('polyglot') || p.includes('file upload')) {
    return [
      '> Crafting polyglot payload (JPEG header + PHP body)...',
      '> Uploading crafted file to upload endpoint...',
      '> Checking server-side content type validation...',
      '> Testing for magic byte verification bypass...',
      '> Checking if uploaded file is executable at returned URL...',
      '> Testing path traversal in filename parameter...',
    ];
  }

  // ── Path traversal / LFI ──────────────────────────────────────────────
  if (p.includes('traversal') || p.includes('lfi') || p.includes('local file') || p.includes('../') || p.includes('path traversal')) {
    return [
      '> Testing path traversal sequences on target parameter...',
      '> Payload: ../../../../etc/passwd',
      '> Trying URL-encoded traversal: %2e%2e%2f%2e%2e%2f',
      '> Trying double encoding: %252e%252e%252f',
      '> Trying null byte termination: ../etc/passwd%00.pdf',
      '> Analyzing response for file contents...',
    ];
  }

  // ── XXE ───────────────────────────────────────────────────────────────
  if (p.includes('xxe') || p.includes('xml external') || p.includes('xml entity') || p.includes('svg')) {
    return [
      '> Crafting XML payload with external entity declaration...',
      '> Embedding entity reference targeting /etc/passwd...',
      '> Submitting payload to target endpoint...',
      '> Checking for out-of-band entity resolution...',
      '> Testing blind XXE via external DTD...',
      '> Analyzing response for file content exfiltration...',
    ];
  }

  // ── CSRF ──────────────────────────────────────────────────────────────
  if (p.includes('csrf') || p.includes('cross-site request') || p.includes('forged request')) {
    return [
      '> Inspecting anti-CSRF protections...',
      '> Checking for CSRF token in form: found (double-submit cookie)',
      '> Checking SameSite cookie attribute: SameSite=Lax',
      '> Checking Origin/Referer validation...',
      '> Attempting token prediction...',
      '> Crafting cross-origin POST with forged token...',
    ];
  }

  // ── Race condition ────────────────────────────────────────────────────
  if (p.includes('race') || p.includes('toctou') || p.includes('concurrent')) {
    return [
      '> Preparing concurrent request batch (50 threads)...',
      '> Firing parallel requests to target endpoint...',
      '> Monitoring for inconsistent state responses...',
      '> Checking for time-of-check/time-of-use windows...',
      '> Analyzing rate limiter behavior under load...',
      '> Evaluating response deltas for exploitable gaps...',
    ];
  }

  // ── GraphQL ───────────────────────────────────────────────────────────
  if (p.includes('graphql') || p.includes('introspect') || p.includes('mutation') || p.includes('query depth')) {
    return [
      '> Sending introspection query to GraphQL endpoint...',
      '> Introspection disabled — trying alternative enumeration...',
      '> Sending intentional typos to trigger field suggestions...',
      '> Leaked field names: adminUsers, internalNotes, secretKey',
      '> Testing query depth limits with nested payloads...',
      '> Checking for batch query aliasing bypass...',
    ];
  }

  // ── Redis ─────────────────────────────────────────────────────────────
  if (p.includes('redis') || p.includes('6379') || p.includes('session hijack') || p.includes('session steal')) {
    return [
      '> Connecting to Redis instance on port 6379...',
      '> Attempting unauthenticated INFO command...',
      '> Authentication required — testing common passwords...',
      '> Testing for protected mode bypass...',
      '> Checking if instance is bound to loopback only...',
      '> Analyzing connection error responses...',
    ];
  }

  // ── FTP ───────────────────────────────────────────────────────────────
  if (p.includes('ftp') || p.includes('anonymous') || p.includes('vsftpd')) {
    return [
      '> Connecting to FTP service on port 21...',
      '> Server banner: vsFTPd 3.0.5',
      '> Attempting anonymous login...',
      '> Anonymous login rejected — credentials required',
      '> Testing default FTP credentials...',
      '> Checking for known vsftpd vulnerabilities...',
    ];
  }

  // ── SMTP ──────────────────────────────────────────────────────────────
  if (p.includes('smtp') || p.includes('mail') || p.includes('vrfy') || p.includes('relay')) {
    return [
      '> Connecting to SMTP service on port 25...',
      '> Server banner: Postfix ESMTP',
      '> Sending EHLO to enumerate supported commands...',
      '> VRFY command enabled — testing user enumeration...',
      '> Checking for open relay configuration...',
      '> Testing CRLF injection in MAIL FROM header...',
    ];
  }

  // ── Webhook / payment forgery ─────────────────────────────────────────
  if (p.includes('webhook') || p.includes('stripe') || p.includes('payment') || p.includes('replay')) {
    return [
      '> Crafting forged webhook payload...',
      '> Sending request with manipulated signature header...',
      '> Signature verification failed — analyzing timing...',
      '> Measuring response time delta for timing attack...',
      '> Testing with leaked test-mode signing secret...',
      '> Checking for event replay protections...',
    ];
  }

  // ── Vulnerability scanning ────────────────────────────────────────────
  if (p.includes('vuln scan') || p.includes('vulnerability scan')) {
    return [
      `> Running vulnerability scan against ${nodeTitle}...`,
      '> Checking server headers for information disclosure...',
      '> Testing for known CVEs on detected services...',
      '> Probing for default credentials on admin interfaces...',
      '> Compiling vulnerability report...',
    ];
  }

  // ── Technology fingerprinting ─────────────────────────────────────────
  if (p.includes('fingerprint') || p.includes('technolog')) {
    return [
      `> Fingerprinting technologies on ${nodeTitle}...`,
      '> Analyzing HTTP response headers...',
      '> Detected: nginx/1.24.0, Express.js, Node.js',
      '> Identifying cookie patterns and session handling...',
      '> Cross-referencing versions with vulnerability databases...',
    ];
  }

  // ── Privilege escalation / admin ──────────────────────────────────────
  if (p.includes('admin') || p.includes('privilege') || p.includes('escalat') || p.includes('employee')) {
    return [
      '> Inspecting current session privileges...',
      '> Current role: "user" — targeting elevation...',
      '> Crafting request with modified role parameters...',
      '> Sending escalation payload to target endpoint...',
      '> Analyzing server response for access change...',
    ];
  }

  // ── DNS / recon ───────────────────────────────────────────────────────
  if (p.includes('dns') || p.includes('lookup') || p.includes('recon') || p.includes('subdomain')) {
    return [
      '> Querying DNS records...',
      '> Resolving A, MX, and NS records...',
      '> Enumerating subdomains via certificate transparency logs...',
      '> Checking for zone transfer (AXFR)...',
      '> Compiling reconnaissance results...',
    ];
  }

  // ── Export / download / data exfiltration ──────────────────────────────
  if (p.includes('export') || p.includes('download') || p.includes('exfil') || p.includes('data')) {
    return [
      '> Requesting data export from target endpoint...',
      '> Export job queued — polling for completion...',
      '> Checking export ID format for predictability...',
      '> Testing access controls on download URL...',
      '> Analyzing export endpoint for authorization flaws...',
    ];
  }

  // ── Profile / account info ────────────────────────────────────────────
  if (p.includes('profile') || p.includes('account') || p.includes('user info') || p.includes('disclosure') || p.includes('information leak')) {
    return [
      `> Querying profile endpoint on ${nodeTitle}...`,
      '> Inspecting response fields for sensitive data...',
      '> Checking for internal field leakage (user_type, password hash)...',
      '> Comparing authenticated vs. public response fields...',
      '> Analyzing information disclosure risk...',
    ];
  }

  // ── Contact / email change / account takeover ─────────────────────────
  if (p.includes('contact') || p.includes('email change') || p.includes('phone') || p.includes('account takeover') || p.includes('takeover')) {
    return [
      '> Sending contact update request to target endpoint...',
      '> Checking if email change requires verification...',
      '> Verification required — testing for bypass...',
      '> Checking CSRF protections on update endpoint...',
      '> Analyzing account takeover vectors...',
    ];
  }

  // ── Notification / settings manipulation ──────────────────────────────
  if (p.includes('notification') || p.includes('preference') || p.includes('setting') || p.includes('toggle')) {
    return [
      '> Sending preference update to target endpoint...',
      '> Testing for mass assignment with extra fields...',
      '> Strict schema validation — unknown fields rejected',
      '> Checking for parameter pollution...',
      '> Analyzing response for privilege escalation vectors...',
    ];
  }

  // ── Support / ticket / social engineering ─────────────────────────────
  if (p.includes('support') || p.includes('ticket') || p.includes('social engineer') || p.includes('phish') || p.includes('markdown')) {
    return [
      '> Submitting crafted ticket to support portal...',
      '> Injecting HTML payload via Markdown body...',
      '> Checking if payload renders in agent dashboard...',
      '> Evaluating CSP: script-src \'self\' — inline scripts blocked',
      '> Testing alternative injection vectors...',
      '> Analyzing sandboxing of rendered content...',
    ];
  }

  // ── Order / purchase manipulation ─────────────────────────────────────
  if (p.includes('order') || p.includes('purchase') || p.includes('cart') || p.includes('checkout') || p.includes('discount')) {
    return [
      '> Querying order history endpoint...',
      '> Testing for order ID enumeration (sequential IDs)...',
      '> Checking access controls across user boundaries...',
      '> Testing price manipulation in checkout flow...',
      '> Analyzing discount code validation...',
    ];
  }

  // ── Generic HTTP request ──────────────────────────────────────────────
  if (p.includes('request') || p.includes('post') || p.includes('api') || p.includes('endpoint') || p.includes('http')) {
    return [
      `> Sending HTTP request to ${nodeTitle}...`,
      '> Inspecting response headers...',
      '> Analyzing response body for sensitive data...',
      '> Checking for information disclosure in error messages...',
      '> Parsing response for actionable findings...',
    ];
  }

  // ── Port scan (generic) ───────────────────────────────────────────────
  if (p.includes('port') || p.includes('scan') || p.includes('service detection')) {
    return [
      `> Scanning ports on ${nodeTitle}...`,
      '> Probing TCP ports 1-65535...',
      '> Discovered open ports: 21, 80, 443, 6379',
      '> Running service version detection...',
      '> Fingerprinting service banners...',
    ];
  }

  // ── Enumeration (generic) ─────────────────────────────────────────────
  if (p.includes('enum') || p.includes('discover') || p.includes('list') || p.includes('parameter') || p.includes('analysis') || p.includes('analyz')) {
    return [
      `> Enumerating ${nodeTitle}...`,
      '> Testing with unexpected field names...',
      '> Analyzing error messages for information leakage...',
      '> Mapping available parameters and behaviors...',
      '> Compiling enumeration results...',
    ];
  }

  // ── Generic fallback ──────────────────────────────────────────────────
  return [
    `> Connecting to ${nodeTitle}...`,
    '> Crafting request payload...',
    '> Sending request to target endpoint...',
    '> Analyzing server response...',
    '> Processing results...',
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
