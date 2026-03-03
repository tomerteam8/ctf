/**
 * Local Claude CLI proxy server — DEVELOPER USE ONLY.
 *
 * Each request spawns a fresh `claude -p` invocation. The system prompt
 * already contains all context (current node, available actions, player
 * assets) so no session persistence is needed.
 *
 * Prerequisites:
 *   - Claude Code CLI installed (https://docs.anthropic.com/en/docs/claude-code)
 *   - VITE_LLM_PROVIDER=local in your .env
 *
 * Usage:
 *   node server.mjs
 *
 * Logs are written to server.log in the project root.
 */

import express from 'express';
import cors from 'cors';
import { execFileSync, execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = path.join(__dirname, 'server.log');

function log(level, message, extra) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${level}: ${message}${extra ? '\n  ' + JSON.stringify(extra) : ''}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

if (process.env.NODE_ENV === 'production') {
  log('ERROR', 'The local Claude proxy is for development only. Do not run in production.');
  process.exit(1);
}

let CLAUDE_PATH;
try {
  CLAUDE_PATH = execFileSync('which', ['claude'], { encoding: 'utf-8' }).trim();
} catch {
  log('ERROR', '`claude` CLI not found in PATH. Install it first: https://docs.anthropic.com/en/docs/claude-code');
  process.exit(1);
}

log('INFO', `Using Claude CLI at: ${CLAUDE_PATH}`);

// Clean env for child processes
const childEnv = { ...process.env };
delete childEnv.CLAUDECODE;

// ---------------------------------------------------------------------------
// Claude invocation
// ---------------------------------------------------------------------------

function runClaude(prompt) {
  return new Promise((resolve, reject) => {
    const child = execFile(CLAUDE_PATH, [
      '--output-format', 'stream-json',
      '--verbose',
      '-p', '-',
    ], {
      env: childEnv,
      timeout: 180000,
      maxBuffer: 4 * 1024 * 1024,
    }, (err, stdout) => {
      if (err) return reject(err);

      const lines = stdout.split('\n').filter(Boolean);
      let resultText = null;

      for (const line of lines) {
        try {
          const obj = JSON.parse(line);
          if (obj.type === 'result' && obj.result) {
            resultText = obj.result;
          }
        } catch {
          // skip malformed lines
        }
      }

      if (resultText !== null) {
        resolve(resultText);
      } else {
        reject(new Error('No result in Claude output'));
      }
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

const app = express();

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      cb(null, true);
    } else {
      log('WARN', `CORS blocked origin: ${origin}`);
      cb(new Error(`CORS blocked: ${origin}`));
    }
  },
}));

app.use(express.json({ limit: '64kb' }));

app.post('/api/prompt', async (req, res) => {
  const { systemPrompt, messages } = req.body;

  if (!systemPrompt || !Array.isArray(messages)) {
    log('WARN', 'Bad request: missing systemPrompt or messages');
    return res.status(400).json({ error: 'Invalid request. Please contact the developer and refer them to server.log.' });
  }

  const userMsg = messages[messages.length - 1]?.content || '(empty)';
  log('INFO', `Prompt received — user: "${userMsg.slice(0, 80)}${userMsg.length > 80 ? '...' : ''}"`);

  const fullPrompt = [
    systemPrompt,
    '',
    '--- Conversation history ---',
    ...messages.map((m) => `${m.role}: ${m.content}`),
  ].join('\n');

  const startTime = Date.now();

  try {
    const text = await runClaude(fullPrompt);
    const elapsed = Date.now() - startTime;

    // Parse and validate JSON before sending to the frontend.
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const fenceMatch = text.match(/```(?:\w*)\s*\n([\s\S]*?)\n```/);
      if (fenceMatch) {
        parsed = JSON.parse(fenceMatch[1]);
      } else {
        throw new Error(`Claude returned unparseable response: ${text.slice(0, 200)}`);
      }
    }

    log('INFO', `Claude responded (${elapsed}ms, ${text.length} chars)`);
    res.json({ response: parsed });
  } catch (err) {
    const elapsed = Date.now() - startTime;
    log('ERROR', `Claude CLI failed (${elapsed}ms): ${err.message}`);
    res.status(500).json({ error: 'Something went wrong processing your request. Please contact the developer and refer them to server.log.' });
  }
});

// Bind to loopback only
app.listen(PORT, '127.0.0.1', () => {
  log('INFO', `Claude proxy server running on http://127.0.0.1:${PORT} (dev only)`);
});
