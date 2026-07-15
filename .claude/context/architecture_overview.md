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
                                                 │  ─► OpenRouter GPT-5.1 (ALL AI calls)
                                                 │  ─► Soniox (audio transcription)
```

- **Frontend:** React 19 + React Router. All UI code is in `src/`.
- **Backend:** single-file Express server at `src/server.ts`, run via `tsx` (no build step).
- **Databases:**
  - **Railway Postgres** — this project's own DB. Stores `generated_practice_questions` (106 rows across 53 pairs) and `teacher_practice_attempts` (every scenario submission + every roleplay turn saved forever). Full connection details in `.env.local`.
  - **NIETE FDE Postgres** — read-only, `fde_production` schema. Source of truth for observations, teachers, schools, regions, scorecard. Loaded fully into memory at boot (~2,487 observations, 558 teachers, 150 schools, 7 regions).
- **AI:** unified on **OpenRouter · `openai/gpt-5.1`** for every AI call — question generation, training matcher, response evaluator, dynamic roleplay. Anthropic SDK is imported but only used for a legacy fallback branch in question generation (inert in production config).

## Boot sequence (`src/server.ts`)

1. Load env from `.env.local`.
2. Read JSON data files: `trainings.json`, `evaluationRubric.json`, `questionGenerationPrompt.json`, `contextualTrainingData.json`, `indicator-priority-matrix.json`, `simulations.json`, `practiceQuestions.json`.
3. Parse the FICO V3 rubric markdown (`.claude/context/fico_v3_indicator_rubric.md`) into an in-memory map: 21 AI-led indicators with full YES/PARTIAL/NO criteria.
4. Load the roleplay prompt template (`.claude/context/roleplay_prompt.md`) into memory — source of truth for `/api/roleplay` behavior.
5. Configure Railway PG client.
6. If `FDE_DATABASE_*` env vars are set, configure the NIETE FDE pool (port 2344, SSL required).
7. Connect to Railway, load ~500 legacy observations + tier-progression rows into memory, create `teacher_practice_attempts` table (idempotent CREATE + ALTER migrations), close the connection.
8. If NIETE pool is active:
   - `loadFdeIndicatorStats()` — computes per-indicator YES/PARTIAL/NO counts across all completed FICO V3 observations, logs miss-rate per indicator (e.g. "L2: 86.1% miss rate n=908").
   - `loadNieteObservations()` — joins `coaching_observation` × `users_teacherprofile` × `users_user` × `schools_school` × `schools_schoolregion` × `lesson_plan_corelessonplan`, plus derives per-observation `improvement_areas` and `results_json.section_b` from the scored answers. All 2,487 completed FICO V3 rows land in `nieteObsCache`.
9. Start Express on `PORT=3001`.

## Two user surfaces

### `/` — TestPage (teacher-facing prototype)

**Cascading landing page — Region → School → Teacher → Observation:**

1. Load regions (from `nieteObsCache` via `/api/niete/regions`)
2. Region select → load schools in that region (`/api/niete/schools?region=X`)
3. School select → load teachers in that school (`/api/niete/teachers?schoolId=X`)
4. Teacher select → load their observations (`/api/niete/teacher/:id/observations`)
5. Observation click → server picks the highest-priority flagged indicator on THAT observation (`/api/niete/observation/:id/highest-priority-indicator`)
6. Opens `FeedbackTrainingModule` with `teacherId`, `indicatorCode`, and `observationId` (so the matcher pins to this exact observation)
7. Matcher runs (via `/api/training/:code/for-teacher/:teacherId?observationId=X`) — reads THIS observation's feedback text and picks the best training video
8. Trainee watches video → picks practice mode:
   - **Scenario Questions** (`PracticeFlow`) — 2 short scenarios, response evaluated with coaching nudge
   - **Roleplay** (`SimulationFlow`) — dynamic AI student in a Pakistani classroom, up to 3 turns, coaching feedback at the end

### `/pipeline` — PipelinePage (authoring surface)

For content authors to generate + save practice questions per (indicator × training) pair. Uses OpenRouter/GPT-5.1. Full details in `question_generation_pipeline.md`.

## Persistence model

Every response and every coaching feedback gets saved to `teacher_practice_attempts`:

- **Scenario mode** — one row per submitted question (response text + evaluation JSON)
- **Roleplay mode** — one row per session, upserted turn-by-turn via `session_id`. Every teacher/student message added to `conversation_history`. If teacher abandons mid-session, whatever turns completed are still saved. `evaluation` populated on final turn with `ending` (PASS or FINAL) + coaching feedback.

Details in `database_schema.md`.

## Data files (`src/data/`)

| File | Role |
|---|---|
| `trainings.json` | Master mapping: indicator → training resources (code, title, url, rationale). 21 indicators, 44 unique training videos. |
| `evaluationRubric.json` | FICO V3 YES/PARTIAL/NO criteria per indicator — consumed by `/api/evaluate` |
| `questionGenerationPrompt.json` | System prompt + provider config for question generation (`provider: openrouter`, `model: openai/gpt-5.1`) |
| `contextualTrainingData.json` | Failure-rate context per indicator (used to season generation prompts) |
| `indicator-priority-matrix.json` | Tier structure — which indicators unlock at which teacher tier |
| `simulations.json` | Legacy static roleplay configs (no longer read at runtime — `/api/roleplay` uses the prompt template instead) |

## Context references (`.claude/context/`)

| Doc | Covers |
|---|---|
| `architecture_overview.md` | This file — system shape, boot sequence, both user surfaces |
| `landing_page_flow.md` | The NIETE cascading landing page (Region → School → Teacher → Observation) |
| `question_generation_pipeline.md` | End-to-end question generation → save → practice → evaluate flow |
| `matcher_and_evaluator.md` | How the training matcher and response evaluator work + coaching-feedback rules |
| `roleplay_prompt.md` | Source of truth for `/api/roleplay` — the prompt template loaded at boot |
| `database_schema.md` | Full DB schema for `generated_practice_questions` + `teacher_practice_attempts` |
| `database_niete_fde.md` | NIETE FDE reference — connection, schema, query patterns |
| `fico_v3_indicator_rubric.md` | The FICO V3 rubric — 21 AI-led indicators with YES/PARTIAL/NO criteria |
| `indicator_training_mapping.md` | Which trainings map to which indicators, escalation ranking rationale |
| `feedback_threshold_framework.md` | 4-tier progression, when to escalate to coach, feedback caps |
| `api_credentials.md` | Where every credential lives, what each is used for |
| `fde_database_credentials.md` | Same for FDE-specific vars |
| `question_generation_prompt.md` | History of question-gen prompt iterations |

## API surface (endpoints)

**Landing page (NIETE cascading):**
- `GET /api/niete/regions`
- `GET /api/niete/schools?region=X`
- `GET /api/niete/teachers?schoolId=X`
- `GET /api/niete/teacher/:id/observations`
- `GET /api/niete/observation/:id`
- `GET /api/niete/observation/:id/highest-priority-indicator`
- `GET /api/niete/observation/:id/feedback`

**Legacy Railway (still supported, merges with NIETE where teacher_id overlaps):**
- `GET /api/teachers-with-observations`
- `GET /api/teacher/:id/observations`  ← merges Railway + NIETE
- `GET /api/teacher/:id/flagged-indicators`
- `GET /api/teacher/:id/highest-priority-indicator`

**Training + practice:**
- `GET /api/training/:code/for-teacher/:teacherId` ← accepts `?observationId=` to pin the matcher
- `GET /api/training/:code`
- `GET /api/practice/:code` ← accepts `?trainingCode=` for training-scoped questions

**AI-driven:**
- `POST /api/generate-questions` (OpenRouter · gpt-5.1)
- `POST /api/save-questions`
- `POST /api/evaluate` (scores response + coaching nudge; persists attempt)
- `POST /api/simulate` (legacy per-turn simulation)
- `POST /api/roleplay` (dynamic prompt-driven, session upsert)

**Audio:**
- `POST /api/upload-audio`
- `POST /api/transcribe`
- `GET /api/transcription/:id/status`
- `GET /api/transcription/:id/transcript`

## Where to start when picking up this project

1. Get `.env.local` from a teammate — 5 credential groups: `PG*`, `OPENROUTER_API_KEY`, `SONIOX_API_KEY`, `FDE_DATABASE_*`, optionally `ANTHROPIC_API_KEY` for the inert legacy fallback.
2. `npm install`
3. `npm run dev:api` → server starts on 3001. Watch the boot log for the green checks:
   - `[DEBUG] FICO rubric loaded: 26 indicators, 21 with descriptions`
   - `[DEBUG] Roleplay prompt loaded: XXXX chars`
   - `[DEBUG] NIETE FDE pool configured`
   - `✅ teacher_practice_attempts table ready`
   - `[DEBUG] NIETE observations loaded: 2487 obs · 558 teachers · 150 schools · 7 regions`
4. `npm run dev` (another terminal) → Vite on 5173
5. Open http://localhost:5173 → pick a region → a school → a teacher → an observation → walk the training + practice loop.
