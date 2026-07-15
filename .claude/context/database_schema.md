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

### Table: `teacher_practice_attempts`

Every teacher response and every roleplay session — persisted forever. Nothing gets dumped.

| Column | Type | Notes |
|---|---|---|
| `id` | integer (SERIAL PK) | auto-increment |
| `teacher_id` | varchar(50) NOT NULL | matches `teacher_id` used across the app (Railway teacher_id or NIETE user_id) |
| `indicator_code` | varchar(50) NOT NULL | e.g. `SI1`, `PIC-1` |
| `training_code` | varchar(50) | the specific training video the matcher picked |
| `mode` | varchar(20) NOT NULL | `'scenario'` or `'roleplay'` |
| `question_id` | varchar(100) | for scenario mode — matches `generated_practice_questions.question_id` |
| `session_id` | varchar(64) UNIQUE | for roleplay — one row per session, upserted turn-by-turn |
| `turn_number` | integer | roleplay turn count |
| `is_complete` | boolean | true when the session has concluded (scenario always true; roleplay only on PASS or FINAL) |
| `scenario` | text | classroom scenario shown to teacher |
| `prompt` | text | the exact question asked |
| `rubric_criteria` | text[] | question-specific rubric items the teacher was evaluated against |
| `response` | text | for scenario mode: the teacher's typed answer |
| `conversation_history` | jsonb | for roleplay mode: full turn-by-turn `[{role, message}]` (roles: `scene`, `student`, `teacher`, `coach`) |
| `evaluation` | jsonb | `{ score, feedback, rubric_criteria_met, rubric_criteria_missed, rubric_criteria_not_applicable }` for scenario; `{ ending: 'PASS'\|'FINAL', feedback }` for roleplay |
| `created_at` | timestamp | first INSERT time (preserved through upserts) |
| `updated_at` | timestamp | last upsert time (roleplay turns update this) |

**Indexes:** `idx_tpa_teacher (teacher_id)`, `idx_tpa_ind_train (indicator_code, training_code)`, `idx_tpa_session_unique (session_id)` — unique so `ON CONFLICT (session_id) DO UPDATE` works for the roleplay upsert path.

### Persistence rules

1. **Scenario mode** — INSERT one row per submitted question. Never updates.
2. **Roleplay mode** — INSERT on turn 1 with `session_id`, then UPDATE on every subsequent turn. `conversation_history` grows, `turn_number` advances, `evaluation` stays NULL until the final turn. On PASS or FINAL ending, `is_complete=true` and `evaluation` populated with coaching feedback.
3. **Abandoned roleplays are still saved.** If a teacher leaves mid-session, whatever turns were completed remain in the DB with `is_complete=false`.
4. **Fire-and-log persistence** — save runs async after the AI response; a persistence failure NEVER blocks feedback from reaching the teacher.

## External DB: NIETE FDE Production

Read-only source. See `.claude/context/database_niete_fde.md` for full schema + query patterns. Used at server boot for two things:

### 1. Per-indicator failure-rate stats
`loadFdeIndicatorStats()` matches DB question prompts to FICO rubric descriptions to build a `question_id → indicator_code` map, then aggregates YES/PARTIAL/NO across all completed FICO V3 observations. Logs stats like "L2: 86.1% miss rate (780 NO / 3 PARTIAL / 125 YES, n=908)" — these are injected into generation prompts.

### 2. Full observation cache (`nieteObsCache`)
`loadNieteObservations()` pulls every completed FICO V3 observation with joins to region, school, teacher, and lesson plan. Per row it also derives:
- `improvement_areas: [{ indicator_code, indicator_name, score: 'NO' }]` from `coaching_observationanswer` rows where `score_type='no'`
- `results_json: { section_b: { SI1: 'YES'|'PARTIAL'|'NO', ... } }` from the same

This means the existing `FeedbackTrainingModule` (which reads `improvement_areas` + `results_json.section_b` to detect flagged indicators) works with NIETE observations without any change.

**Current size:** 2,487 observations · 558 teachers · 150 schools · 7 regions

### Region distribution

| Region | Schools | Teachers | Observations |
|---|---|---|---|
| Urban-I | 23 | 160 | 1,072 |
| Tarnol | 25 | 90 | 526 |
| Sihala | 27 | 100 | 363 |
| B.K | 29 | 78 | 207 |
| Urban-II | 19 | 68 | 153 |
| Nilore | 24 | 58 | 92 |
| Unassigned | 3 | 4 | 74 |

## Legacy Railway observations (loaded at boot)

The server also holds ~500 rows from Railway's own `observations` table in memory. These are the pre-NIETE observations used before the landing page migrated to NIETE. They still work for:
- `/api/teachers-with-observations`
- `/api/teacher/:id/flagged-indicators`
- `/api/teacher/:id/highest-priority-indicator`

The teacher-observations endpoint `/api/teacher/:id/observations` merges Railway + NIETE so downstream flows work regardless of source.

If the underlying tables change, restart the server to pick up fresh data.
