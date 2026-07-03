# API & Database Credentials — Where They Live

> **DO NOT put credential values in this file.** This file documents *where* credentials live and *how they're used*. Actual values live in `.env.local` (gitignored, `.gitignore` line 28).

## Providers in use

| Provider | Purpose | Env var |
|---|---|---|
| **OpenRouter** | Question generation (`/api/generate-questions`) — model `openai/gpt-5.1` | `OPENROUTER_API_KEY` |
| **Anthropic** | Training-matcher, response evaluator, student simulator | `ANTHROPIC_API_KEY` |
| **Soniox** | Audio transcription | `SONIOX_API_KEY` |
| **Railway PostgreSQL** | Own DB (`generated_practice_questions`, observations) | `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` |
| **NIETE FDE PostgreSQL** | Source of truth for observations, teachers, scorecard | `FDE_DATABASE_HOST`, `FDE_DATABASE_PORT`, `FDE_DATABASE_NAME`, `FDE_DATABASE_USER`, `FDE_DATABASE_PASSWORD` |

## Provider split for AI calls

By design, question **generation** uses OpenRouter/GPT-5.1 while all other AI calls stay on Claude. This gives us:
- Two independent AI providers (redundancy — if one is down, the rest of the app still works)
- Different model strengths for different jobs (GPT-5.1 for creative generation, Claude for precise coaching/evaluation)

Provider selection is controlled by `src/data/questionGenerationPrompt.json`:
```json
"config": {
  "model": "openai/gpt-5.1",
  "provider": "openrouter",
  "maxTokens": 4096,
  "temperature": 0.7
}
```

Setting `provider` back to `anthropic` (or any non-`openrouter` value) and choosing a Claude model ID falls back to the Anthropic SDK path — the code path is still there.

## OpenRouter specifics

- Endpoint: `https://openrouter.ai/api/v1/chat/completions`
- Auth: `Authorization: Bearer $OPENROUTER_API_KEY`
- Model format: `openai/gpt-5.1` (resolves to the current dated snapshot server-side, e.g. `openai/gpt-5.1-20251113`)
- Response shape: OpenAI-compatible — `data.choices[0].message.content`

## NIETE FDE specifics

- Port: `2344`
- SSL: Required (`rejectUnauthorized: false` because the cert is self-signed)
- Driver: `pg` `Pool`, separate config fields (not a connection string — password contains URL-reserved characters like `+`, `^`, `&`, `@`)
- Schema: `fde_production`
- Access: Read-only

## Why credentials are NOT in this file

Markdown files in `.claude/context/` are:
- Not gitignored — they would be committed if `git add` is run.
- Frequently pasted into LLM contexts, screenshots, or shared with teammates.
- Synced to other devices through cloud backups or repo clones.

Plaintext keys or passwords in any of those surfaces is a credential leak. `.env.local` is the only correct place.

## If any credential needs rotation

1. Update `.env.local` with the new value.
2. Restart `npm run dev:api`.
3. Confirm the startup log shows the expected connections (`NIETE FDE pool configured`, `📊 X observations ready`, etc.) and hit `/api/health` or `/api/generate-questions` to smoke-test the new key.
