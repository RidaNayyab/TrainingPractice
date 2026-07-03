# Question Generation Pipeline

How practice questions get created, saved, retrieved, and evaluated. All routes and file paths are current as of the last audit (106 rows in DB, 53 pairs × 2 questions).

## The flow at a glance

```
Content author (PipelinePage)
  ┌───────────────────────────────────────────────────┐
  │ 1. Pick indicator from dropdown                   │
  │ 2. See mapped training resources                  │
  │ 3. Enter learning outcome + optional context      │
  │ 4. Click Generate                                 │──►  POST /api/generate-questions
  │ 5. Review / edit generated Q1, Q2                 │        (OpenRouter · gpt-5.1)
  │ 6. Click Save                                     │──►  POST /api/save-questions
  └───────────────────────────────────────────────────┘        (Railway Postgres)

Teacher (TestPage → FeedbackTrainingModule)
  ┌───────────────────────────────────────────────────┐
  │ 1. Observation click → SI1/PIC-1/etc. flagged     │
  │ 2. AI matcher picks a specific training           │──►  GET /api/training/:code/for-teacher/:teacherId
  │ 3. Practice questions fetched for THAT training   │──►  GET /api/practice/:code?trainingCode=…
  │ 4. Teacher writes response, submits               │──►  POST /api/evaluate
  │ 5. Sees score + rubric hits/misses + nudge        │        (Anthropic · claude-opus-4-7)
  └───────────────────────────────────────────────────┘
```

## Endpoint 1 — `POST /api/generate-questions`

**File:** `src/server.ts` (around line 626)
**Provider:** OpenRouter (`openai/gpt-5.1`), configurable in `src/data/questionGenerationPrompt.json`.

**Request body:**
```json
{
  "trainingCode": "PP_00_01",
  "indicatorCode": "SI1",
  "learningOutcome": "State a specific, measurable learning objective at lesson start",
  "context": "optional free text",
  "systemPrompt": "optional override for the default system prompt"
}
```

**What the endpoint injects into the prompt (in this order):**
1. **Task framing** — asks for exactly N tight questions letting a Pakistani government-school teacher PRACTICE the transferable skill, not recall it.
2. **FICO rubric block** — full YES/PARTIAL/NO criteria for `indicatorCode`, pulled from the parsed `fico_v3_indicator_rubric.md`. Marked authoritative.
3. **NIETE stats block** — failure rate for this indicator across ~2,600 real FICO V3 observations (e.g. "L2: 86.1% of teachers miss this"). Only injected when FDE pool is connected.
4. **Input echo** — indicator code, training code, LO, context.
5. **Length limits** — scenario ≤ 30-35 words, prompt ≤ 20-25 words, rubric criteria ≤ 15-20 words each.
6. **Facet-distinctness rule** — Q1 and Q2 MUST probe different facets of the skill. If they could be answered with the same rubric, the model must rewrite.
7. **Observable-criteria rule** — rubric items must be physical / spatial / verbatim-speech (e.g. "Teacher points to each letter, says '/b/ /a/ /t/'" — not "Teacher clearly models").
8. **Worked example** — inline L1 phonics example showing the target tight style.

**Response:**
```json
{ "questions": [ { "scenario": "…", "prompt": "…", "rubricCriteria": ["…", "…", "…"] }, … ] }
```

**JSON recovery:** the endpoint has a bracket-counting parser that tolerates markdown-fenced replies and repairs truncated JSON — see `src/server.ts` around lines 700-780.

## Endpoint 2 — `POST /api/save-questions`

**File:** `src/server.ts` (around line 837)
**Backend:** Railway Postgres, `generated_practice_questions` table.

**Request body:**
```json
{
  "trainingCode": "PP_00_01",
  "indicatorCode": "SI1",
  "questions": [ { "scenario": "…", "prompt": "…", "rubricCriteria": [...] }, ... ]
}
```

**Critical behaviors:**
- Each question is saved with `question_id = ${indicatorCode}-${trainingCode}-q${i+1}` (e.g. `SI1-PP_00_01-q1`).
  - **This is the reason no overwrites happen across indicators.** A training video used by two indicators (e.g. PP_02_05 → M2, S1, S2) gets independent rows per indicator because the IDs are distinct.
