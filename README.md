# TrainingPractice — Digital Coach

AI-powered teacher training + practice + evaluation system. Teachers receive personalised training videos based on their observation feedback, practice against generated scenarios, and get coaching-style evaluations with a forward-looking nudge.

## What this app does

Given an observation of a classroom lesson and a coach's feedback, the system:

1. **Diagnoses** which FICO V3 indicators the teacher is failing (e.g. SI1 = Instructional Clarity, PIC-4 = Quality Questioning, L1 = Explicit Phonics).
2. **Picks** a specific training video for the highest-priority indicator by reading the coach's actual prescription in the feedback (not defaulting to the broadest option).
3. **Serves** the teacher a short training video and 2 practice questions **specifically generated for that (indicator × training) pair**.
4. **Evaluates** their written response against both the FICO indicator rubric and the question-specific rubric, returning a YES / PARTIAL / NO score and a 2-sentence coaching nudge in peer-to-peer teacher tone.

## Two user surfaces

- **`/` (TestPage)** — teacher-facing prototype. Pick a teacher, click an observation, walk through training → practice → coaching feedback.
- **`/pipeline` (PipelinePage)** — authoring surface for creating practice questions. Pick an indicator + training + learning outcome; GPT-5.1 generates 2 tight, rubric-anchored questions; save to Railway Postgres.

## Stack

- **Frontend:** React 19 + React Router, Vite dev server on `:5173`
- **Backend:** Express in a single `src/server.ts` file, run via `tsx` on `:3001` (no build step)
- **Storage:**
  - Railway Postgres — this app's own DB (`generated_practice_questions` table, cached observations)
  - NIETE FDE Postgres (read-only) — source of truth for observations, teachers, scorecard
- **AI:**
  - OpenRouter · `openai/gpt-5.1` — question generation
  - Anthropic · `claude-opus-4-7` — training matcher, response evaluator, AI-student simulator
  - Soniox — audio transcription

## Getting started

### 1. Install

```bash
npm install
```

### 2. Set up `.env.local` (never committed — see `.gitignore`)

Required env vars (values live only in `.env.local`, never in tracked files):

```
# Own DB (Railway Postgres)
PGHOST=<railway host>
PGPORT=<railway port>
PGUSER=postgres
PGPASSWORD=<railway password>
PGDATABASE=railway

# App runtime
API_PORT=3001
NODE_ENV=development

# AI providers
ANTHROPIC_API_KEY=<anthropic key>
OPENROUTER_API_KEY=<openrouter key>
SONIOX_API_KEY=<soniox key>

# NIETE FDE Postgres (read-only, SSL required)
FDE_DATABASE_HOST=<fde host ip>
FDE_DATABASE_PORT=2344
FDE_DATABASE_NAME=<fde db name>
FDE_DATABASE_USER=<fde readonly user>
FDE_DATABASE_PASSWORD=<fde password>
```

Ask a teammate for values. See `.claude/context/api_credentials.md` for what each var is used for.

### 3. Run

Two terminals:

```bash
npm run dev:api     # API on :3001
npm run dev         # Vite on :5173
```

Open http://localhost:5173.

### 4. Confirm the boot log

The API log should show green checks for all major connections:

```
[DEBUG] FICO rubric loaded: 26 indicators, 21 with descriptions
[DEBUG] Priority Matrix Loaded: SI1=1, SI3=2
[DEBUG] NIETE FDE pool configured (host=..., port=2344, db=...)
✅ Loaded 494 observations (Railway)
✅ Loaded tier data for 214 teachers
[DEBUG] NIETE FDE stats loaded for 21 indicators across 129 score rows
🚀 Server running on http://localhost:3001
```

If NIETE stats are missing, the FDE env vars aren't set — the app still runs but generation prompts won't include real failure-rate context.

## Documentation

All architecture notes and design decisions live in `.claude/context/`:

| File | What it covers |
|---|---|
| [architecture_overview.md](.claude/context/architecture_overview.md) | High-level system shape, boot sequence, both user surfaces |
| [question_generation_pipeline.md](.claude/context/question_generation_pipeline.md) | Every endpoint in the generate → save → practice → evaluate flow |
| [matcher_and_evaluator.md](.claude/context/matcher_and_evaluator.md) | How the training matcher and response evaluator work + coaching-feedback rules |
| [database_schema.md](.claude/context/database_schema.md) | `generated_practice_questions` schema, invariants, current inventory (53 pairs × 2) |
| [fico_v3_indicator_rubric.md](.claude/context/fico_v3_indicator_rubric.md) | The full FICO V3 rubric — 21 indicators with YES/PARTIAL/NO criteria (parsed at server boot) |
| [indicator_training_mapping.md](.claude/context/indicator_training_mapping.md) | Which trainings map to which indicators + escalation ranking rationale |
| [feedback_threshold_framework.md](.claude/context/feedback_threshold_framework.md) | 4-tier teacher progression, when to escalate to coach, feedback caps |
| [database_niete_fde.md](.claude/context/database_niete_fde.md) | NIETE FDE schema + SQL patterns for pulling observations |
| [api_credentials.md](.claude/context/api_credentials.md) | Where every credential lives and what it does |
| [question_generation_prompt.md](.claude/context/question_generation_prompt.md) | History of question-generation prompt iterations |

## Design invariants worth knowing

Non-obvious things that will trip you up if you miss them:

1. **question_id format is `{indicator}-{training}-q{n}`** — not just `{training}-q{n}`. This is the source of truth for uniqueness across indicators sharing a training video (e.g. `PP_02_05` is under M2, S1, and S2, each with independent rows).
2. **Practice questions are training-scoped, not indicator-scoped.** `/api/practice/SI1?trainingCode=PP_00_01` returns only the 2 questions for that specific training. Without `trainingCode` it returns the full indicator pool (used only for authoring/legacy).
3. **The matcher reads only the indicator-specific section of the coach's feedback**, not the whole blob. Without this scoping the model defaults to the broadest / lowest-level option.
4. **The FICO rubric markdown is the source of truth**, not `evaluationRubric.json`. The server parses `.claude/context/fico_v3_indicator_rubric.md` at boot and injects the indicator's full YES/PARTIAL/NO criteria into generation and evaluation prompts. If you need to update rubric content, edit the markdown.
5. **The `training_title` column stores the indicator display name**, not the training resource title. This is what the practice UI shows above the video. Set from `trainings[indicatorCode].name` in the save endpoint.
6. **PIC-2 and PIA-4 are designed GAPs** — no LO exists for them. They appear in `trainings.json` with `isGap: true, resources: []`.

## Data inventory (as of last audit)

- 21 indicators total (19 with content + 2 designed gaps)
- 53 (indicator × training) pairs covered — 4 skipped by design (PIC-3 science, PIA-2 literacy)
- **106 practice question rows in Railway `generated_practice_questions`** — exactly 2 per pair, no duplicates, no orphans

See [database_schema.md](.claude/context/database_schema.md) for the full per-indicator breakdown.

## License

Internal Taleemabad project. Not for external distribution.
