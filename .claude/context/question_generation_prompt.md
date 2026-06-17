# Question Generation Prompt — Working Version

> The system prompt used by `/api/generate-questions` in [src/server.ts](../../src/server.ts) to produce practice questions for teachers after they complete a training video. Lives in [src/data/questionGenerationPrompt.json](../../src/data/questionGenerationPrompt.json).

This is the version that produces clean, on-standard output. Don't change it unless something specific is broken.

---

## Model Config

| Setting | Value |
|---|---|
| `model` | `claude-opus-4-7` |
| `maxTokens` | `4096` |
| `temperature` | `0.7` *(ignored on opus-4-7; only applied to other models)* |
| `questionsPerTraining` | `2` |

---

## The System Prompt (verbatim)

```
Generate 2 practice questions. DIFFERENT TOPICS. Concrete scenarios with Pakistani teacher names.

FORMAT:

Q1: "You are teaching [Grade/Subject]. You [write/say something]. [What happens/Student reaction]. What would you do?"

Q1 EXAMPLE:
Scenario: "You are teaching Grade 3 English. You write 'Goal: Learn verbs' on board. You say 'Now we learn verbs.' Student asks 'What will we do?' What would you do?"
Question: "What would you say to make your learning objective clearer?"

Q2: "Ms./Mr. [Name] [does something]. What would you do differently?"

Q2 EXAMPLE (DIFFERENT TOPIC from Q1):
Scenario: "Ms. Fatima states the learning goal but then starts the lesson without checking if students understood."
Question: "What would you do differently to check if students understood?"

RULES:
- Q1 = YOUR classroom (first person). Q2 = Different teacher scenario, asking what YOU would do DIFFERENTLY
- Use REAL Pakistani teacher names: Ms. Ayesha, Mr. Bilal, Ms. Fatima, Mr. Imran, Ms. Zainab, Mr. Kamran
- Q1 and Q2 must address DIFFERENT ASPECTS of the indicator
- Short, concrete, relatable
- One clear action per question

Different topic examples:
- SI1: Q1=Stating objective, Q2=Checking understanding
- PIC-1: Q1=Asking questions, Q2=Following up on short answers
- L1: Q1=Choosing sequence, Q2=Reviewing confused sounds
```

---

## Why this works

1. **Two contrasting formats forces variety** — Q1 puts the teacher in their own classroom (first person, immediate). Q2 watches another teacher (third person, reflective). Same indicator, different cognitive angle.

2. **"DIFFERENT ASPECTS of the indicator"** is the single most important rule. Without it, both questions ended up asking about the same micro-skill. The bottom-of-prompt examples (SI1, PIC-1, L1) anchor what "different aspect" means.

3. **Pakistani names are concrete and explicit** — naming six is enough that Claude rotates through them. Earlier versions said "Pakistani teacher" generically and got "Ms. Smith" sometimes.

4. **One clear action per question** — keeps prompts crisp. The earlier post-processor tried to enforce this by splitting at " and ", which destroyed legitimate compound prompts. Now we trust Claude to keep them tight.

5. **The exact examples in the prompt are the contract** — they show structure (`"You are teaching Grade 3 English..."`), length, and the "and-then-student-reaction" beat. Claude mimics these closely.

---

## User Message (constructed per-request in server.ts)

The user message that accompanies this system prompt is built dynamically in [src/server.ts:447-471](../../src/server.ts#L447-L471) for each indicator. It includes:

- Training code, indicator code
- Learning outcome and indicator context
- Strict JSON-format instructions (single-line strings, escaped quotes)
- An exact JSON example for Claude to mimic

The combination — this system prompt + the per-request user message + Claude opus-4-7 — is what produces the working output.

---

## Output Shape

Claude returns a JSON array of 2 objects:

```json
[
  {
    "scenario": "You are teaching Grade 4 Math. You write 'Lesson: Fractions' on the board and say 'Today we will study fractions.' A student named Ali asks, 'Miss, what will we learn to do?' You realise your goal is not specific.",
    "prompt": "Write a clearer learning objective on the board that tells students exactly what they will be able to do by the end of the lesson?",
    "rubricCriteria": [
      "Objective starts with a clear action verb (e.g., identify, compare, solve)",
      "Specifies the topic (e.g., halves and quarters) so students know the focus",
      "Stated in student-friendly language a Grade 4 child can understand"
    ]
  },
  {
    "scenario": "Ms. Zainab begins her Grade 2 Urdu lesson by saying, 'Aaj hum kahani parhenge' (Today we will read a story). She does not write any objective or explain what students should learn from the story.",
    "prompt": "Write what you would say and put on the board instead, to share a clear learning objective with the Grade 2 students?",
    "rubricCriteria": [
      "Includes a specific learning action (e.g., 'identify main characters' or 'retell the story in order')",
      "Connects the objective to the story being read, not just the activity",
      "Shared both verbally and in writing so all students can see and hear it"
    ]
  }
]
```

The server then runs minimal post-processing ([src/server.ts:612-625](../../src/server.ts#L612-L625)) — just ensures each `prompt` ends with `?` — and returns the array unchanged.

---

## What broke this in the past — DO NOT reintroduce

These post-processing steps were **removed** in commit `df8f5eb` because they were destroying Claude's good output:

| Removed step | What it did | Why it was bad |
|---|---|---|
| `prompt.split(' and ')[0]` | Chopped prompt at first " and " | Destroyed compound prompts like *"specific and measurable"* → *"specific?"* |
| `scenariaSentences.slice(0, 2)` | Truncated scenario to 2 sentences | Stripped the student-interaction beat, leaving setup-only scenarios with no tension |
| `rubricCriteria.slice(0, 3)` | Hard-capped rubric items at 3 | Forced loss of valid criteria when Claude produced more |

If question quality degrades again, **investigate the prompt or model — not by adding post-processors**. The prompt is the contract; the server should pass Claude's output through cleanly.

---

## File Locations

| What | Where |
|---|---|
| Prompt JSON | [src/data/questionGenerationPrompt.json](../../src/data/questionGenerationPrompt.json) |
| Server endpoint | [src/server.ts:438](../../src/server.ts#L438) `POST /api/generate-questions` |
| Post-processing | [src/server.ts:612-625](../../src/server.ts#L612-L625) |
| User message construction | [src/server.ts:447-471](../../src/server.ts#L447-L471) |
