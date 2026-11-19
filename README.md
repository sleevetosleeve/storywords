# Story Continuer

A minimal web app that continues a story using the Mistral API with the official
TypeScript SDK (`@mistralai/mistralai`), model `mistral-large-4` (Mistral Large 4).

The `MISTRAL_API_KEY` never leaves the server: the browser only talks to the local
Express server, which makes the call to Mistral.

## Fields

- **The story so far** — multiline; the unfinished story.
- **Word to use** — the word (or a conjugation of it) that must appear exactly once in the new sentences.
- **Words not to use** — one word per line; none of these words, nor any conjugation of them, may appear in the new sentences.
- **Continue the story** — button that asks the AI for one or more new sentences.
- **Continuation** — multiline output, empty until the button is pressed.

## Install dependencies

```bash
npm install
```

## Configure the API key

```bash
cp .env.example .env
```

Then edit `.env` and set your key:

```
MISTRAL_API_KEY=your-mistral-api-key-here
```

Get a key from the [Mistral console](https://console.mistral.ai/).

## Run locally

Development (auto-reload, no build step):

```bash
npm run dev
```

Or build and run the compiled JavaScript:

```bash
npm run build
npm start
```

Then open <http://localhost:3000> (set `PORT` in the environment to change the port).

## How it works

- `public/index.html` — the form; on button click it POSTs the three fields to `/api/continue` and fills the continuation box.
- `server/index.ts` — Express server. Serves the static page and exposes `POST /api/continue`, which builds a prompt encoding the constraints (forbidden words and their conjugations; the required word or a conjugation exactly once) and calls `client.chat.complete({ model: 'mistral-large-4', ... })` with the key from `process.env.MISTRAL_API_KEY`.
