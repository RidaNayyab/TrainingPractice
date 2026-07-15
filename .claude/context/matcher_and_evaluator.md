# Training Matcher & Response Evaluator

Two AI-powered pieces that sit inside the teacher flow (not the authoring pipeline). Both use **OpenRouter · `openai/gpt-5.1`** via the shared `callOpenRouterChat()` helper — same as everything else in the server.

## 1. Training Matcher — `matchTrainingToFeedback()`

**File:** `src/server.ts` around lines 312–376
**Called by:** `GET /api/training/:code/for-teacher/:teacherId` — the endpoint the frontend hits when opening the training module for a teacher.

### What it does

Given:
- an indicator code (e.g. `SI1`)
- the teacher's most recent feedback text
- the list of training resources mapped to that indicator (3 in the SI1 case: PP_00_01 / AF_00_03 / PP_01_02_V2)

…the matcher picks **one** training resource — not a broad default, but the one whose rationale best matches the *failure pattern the coach is describing in this teacher's feedback*.

### Why this matters

Two teachers can both be flagged for the same indicator (e.g. SI1) but need different trainings:
- Teacher A's coach wrote: *"the purpose of the lesson is not clearly stated"* → PP_00_01 (root planning / stating a goal)
- Teacher B's coach wrote: *"instructions are given in many small pieces… check quickly if all have done it"* → AF_00_03 (add comprehension checks)
- Teacher C's coach wrote: *"tips are not landing… coach will reach out"* → PP_01_02_V2 (Bloom's, L1 escalation)

Same indicator, different feedback content → different training. That's the whole point.

### How the picker works

1. **Pin to a specific observation.** The endpoint accepts `?observationId=X` — when the landing page sends this (which it does), the matcher reads THAT exact observation's feedback text, not the teacher's most-recent. This is critical: different observations of the same teacher can genuinely need different trainings.
2. **Scope the feedback to just this indicator's section.** Extracts ONLY the paragraph that pertains to the current indicator (using the indicator's display name from `ficoNameMap`, e.g. "Instructional Clarity" for SI1). Without this scoping, the matcher reads coach guidance for SI1 + SI3 + SI2 all at once and biases toward the broadest fix.
3. **Prompt the model with an analytical framework** rather than "pick 1/2/3":
   - Identify what the coach is prescribing (`self-check`, `try`, `next time` language)
   - Map the prescription to the training whose rationale describes the SAME failure pattern
   - Concrete mapping rules for goal-statement vs comprehension-check vs escalation signals
   - Explicit anti-default instruction: "Do NOT default to resource #1. If the feedback evidence does not match #1's rationale, pick the better-fitting one."
4. Return a single digit → resource index.

### Known behavior

- If feedback is short (<20 chars) or missing, the matcher defaults to index 0 (safe fallback).
- Post-fix, verified live: three different teachers with genuinely different feedback content produce three different training picks (PP_00_01 / AF_00_03 / PP_01_02_V2).
- Pre-fix issue that's been resolved: the matcher used to receive the FULL feedback string (SI1 + SI3 + SI2 sections merged) which caused Claude to always pick the broadest / lowest-level option.

## 2. Response Evaluator — `POST /api/evaluate`

**File:** `src/server.ts` around lines 936–1024

### What it does

Given the teacher's response to a practice question, score it and give a coaching nudge.

### Prompt structure

The endpoint builds a single prompt combining:
- The **indicator-level FICO rubric** (YES/PARTIAL/NO criteria — the general standard)
- The **question-specific rubric criteria** (the 2-3 observable items generated with that specific question)
- The scenario + question (so the model knows what was asked)
- The teacher's response

The scoring is against **both rubrics simultaneously**: `score` reflects the indicator-level bucket (YES/PARTIAL/NO), and `rubric_criteria_met` / `rubric_criteria_missed` are the verbatim question-specific criteria the response satisfied or didn't.

### JSON contract (locked into the prompt)

```json
{
  "score": "YES" | "PARTIAL" | "NO",
  "feedback": "coaching nudge string",
  "rubric_criteria_met": ["<verbatim criterion>", …],
  "rubric_criteria_missed": [...],
  "rubric_criteria_not_applicable": [...]
}
```

Every question-specific criterion appears in exactly one of the three arrays. This lets the frontend show green ticks / red X's per criterion.

### Coaching feedback rules

Locked into the prompt as behavioral constraints:
- **Max 2 sentences, ~25 words** — precise, not preachy
- **Peer-to-peer tone** — warm coach talking to a colleague, not lecturing a student
- **Pedagogy vocab allowed:** observable verb, action verb, learning objective, measurable, check for understanding, model, guided practice, scaffold
- **Banned:** "success threshold", "demonstrate mastery", "measurable criterion" (say "measurable"), "benchmark", "evidence of learning attainment", "Try again", "Want to give it another go"
- **Sentence 1:** concrete redirect with a tiny example ("Try writing what students will do — like 'name 4 parts of a plant.'")
- **Sentence 2 (optional):** forward-looking nudge ("Next time you write a goal, pair the verb with a quantity")
- **Strong response:** name what worked in 5-10 plain-language words + one optional refinement — still ≤ 2 sentences total

### Historical fix

The endpoint used to extract indicator from `questionId.split('-')[0]`. That worked for the old ID format `SI1-q1` but broke for the new `PP_00_01-q1` format (split gave `PP_00_01`, not an indicator). Fix: frontend now sends `indicatorCode` in the body explicitly; the endpoint falls back to a regex `^([A-Z]+-?\d+)-` if body is missing.

## The two pieces work together

Fully wired teacher flow:

1. Teacher picks an observation → **Matcher** reads THAT observation's coach feedback (pinned via `?observationId=`) and picks training X for indicator I
2. Frontend fetches practice questions for (I, X) specifically — NOT the full indicator pool
3. Teacher chooses practice mode: **Scenario Questions** (Evaluator scores each response with tight peer-to-peer coaching nudge) OR **Roleplay** (dynamic AI student, up to 3 turns, coaching feedback at end — see `roleplay_prompt.md`)
4. Every response + feedback is saved to `teacher_practice_attempts` (see `database_schema.md`)

Two teachers flagged for the same indicator I but with different feedback content get:
- Different training video X vs Y
- Different practice questions (scoped to their specific X vs Y)
- Different rubric criteria to be evaluated against
- Different coaching feedback

Same teacher clicking two of her own observations gets:
- Potentially different training picks (matcher pinned per observation, not per teacher)
- The specific coach feedback rendered from THAT observation, not the most-recent

This is the "personalized enough to be useful, not just generic" property, doubled down at both teacher-level and observation-level.

## 3. Roleplay (`/api/roleplay`)

The third AI-powered piece, added later. Separate from the matcher/evaluator but shares the OpenRouter GPT-5.1 provider. Fully prompt-driven — the template lives at `.claude/context/roleplay_prompt.md`. See that file + `architecture_overview.md` for details. Coaching endings recently tightened:
- **PASS ENDING** (rubric met early): MAX 3 sentences, ~50 words
- **FINAL ENDING** (turn 3 forced): MAX 4 sentences, ~65 words
- Mobile-readable in a single glance, no long paragraphs.
