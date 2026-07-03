# Database Schema & Data Inventory

## Own DB: Railway Postgres

- **Project:** cooperative-endurance
- **Host / port / db:** in `.env.local` (`PGHOST`, `PGPORT`, `PGDATABASE`)
- **Purpose:** stores this app's own generated practice questions + cached observations

### Table: `generated_practice_questions`

Every practice question the pipeline creates is one row here.

| Column | Type | Notes |
|---|---|---|
| `id` | integer (SERIAL PK) | auto-increment |
| `training_code` | varchar(50) NOT NULL | e.g. `PP_00_01`, `CE_01_01_V2` — matches the `code` field in `trainings.json` resources |
| `question_id` | varchar(100) UNIQUE NOT NULL | **`{indicator}-{training}-q{n}`** — e.g. `SI1-PP_00_01-q1`. The indicator prefix is what prevents cross-indicator overwrites for shared trainings. |
| `scenario` | text NOT NULL | classroom moment shown to teacher |
| `prompt` | text NOT NULL | specific question asked to teacher |
| `rubric_criteria` | text[] NOT NULL | 2-3 observable criteria drawn from the FICO YES-evidence |
| `training_title` | varchar(255) | **Convention: stores indicator display name** (e.g. "Instructional Clarity"), NOT the training resource title. This is what the UI shows above the practice video. |
| `indicator_code` | varchar(50) NOT NULL | e.g. `SI1`, `PIC-1`, `M2` — matches keys in `trainings.json` |
| `indicator_rubric` | jsonb | snapshot of the FICO rubric for this indicator at save time (from `evaluationRubric.json`) |
| `question_context` | jsonb | snapshot of failure-rate context (`{ failureRate, tier, context }` from `contextualTrainingData.json`) |
| `created_at` | timestamp | INSERT time; NOT touched on UPDATE (preserved through ON CONFLICT clauses) |

The `indicator_codes` (array) column was dropped on 2026-07-02 — it duplicated the scalar `indicator_code` since every row has exactly one indicator.

### Design rules for this table

1. **Every question maps to one indicator.** No arrays. If a question fits two indicators, insert it twice — once per indicator — with distinct `question_id` values (e.g. `L2-CE_02_08-q1` and `L3-CE_02_08-q1`).
2. **`question_id` is `{indicator}-{training}-q{n}`.** This is the source of truth for cross-indicator uniqueness. Never save a question with just `{training}-q{n}` (that was the pre-fix format that caused silent overwrites when shared trainings were saved under multiple indicators).
3. **2 questions per (indicator × training) pair.** The audit expects exactly 2. Deviating creates orphan pairs or misleading UI.
4. **`training_title` = indicator display name.** Set from `trainings[indicatorCode].name` in the save endpoint. Not the training resource's own title. This is what the practice UI displays.
5. **ON CONFLICT clause updates in place for same pair.** A regeneration for the same (indicator × training) cleanly replaces the row's scenario/prompt/rubric. A new pair inserts a new row.

### Current inventory (last audit)

- **106 rows** total
- **53 distinct (indicator × training) pairs**, each with exactly 2 questions
- **19 of 21 indicators** fully covered
  - PIC-2 and PIA-4 are designed gaps (no LO exists — coach escalation)
  - 4 pairs skipped by design: PIC-3 × SCI_MISC_01, PIC-3 × SCI_MISC_02, PIA-2 × BACKPACK_01, PIA-2 × BACKPACK_02

Per-indicator row counts:

| Indicator | Trainings covered | Question rows |
|---|---|---|
| SI1 | 3/3 | 6 |
| SI2 | 2/2 | 4 |
| SI3 | 3/3 | 6 |
| PIC-1 | 3/3 | 6 |
| PIC-2 | 0/0 (GAP) | 0 |
| PIC-3 | 1/1 (2 skipped) | 2 |
| PIC-4 | 3/3 | 6 |
| PIC-5 | 2/2 | 4 |
| PIA-1 | 2/2 | 4 |
| PIA-2 | 2/2 (2 skipped) | 4 |
| PIA-3 | 4/4 | 8 |
| PIA-4 | 0/0 (GAP) | 0 |
| PIA-5 | 4/4 | 8 |
| MA-0 | 1/1 (consolidated from 2) | 2 |
| M1 | 3/3 | 6 |
| M2 | 3/3 | 6 |
| S1 | 3/3 | 6 |
| S2 | 3/3 | 6 |
| L1 | 5/5 | 10 |
| L2 | 3/3 | 6 |
| L3 | 3/3 | 6 |

### Shared trainings — worth understanding

Some training videos are mapped under multiple indicators. Each shared training now has 2 rows PER indicator (independent question sets), because the same video is legitimately relevant to different pedagogical demands.

| Training | Under indicators | Total rows |
|---|---|---|
| PP_00_01 (5 step lesson plan) | SI1, SI2, PIC-1 | 6 |
| PP_01_02_V2 (Bloom's Taxonomy) | SI1, PIC-1 | 4 |
| CE_00_07_V02 (Phonic strategies) | SI3, L1 | 4 |
| CE_01_01_V2 (Misconceptions in ops) | PIC-3, M1 | 4 |
| PP_02_03_V2 (Socratic Questioning) | PIC-4, M1 | 4 |
| PP_01_05_V2 (Open-ended Questions) | PIC-4, M2, S1 | 6 |
| PP_02_02 (Inquiry-based learning) | PIA-2, S1 | 4 |
| PP_02_04 (Group Projects) | PIA-5, S2 | 4 |
| PP_02_05 (Peer Problem-Solving) | M2, S1, S2 | 6 |
| TPS_URDU_PDF (Think-Pair-Share) | M2, S2 | 4 |
| CE_02_08 (Vocabulary → R/W) | L2, L3 | 4 |

## External DB: NIETE FDE Production

Read-only source. See `.claude/context/database_niete_fde.md` for full schema + query patterns. Used at server boot to:
- Compute per-indicator failure rate (matching DB question prompts to FICO rubric descriptions to build a `question_id → indicator_code` map)
- Log stats like "L2: 86.1% miss rate (780 NO / 3 PARTIAL / 125 YES, n=908)" — informs the failure-rate context injected into generation prompts

## Cached observations (loaded at boot)

The server also holds ~500 observation rows from Railway's own `observations` table in memory (loaded once at startup, DB connection closed after). These drive:
- The teacher-selector dropdown (`/api/teachers-with-observations`)
- Flagged-indicator detection per teacher (`/api/teacher/:id/flagged-indicators`)
- The most-recent-feedback lookup consumed by the matcher

If the observations table changes, restart the server to pick up new data.