- **Belt-and-suspenders guard:** before every insert, checks whether a row with the same question_id already exists under a *different* indicator. If yes, skips with a warning rather than overwriting. Under the current ID convention this can only happen if something upstream mislabels — but the check is cheap insurance.
- `ON CONFLICT (question_id) DO UPDATE` fires only for **the same (indicator × training) pair** — a deliberate regeneration. Same pair regenerated = update in place. Different pair = new row.
- `training_title` column stores the *indicator display name* (e.g. "Instructional Clarity") by convention — this is what the practice UI shows above the video. NOT the training resource's title.

## Endpoint 3 — `GET /api/practice/:code`

**File:** `src/server.ts` (around line 527)

Two modes controlled by `?trainingCode=` query param:

| URL | Query | Behavior |
|---|---|---|
| `/api/practice/SI1` | none | Returns ALL questions for indicator SI1 across every training (full pool) |
| `/api/practice/SI1?trainingCode=PP_00_01` | scoped | Returns only questions for SI1 × PP_00_01 (this is what the teacher flow uses) |

The teacher-flow scoped mode is what makes "same indicator, different training → different questions" work. See `matcher_and_evaluator.md` for how the training gets picked.

Falls back to hardcoded stub questions if no rows exist for the requested pair.

## Endpoint 4 — `POST /api/evaluate`

**File:** `src/server.ts` (around line 936)
**Provider:** Anthropic · claude-opus-4-7

**Request body:**
```json
{
  "response": "the teacher's typed answer",
  "questionId": "SI1-PP_00_01-q1",
  "indicatorCode": "SI1",
  "rubricCriteria": ["... verbatim from the question ..."],
  "scenario": "the classroom moment shown to the teacher",
  "prompt": "the specific question asked"
}
```

**What the endpoint puts in the model prompt:**
1. Full FICO indicator rubric (YES/PARTIAL/NO criteria for `indicatorCode`)
2. The question-specific rubric criteria (from `rubricCriteria`)
3. Scenario + prompt (so the model understands what was asked)
4. Teacher's response

**Response contract (enforced verbatim):**
```json
{
  "score": "YES" | "PARTIAL" | "NO",
  "feedback": "2-sentence coaching nudge, peer-to-peer tone, ends with a forward-looking 'Next time…' step (never 'try again')",
  "rubric_criteria_met": ["<verbatim question-specific criterion>", ...],
  "rubric_criteria_missed": [...],
  "rubric_criteria_not_applicable": [...]
}
```

**Coaching feedback rules** (locked into the prompt):
- Max 2 sentences, ~25 words
- Pedagogy vocab welcome ("observable verb", "measurable", "check for understanding")
- Banned phrasings: "success threshold", "demonstrate mastery", "Try again", "Want to give it another go"
- Sentence 1: concrete redirect with tiny example
- Sentence 2 (optional): forward-looking nudge for next lesson
- If the response is strong: name what worked in 5-10 words + one optional refinement

## Current state (as of the last audit)

- **Total rows:** 106
- **Distinct (indicator × training) pairs:** 53 (each with exactly 2 questions)
- **Indicators fully covered:** 19 of 21 (PIC-2 and PIA-4 are designed gaps)
- **User-skipped trainings:** PIC-3 science × 2, PIA-2 literacy × 2 (4 pairs deliberately not generated)

Regeneration behavior after ID normalization (2026-07-02):
- Regenerating an existing pair → clean UPDATE of the same 2 rows
- Generating a new (indicator × training) pair → INSERT of 2 new rows
- No collisions across shared trainings — question_ids are unique per pair

## Where things live

| Thing | Path |
|---|---|
| Endpoint code | `src/server.ts` |
| Frontend pipeline UI | `src/pages/PipelinePage.tsx` |
| Frontend teacher UI | `src/components/FeedbackTrainingModule.tsx`, `src/components/PracticeFlow.tsx` |
| API client | `src/services/api.ts` |
| Generation config | `src/data/questionGenerationPrompt.json` |
| Trainings mapping | `src/data/trainings.json` |
| Rubric source | `.claude/context/fico_v3_indicator_rubric.md` |
| DB schema definition | Inline in `src/server.ts` (CREATE TABLE IF NOT EXISTS around line 866) |
