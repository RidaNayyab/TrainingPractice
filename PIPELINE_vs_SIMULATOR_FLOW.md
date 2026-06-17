# Pipeline vs Simulator Flow - Key Differences

## 1️⃣ PIPELINE FLOW (Static Questions)

```
┌─────────────────────────────────────────────────────────────────┐
│ BEFORE TEACHER STARTS                                           │
└─────────────────────────────────────────────────────────────────┘

Step 1: Admin/Coach generates 2 questions
  └─> Claude creates scenario + prompt + rubric criteria
  └─> Questions stored in database
  └─> Questions are STATIC (won't change)

Step 2: Teacher sees pre-made questions
  └─> Q1: "You are teaching Grade 3..."
  └─> Teacher reads the question
  └─> Teacher types/speaks their answer
  └─> Answer is evaluated against rubric

Step 3: Teacher sees Q2
  └─> Q2: "You teach Grade 5..."
  └─> Same process as Q1

CHARACTERISTICS:
  • Questions are pre-generated (NOT in real-time)
  • Teacher responds to fixed scenarios
  • Teacher's answer is evaluated, not continued
  • Same questions every time
  • Faster (no API calls during practice)
```

---

## 2️⃣ SIMULATOR FLOW (Real-Time Interaction)

```
┌─────────────────────────────────────────────────────────────────┐
│ WHEN TEACHER STARTS                                             │
└─────────────────────────────────────────────────────────────────┘

Setup (Teacher sees):
  Scenario Card:
  "You are about to start a Grade 3 Math lesson.
   You have 25 students waiting."
  
  Focus: "Instructional Clarity - State a clear learning objective"

TURN 1 (Real-time generation):
  
  AI Student (Claude) sends first message:
  "Teacher, what are we doing today?"
  
  Teacher responds (text or audio):
  "Today we're learning about multiplication"
  
  Claude READS teacher's response and generates:
  └─> Student reaction to what teacher said
  └─> Student message based on teacher's clarity
  
  If teacher was vague:
    AI Student: "But I don't understand what we'll do..."
  
  If teacher was clear:
    AI Student: "Oh, okay! So we're learning multiplication?"

TURN 2:
  
  Teacher responds to student's reaction:
  "Yes, we'll learn to multiply two numbers. By the end,
   you'll be able to multiply 3 x 4 correctly"
  
  Claude generates response based on THIS response:
  └─> More specific student reaction
  └─> Pushes back if still vague
  └─> Shows understanding if clear

TURN 3 (Final turn with evaluation):
  
  Teacher makes final response
  
  Claude:
  1. Generates final student message
  2. Evaluates the ENTIRE conversation
  3. Scores against rubric criteria
  4. Shows feedback

CHARACTERISTICS:
  • Questions/scenarios generated at setup time (fixed)
  • Teacher's responses drive the conversation
  • AI student reacts to ACTUAL teacher responses
  • Each turn is generated in real-time
  • Teacher's words matter - conversation changes based on them
  • Evaluation is on teaching behavior over 3 turns, not single answer
```

---

## Key Differences Table

| Aspect | Pipeline | Simulator |
|--------|----------|-----------|
| **Question Generation** | Once at setup (Q1, Q2 static) | Scenario at setup, then responses generated per turn |
| **Teacher Input** | Answers 2 pre-written questions | Has 3 back-and-forth exchanges with AI student |
| **AI Generation Trigger** | Once per session (before training) | After each teacher response (Turns 1, 2, 3) |
| **Conversation** | Linear (Q1 → Q2) | Multi-turn dialogue that evolves |
| **Teacher Response Affects** | Evaluation only | The entire direction of conversation |
| **If Teacher Vague** | Evaluated as low score | AI student pushes back, asks for clarity |
| **If Teacher Clear** | Evaluated as high score | AI student shows understanding, moves forward |
| **Number of Exchanges** | 2 static interactions | 3 dynamic exchanges |
| **Evaluation** | Against rubric for each Q | Against rubric for entire 3-turn conversation |
| **Use Case** | Quick practice, checking knowledge | Deep practice, simulating real classroom |
| **API Calls** | 1 call (generates both Qs) | 3 calls (one per turn) |
| **Time to Complete** | 5-10 minutes | 10-15 minutes |

