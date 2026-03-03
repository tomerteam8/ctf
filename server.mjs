/**
 * Local Claude CLI proxy server — DEVELOPER USE ONLY.
 *
 * This server shells out to the `claude` CLI on your machine. It should
 * never be deployed to production or exposed beyond localhost.
 *
 * Prerequisites:
 *   - Claude Code CLI installed (https://docs.anthropic.com/en/docs/claude-code)
 *   - VITE_LLM_PROVIDER=local in your .env
 *
 * Usage:
 *   node server.mjs
 */

import express from 'express';
import cors from 'cors';
import { execFile } from 'child_process';
import { execSync } from 'child_process';

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

if (process.env.NODE_ENV === 'production') {
  console.error('ERROR: The local Claude proxy is for development only. Do not run in production.');
  process.exit(1);
}

// Resolve claude CLI path dynamically
let CLAUDE_PATH;
try {
  CLAUDE_PATH = execSync('which claude', { encoding: 'utf-8' }).trim();
} catch {
  console.error(
    'ERROR: `claude` CLI not found in PATH.\n' +
    'Install it first: https://docs.anthropic.com/en/docs/claude-code'
  );
  process.exit(1);
}

console.log(`Using Claude CLI at: ${CLAUDE_PATH}`);

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

const app = express();

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, server-to-server) in dev
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error(`CORS blocked: ${origin}`));
    }
  },
}));

app.use(express.json({ limit: '64kb' }));

app.post('/api/prompt', (req, res) => {
  const { systemPrompt, messages } = req.body;

  if (!systemPrompt || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing systemPrompt or messages' });
  }

  const fullPrompt = [
    systemPrompt,
    '',
    '--- Conversation history ---',
    ...messages.map((m) => `${m.role}: ${m.content}`),
  ].join('\n');

  execFile(
    CLAUDE_PATH,
    ['-p', fullPrompt, '--output-format', 'text'],
    { timeout: 60000, maxBuffer: 1024 * 1024 },
    (err, stdout, stderr) => {
      if (err) {
        console.error('Claude CLI error:', err.message);
        if (stderr) console.error('stderr:', stderr);
        return res.status(500).json({ error: err.message });
      }

      res.json({ response: stdout.trim() });
    }
  );
});

// Bind to loopback only — never expose to the network
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Claude proxy server running on http://127.0.0.1:${PORT} (dev only)`);
});
