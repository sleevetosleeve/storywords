import 'dotenv/config';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Mistral } from '@mistralai/mistralai';
import express from 'express';

const MODEL = 'mistral-large-4';
const PORT = Number(process.env.PORT ?? 3000);

const app = express();
app.use(express.json());

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
app.use(express.static(publicDir));

interface ContinueBody {
  story?: unknown;
  wordToUse?: unknown;
  forbiddenWords?: unknown;
}

app.post('/api/continue', async (req, res) => {
  const { story, wordToUse, forbiddenWords } = (req.body ?? {}) as ContinueBody;

  if (typeof story !== 'string' || story.trim() === '') {
    res.status(400).json({ error: '"The story so far" must not be empty.' });
    return;
  }
  if (typeof wordToUse !== 'string' || wordToUse.trim() === '') {
    res.status(400).json({ error: '"Word to use" must not be empty.' });
    return;
  }
  if (!Array.isArray(forbiddenWords) || forbiddenWords.some((w) => typeof w !== 'string')) {
    res.status(400).json({ error: '"Words not to use" must be a list of words.' });
    return;
  }

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'MISTRAL_API_KEY is not set on the server.' });
    return;
  }

  const mustUse = wordToUse.trim();
  const mustNotUse = forbiddenWords.map((w) => w.trim()).filter((w) => w !== '');

  const systemPrompt = [
    'You are a story-continuation engine.',
    'You reply with ONLY the new story sentences: no preamble, no headings, no commentary, and no quotation marks around the output.',
  ].join(' ');

  const forbiddenRule =
    mustNotUse.length > 0
      ? `1. They must NOT contain any of these words, nor any conjugation, declension, or other inflection of them (for example, if "run" is listed, then "runs", "running", and "ran" are also forbidden): ${mustNotUse.join(', ')}.`
      : '1. There are no forbidden words, so this rule does not apply.';

  const userPrompt = `Continue the story below with one or more new sentences that follow naturally from it.

Hard rules for the new sentences:
${forbiddenRule}
2. They must contain the word "${mustUse}", or a conjugation/inflection of it (for example, if the word is "run", then "runs", "running", or "ran" all count), EXACTLY ONCE in total across all the new sentences.
3. Output only the new sentences themselves.

Story so far:
"""
${story.trim()}
"""`;

  try {
    const client = new Mistral({ apiKey });
    const completion = await client.chat.complete({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      maxTokens: 2048,
      reasoningEffort: 'low',
    });

    const content = completion.choices?.[0]?.message?.content;
    const continuation =
      typeof content === 'string'
        ? content
        : (content ?? []).map((chunk) => ('text' in chunk ? chunk.text : '')).join('');

    if (!continuation.trim()) {
      res.status(502).json({ error: 'The model returned an empty continuation.' });
      return;
    }
    res.json({ continuation: continuation.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error while calling the Mistral API.';
    res.status(502).json({ error: message });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Story continuer listening on http://localhost:${PORT}`);
});
