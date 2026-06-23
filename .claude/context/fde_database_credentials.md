# NIETE FDE Database — Credentials Location

> **DO NOT put credential values in this file.** This file documents *where* the credentials live and *what shape* they take. Actual values live in `.env.local` (gitignored).

## Where credentials live

All NIETE FDE credentials are stored in `.env.local` at the project root. That file is gitignored (see `.gitignore` line 28: `.env.local`) and never leaves your machine.

## Required env vars

| Variable | Purpose |
|---|---|
| `FDE_DATABASE_HOST` | IP / hostname of the NIETE FDE production server |
| `FDE_DATABASE_PORT` | TCP port (always `2344`) |
| `FDE_DATABASE_NAME` | Database name |
| `FDE_DATABASE_USER` | Read-only database user |
| `FDE_DATABASE_PASSWORD` | Password for the read-only user |

The server (`src/server.ts`) also accepts the alternate naming `PROD_FDE_DATABASE_*` as a fallback, to stay compatible with the reference doc at `.claude/context/database_niete_fde.md`.

## Connection facts (non-secret)

- **Port:** 2344
- **SSL:** Required (`rejectUnauthorized: false` because the cert is self-signed)
- **Driver:** `pg` (`Pool`, separate config fields — *not* a connection string — because the password contains URL-reserved characters)
- **Schema:** `fde_production`
- **Access:** Read-only

## How the server uses them

`src/server.ts` builds the pool inside the `// NIETE FDE production pool` block. If any of the four required vars are missing, the pool stays `null` and the server falls back to Railway-only mode (still functional, just without FDE failure-rate context in the question generation prompt).

## If the credentials need to be rotated

1. Update `.env.local` with the new values.
2. Restart `npm run dev:api`.
3. Confirm the startup log shows `[DEBUG] NIETE FDE pool configured (host=..., port=2344, db=...)` followed by `[DEBUG] NIETE FDE stats loaded for N indicators ...`.

## Why credentials are NOT in this file

Markdown files in `.claude/context/` are:
- Not gitignored — they would be committed if `git add` is run.
- Frequently pasted into LLM contexts, screenshots, or shared with teammates.
- Synced to other devices through cloud backups or repo clones.

Plaintext database passwords in any of those surfaces is a credential leak. `.env.local` is the only correct place.
