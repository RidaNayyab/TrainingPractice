# Architecture Overview

Digital Coach — AI-powered teacher training + practice + evaluation system.

## High-level shape

Two runtime processes plus external services:

```
┌─────────────────────────┐        ┌─────────────────────────┐
│   Vite dev server       │        │   Node/Express API      │
│   localhost:5173        │◄──────►│   localhost:3001        │
│   React 19 + Router     │        │   src/server.ts (tsx)   │
└─────────────────────────┘        └────────────┬────────────┘
        │                                        │
        │ Two frontend routes:                   │ External calls:
        │  /          → TestPage (teacher flow)  │  ─► Railway Postgres (own DB)
        │  /pipeline  → PipelinePage (authoring) │  ─► NIETE FDE Postgres (read-only)
                                                 │  ─► OpenRouter (question generation)
                                                 │  ─► Anthropic (matcher, evaluator, simulator)
                                                 │  ─► Soniox (audio transcription)
```

- **Frontend:** React 19 + React Router. All UI code is in `src/`.
- **Backend:** single-file Express server at `src/server.ts`, run via `tsx` (no build step). Boots by loading data files, connecting to Railway Postgres, probing NIETE FDE, then serving REST endpoints.
- **Databases:**
  - **Railway Postgres** (this project's own DB) — stores `generated_practice_questions` and cached observations. Full connection details in `.env.local`.
  - **NIETE FDE Postgres** (read-only, `fde_production` schema) — source of truth for observations, teachers, scorecard. Used at startup to compute per-indicator failure rates.

## Boot sequence (`src/server.ts`)

1. Load env from `.env.local`.
2. Read JSON data files: `trainings.json`, `evaluationRubric.json`, `questionGenerationPrompt.json`, `contextualTrainingData.json`, `indicator-priority-matrix.json`, `simulations.json`, `practiceQuestions.json`.
3. Parse the FICO V3 rubric markdown (`.claude/context/fico_v3_indicator_rubric.md`) into an in-memory map: 21 AI-led indicators with full YES/PARTIAL/NO criteria.
4. Configure Railway PG client.
5. If `FDE_DATABASE_*` env vars are set, configure the NIETE FDE pool (port 2344, SSL required).
6. Connect to Railway, load ~500 observations + tier-progression rows into memory, close the connection.
7. If NIETE pool is active, run the aggregate query to compute failure-rate stats per indicator across all completed FICO V3 observations (~2,600 rows). Log per-indicator miss rates.
8. Start Express on `PORT=3001`.

## Two user surfaces

### `/` — TestPage (teacher-facing prototype)

Select a teacher → see their observations → click one → the system:
1. Fetches the flagged indicators (from cached observations)
2. Picks the highest-priority one via `priorityMatrix`
3. Opens `FeedbackTrainingModule` which:
   - Fetches training (via `/api/training/:code/for-teacher/:teacherId` — this is where the **AI matcher** picks a specific training video from the mapped set based on the teacher's most recent feedback)
   - Fetches the practice questions for THAT specific training (via `/api/practice/:code?trainingCode=…` — scoped so each teacher's questions match their picked video)
   - Renders the training video, then practice questions, then evaluation with coaching nudge

### `/pipeline` — PipelinePage (authoring surface)

For content authors to generate + save practice questions per (indicator × training) pair. Uses OpenRouter/GPT-5.1. Details in `question_generation_pipeline.md`.

## Data files (`src/data/`)

| File | Role |
|---|---|
| `trainings.json` | Master mapping: indicator → training resources (code, title, url, rationale). 21 indicators, 44 unique training videos. |
| `evaluationRubric.json` | FICO V3 YES/PARTIAL/NO criteria per indicator — consumed by `/api/evaluate` |
| `questionGenerationPrompt.json` | System prompt + provider config for question generation (`provider: openrouter`, `model: openai/gpt-5.1`) |
| `contextualTrainingData.json` | Failure-rate context per indicator (used to season generation prompts) |
| `indicator-priority-matrix.json` | Tier structure — which indicators unlock at which teacher tier |
| `simulations.json` | Legacy AI-student conversation scenarios (fallback when no generated questions exist for a training) |

## Context references (`.claude/context/`)

- `fico_v3_indicator_rubric.md` — canonical rubric, parsed at boot
- `indicator_training_mapping.md` — the design doc that defined which trainings map to which indicators + escalation ranking rationale
- `feedback_threshold_framework.md` — 4-tier progression, when to escalate to coach, feedback caps
- `database_niete_fde.md` — NIETE FDE schema, SQL patterns, gotchas
- `question_generation_prompt.md` — history of question-gen prompt iterations
- `api_credentials.md` — where every credential lives (env var names only, not values)
- `fde_database_credentials.md` — same idea for FDE-specific vars

## External AI providers

Deliberately split across two providers for redundancy and per-task fit:

| Endpoint | Provider · Model |
|---|---|
| `/api/generate-questions` | **OpenRouter · openai/gpt-5.1** |
| `matchTrainingToFeedback` (called by `/api/training/:code/for-teacher/…`) | Anthropic · claude-opus-4-7 |
| `/api/evaluate` (scoring + coaching feedback) | Anthropic · claude-opus-4-7 |
| `/api/simulate` (AI student for simulation flow) | Anthropic · claude-opus-4-7 |

Provider selection for question generation is config-driven via `questionGenerationPrompt.json` — flip `provider` from `openrouter` to `anthropic` to fall back to Claude.

## Where to start when picking up this project

1. Read `.env.local` (via a teammate or password manager) and confirm the 5 credential groups are present: `PG*`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `FDE_DATABASE_*`, `SONIOX_API_KEY`.
2. `npm install`
3. `npm run dev:api` → server starts on 3001, watch the boot log for green checks (Railway connect, FICO rubric parsed, FDE stats loaded)
4. `npm run dev` (in another terminal) → Vite serves on 5173
5. Open http://localhost:5173 to walk the teacher flow, or http://localhost:5173/pipeline for authoring
