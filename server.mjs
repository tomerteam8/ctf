import express from 'express';
import cors from 'cors';
import { execFile } from 'child_process';

const app = express();
app.use(cors());
app.use(express.json());

const CLAUDE_PATH = '/Users/itamar/.local/bin/claude';

app.post('/api/prompt', (req, res) => {
  const { systemPrompt, messages } = req.body;

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
        console.error('stderr:', stderr);
        return res.status(500).json({ error: err.message });
      }

      res.json({ response: stdout.trim() });
    }
  );
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Claude proxy server running on http://localhost:${PORT}`);
});
