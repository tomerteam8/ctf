# PETER — Pentest Quest

An interactive cybersecurity CTF simulation where you probe a fictional e-commerce platform by typing free-form attack descriptions. An LLM evaluates each prompt against the selected target node, determining whether your described technique matches a viable attack vector. Chain together reconnaissance, SQL injection, SSRF, and command injection to achieve full system compromise.

## Prerequisites

- **Node.js** 18+
- **npm** (comes with Node.js)
- One of the following LLM backends:
  - [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated (for local mode)
  - An OpenAI API key
  - An Anthropic API key

## Quick Start

```bash
# Install dependencies
npm install

# Copy the environment template
cp .env.example .env

# Start the dev server
npm run dev
```

The app runs at **http://localhost:5173**.

## LLM Configuration

The game needs an LLM to evaluate your attack prompts. Choose one of three providers by setting `VITE_LLM_PROVIDER` in your `.env` file.

### Option 1: Local Claude CLI (default)

Uses the Claude Code CLI installed on your machine. No API key needed — authentication is handled by the CLI itself.

```env
VITE_LLM_PROVIDER=local
```

You must also run the local proxy server in a separate terminal:

```bash
node server.mjs
```

This starts a lightweight Express proxy on `http://127.0.0.1:3001` that spawns `claude -p` for each request. Logs are written to `server.log`.

### Option 2: OpenAI API

Calls the OpenAI API directly from the browser. Requires an API key.

```env
VITE_LLM_PROVIDER=openai
VITE_LLM_MODEL=gpt-4o-mini        # optional, this is the default
```

After starting the app, click the gear icon in the header and enter your OpenAI API key. The key is stored in your browser's localStorage.

### Option 3: Anthropic API

Calls the Anthropic API directly from the browser. Requires an API key.

```env
VITE_LLM_PROVIDER=anthropic
VITE_LLM_MODEL=claude-sonnet-4-20250514   # optional, this is the default
```

After starting the app, click the gear icon in the header and enter your Anthropic API key. The key is stored in your browser's localStorage.

### Switching providers

1. Edit `.env` to set `VITE_LLM_PROVIDER` (and optionally `VITE_LLM_MODEL`)
2. Restart the dev server (`npm run dev`)
3. For `openai` or `anthropic`, enter your API key in the in-app settings

> **Note:** Environment variables prefixed with `VITE_` are baked into the client bundle at build time. You must restart the dev server after changing `.env`.

## Difficulty Levels

Select difficulty from the dropdown in the header.

| Level  | LLM Matching | Asset Guard | Hints |
|--------|-------------|-------------|-------|
| Easy   | Loose — vague prompts accepted | Skipped | Always visible |
| Normal | Moderate — clear technique description needed | Must name asset | After 3 failures |
| Hard   | Strict — exact technique/tool required | Must include asset value | Never shown |

## Build

```bash
npm run build      # TypeScript check + Vite production build → dist/
npm run preview    # Preview the production build locally
```

## Cloudflare Pages Deployment

The repo has the Cloudflare GitHub app installed. Pushes to the production branch trigger automatic builds and deploys on Cloudflare Pages.

### Cloudflare Pages settings

| Setting | Value |
|---------|-------|
| Root directory | `ctf` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Production branch | `dev` |

### Environment variables (set in Cloudflare dashboard → Settings → Environment Variables → Production)

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_LLM_PROVIDER` | `anthropic` | |
| `VITE_ANTHROPIC_API_KEY` | your API key | Click "Encrypt" after entering |
| `NODE_VERSION` | `20` | |

When `VITE_ANTHROPIC_API_KEY` is set at build time, the app uses it automatically and hides the API key input from the UI. The key is baked into the JS bundle, so the deployed site should be protected by [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/) to prevent unauthorized access.