---

## Visual Comparison

### PIPELINE FLOW
```
┌─────────────────────┐
│   Coach Prepares    │
│  Generate 2 Qs      │
└──────────┬──────────┘
           │ (1 API call)
           ▼
┌─────────────────────────────────────┐
│  Teacher Sees Pipeline Interface    │
│  ┌───────────────────────────────┐  │
│  │ Q1: Scenario + Prompt         │  │
│  │ [Teacher types answer]        │  │
│  │ Rubric: criterion 1, 2, 3    │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Q2: Scenario + Prompt         │  │
│  │ [Teacher types answer]        │  │
│  │ Rubric: criterion 1, 2, 3    │  │
│  └───────────────────────────────┘  │
│                                     │
│  [✅ Evaluation shown]               │
└─────────────────────────────────────┘
```

### SIMULATOR FLOW
```
┌──────────────────────────────────────────┐
│  Teacher Starts Simulator                │
│  ┌────────────────────────────────────┐  │
│  │ Scenario Card:                     │  │
│  │ "Grade 3 Math lesson, 25 students" │  │
│  │ Focus: Instructional Clarity       │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────┐
│  TURN 1 (Chat Interface)                 │
│  ┌────────────────────────────────────┐  │
│  │ AI Student:                        │  │
│  │ "Teacher, what are we doing?"      │  │
│  │                                    │  │
│  │ [Teacher types/speaks response]    │  │
│  │ "We're learning multiplication"    │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
          │ (1 API call)
          ▼
┌──────────────────────────────────────────┐
│  TURN 2 (Chat Interface)                 │
│  ┌────────────────────────────────────┐  │
│  │ AI Student (reacting):             │  │
│  │ "Okay... but what exactly will I   │  │
│  │  be able to do by the end?"        │  │
│  │                                    │  │
│  │ [Teacher responds more clearly]    │  │
│  │ "You'll multiply 3 x 4 = 12"       │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
          │ (1 API call)
          ▼
┌──────────────────────────────────────────┐
│  TURN 3 (Chat Interface + Evaluation)    │
│  ┌────────────────────────────────────┐  │
│  │ AI Student (understanding shown):  │  │
│  │ "Oh I get it! Multiplying..."      │  │
│  │                                    │  │
│  │ [Teacher's final response]         │  │
│  │ [System evaluates entire convo]    │  │
│  │                                    │  │
│  │ ✅ Evaluation:                     │  │
│  │ • Clarity: 8/10                    │  │
│  │ • Student engagement: 9/10         │  │
│  │ • Feedback explained...            │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

---

## What Changes for Simulator Implementation

### System Architecture
```
Current (Pipeline):
  1. Coach generates questions → Stored in DB
  2. Teacher answers questions → Evaluated against rubric

New (Simulator):
  1. System loads scenario template from simulations.json
  2. Teacher sees scenario card
  3. AI student generates first message (based on template)
  4. Teacher responds
  5. AI student generates response to teacher's actual words
  6. Repeat for 3 turns
  7. Final evaluation on entire conversation
```

### Data Flow
```
Pipeline Flow:
  POST /api/generate-questions
    ↓
  {questions: [{scenario, prompt, rubric}, {scenario, prompt, rubric}]}
    ↓
  Teacher answers Q1, Q2
    ↓
  Evaluate each answer

Simulator Flow:
  Load /data/simulations.json
    ↓
  Get scenario setup + initial message
    ↓
  Teacher responds → POST /api/simulate (Turn 1)
    ↓
  AI generates: reaction + next message
    ↓
  Teacher responds → POST /api/simulate (Turn 2)
    ↓
  AI generates: reaction + next message
    ↓
  Teacher responds → POST /api/simulate (Turn 3)
    ↓
  AI generates: final reaction + EVALUATION
