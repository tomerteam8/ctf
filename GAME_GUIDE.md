---
marp: true
theme: default
paginate: true
style: |
  section {
    background: #0d1117;
    color: #e6edf3;
    font-family: 'Courier New', monospace;
  }
  h1 { color: #58a6ff; border-bottom: 1px solid #30363d; padding-bottom: 0.3em; }
  h2 { color: #3fb950; }
  h3 { color: #d2a8ff; }
  strong { color: #ffa657; }
  code { background: #161b22; color: #79c0ff; padding: 2px 6px; border-radius: 4px; }
  blockquote { border-left: 3px solid #388bfd; color: #8b949e; }
  ul li::marker { color: #3fb950; }
  hr { border-color: #30363d; }
  table { border-collapse: collapse; width: 100%; margin-top: 0.5em; }
  th { background: #388bfd; color: #ffffff; border: 1px solid #58a6ff; padding: 8px 14px; text-align: left; font-weight: bold; }
  td { border: 1px solid #484f58; padding: 8px 14px; color: #e6edf3; background: #161b22; }
  tr:nth-child(even) td { background: #21262d; }
---

# ⚡ Pentest Quest
## AI-Assisted Red Team Simulation

You are an attacker equipped with an AI assistant.
Your target: **a real e-commerce company's infrastructure**.

> Use your AI to think, plan, and execute attacks — from the internet all the way to the server room.

---

## How It Works

- You interact with **nodes** — servers, APIs, and services discovered as you probe deeper
- Type **what you want to do** in plain language — your AI interprets and executes
- Not sure where to start? **Ask for guidance** — the AI will hint at viable paths
- **Assets** you collect (credentials, tokens, API keys) unlock deeper access
- Every node hides actions — some are dead ends, some change everything

> No setup needed — the server is pre-configured with an AI key and **Easy mode** is active.

---

# Stage 1
## From the Internet to the Internal Network

**Goal:** Break out of the public website and gain access to the corporate employee portal.

You start with only a URL: `https://shop.target.com`

---

## Stage 1 — Victory Condition

Gain **employee-level access** to the corporate portal.

```
https://corp.target.com/employee
```

You've crossed from the public internet into the **internal Corporate zone**.

> There is more than one way in.

---

<!-- PLAY STAGE 1 -->

---

# Stage 1 — Wrap-Up

## The Minimal Path

1. **Scanned** the target — found the web app and other exposed services
2. **Enumerated hidden endpoints** — registration, password change, support chat
3. **Registered an account** to unlock authenticated features
4. **Escalated to employee** via one of:
   - SQLi on the password-change endpoint (`user_type` field, raw SQL)
   - Social-engineered the support agent into manually upgrading the account

---

## Stage 1 — What Else Was There

| Action | Impact |
|---|---|
| Probe Redis without credentials | Session key metadata leak |
| Identify weak JWT signing secret | Token forgery potential |
| Flood the support queue | DoS — customer service disrupted |
| Use employee account for purchases | Staff discount — near-free orders |
| Extract DB schema via SQLi | Users table structure exposed |

---

# Stage 2
## Privilege Escalation — From Employee to Admin

**Goal:** You're inside the corporate network. Now go deeper — get admin access.

Explore the internal tools available to employees. Something in there shouldn't exist.

---

## Stage 2 — Victory Condition

Gain **admin credentials** for the corporate portal:

```
https://corp.target.com/admin
```

> You'll need to find a key before you can open the door.

---

<!-- PLAY STAGE 2 -->

---

# Stage 2 — Wrap-Up

## The Minimal Path

1. **Explored the employee portal** — inventory, orders, directory, and a catalog import tool
2. **Abused the import tool (SSRF)** — no URL validation, server fetches anything you give it
3. **Probed the internal network** — discovered helpdesk, wiki, printer, and internal endpoints
4. **Employee Directory** — an IT employee left an Admin API key in a temp file
5. **SSRF + API key** → called the internal admin provisioning endpoint → created admin account

---

## Stage 2 — What Else Was There

| Action | Impact |
|---|---|
| Price manipulation via inventory | Fraudulent near-zero purchases |
| Self-service refunds on own orders | Financial fraud |
| Export all customer orders | 52,847 records with PII |
| Edit internal runbooks on wiki | Operational sabotage |
| Find domain admin password in wiki | Escalation ammunition for Stage 3 |

---

# Stage 3
## Total Takeover — Admin to Infrastructure Control

**Goal:** Cause maximum damage. Exfiltrate everything. Take the organization down.

You have admin access. The admin panel has diagnostic tools. That's your way in.

---

<!-- PLAY STAGE 3 -->

---

# Final Summary
## The Full Attack Chain

```
Internet ──► Perimeter ──► Corporate ──► Management
```

**Stage 1** — SQLi / Social Engineering → Employee account
**Stage 2** — SSRF → API key → Admin account
**Stage 3** — CVE-2024-22116 (Zabbix RCE) → Management server shell → Full infrastructure

---

## What a Real Attacker Would Walk Away With

- **52,847 customer records** — emails, hashed passwords, PII, payment history
- **All service credentials** — AD, Grafana, Jenkins, Veeam — in plaintext
- **Backup encryption keys** — offsite backups now readable and deletable
- **Active Directory control** — every employee and machine in the organization
- **Operational destruction** — destroy AD forest → complete authentication blackout

> No systems remain. No backups work. No one can log in.

---

# Thank You

You are more than welcome to use this for training.

For questions or suggestions, contact **Team8 Cyber** CTO:

**tomer.t@team8.vc**