```

---

## API Endpoint Comparison

### Pipeline API
```
POST /api/generate-questions
Input:
  - trainingCode
  - indicatorCode
  - learningOutcome
  - context
  - systemPrompt

Output:
  {questions: [{scenario, prompt, rubricCriteria}, {...}]}

Called: Once per session
```

### Simulator API
```
POST /api/simulate
Input:
  - indicatorCode
  - conversationHistory: [{role: 'teacher'|'student', message}, ...]
  - turnNumber (1, 2, or 3)
  - maxTurns (3)

Output (Turn 1-2):
  {studentMessage: "...", isComplete: false}

Output (Turn 3):
  {studentMessage: "...", isComplete: true, evaluation: {...}}

Called: 3 times per session (once per turn)
```

---

## User Experience Comparison

### PIPELINE Experience
```
1. "Generate Questions" button
   ↓
2. See 2 question cards
   ↓
3. Click on Q1, read scenario
   ↓
4. Think about answer, type response
   ↓
5. See evaluation for Q1
   ↓
6. Repeat for Q2
   ↓
7. Done
```

### SIMULATOR Experience
```
1. Click "Start Simulation"
   ↓
2. See scenario card: "Grade 3 classroom, 25 students"
   ↓
3. AI Student speaks first: "Teacher, what are we doing?"
   ↓
4. Teacher responds: "We're learning fractions"
   ↓
5. AI reacts: "But I don't understand fractions..."
   ↓
6. Teacher clarifies: "By end of lesson, you'll divide pizza slices"
   ↓
7. AI shows understanding: "Oh! So we're cutting things up!"
   ↓
8. Teacher confirms
   ↓
9. Evaluation shown: Scored on clarity, engagement, etc.
```

---

## Why They Need Different Flows

### Pipeline Works Because:
- ✅ Questions are fixed and prepared in advance
- ✅ Scenarios don't change based on teacher response
- ✅ Evaluation is straightforward (answer vs rubric)
- ✅ Can be cached/reused

### Simulator Needs Real-Time Because:
- ✅ Student responses must react to teacher's actual words
- ✅ Teacher's vagueness should trigger pushback
- ✅ Conversation needs to feel natural
- ✅ Can't predict all possible teacher responses in advance

---

## Summary

| Feature | Pipeline | Simulator |
|---------|----------|-----------|
| Pre-generated questions | ✅ Yes | ❌ No (scenario only) |
| Real-time AI responses | ❌ No | ✅ Yes (3 turns) |
| Teacher's words matter | ❌ Partially | ✅ Completely |
| Multi-turn conversation | ❌ No | ✅ Yes (3 turns) |
| Can generate in advance | ✅ Yes | ❌ No (depends on teacher) |
| Number of API calls | 1 | 3 |
| Best for | Quick knowledge check | Deep practice, behavior change |

---

## Implementation Approach

**For Simulator**, you would need:

1. **New Endpoint**: `/api/simulate`
   - Takes conversation history
   - Generates Claude response based on context
   - Evaluates if final turn

2. **New Component**: `SimulationFlow.tsx`
   - Chat-style interface
   - Turn counter (1/3, 2/3, 3/3)
   - Message bubbles (teacher right, student left)
   - Recording/text input like Pipeline

3. **New Data**: `src/data/simulations.json`
   ```json
   {
     "SI1": {
       "title": "Classroom Scenario: Starting a Lesson",
       "setup": "You are about to start a Grade 3 Math lesson...",
       "initialStudentMessage": "Teacher, what are we doing today?",
       "indicatorFocus": "Instructional Clarity - teacher must state clear learning objective",
       "maxTurns": 3
     }
   }
   ```

4. **New Config**: simulations.json entries (one per indicator that uses simulator instead of pipeline)

---

## Bottom Line

**Pipeline** = Teacher answers teacher-written questions  
**Simulator** = Teacher has real-time conversation with AI student (student responds based on teacher's actual words)

They're both valid practice modes, but for different learning goals.
