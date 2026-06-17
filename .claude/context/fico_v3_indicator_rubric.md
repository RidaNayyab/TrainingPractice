# FICO V3 — AI-Led Indicators Rubric

> The complete rubric for AI-assessed teaching indicators. Indicators are **not grade-specific** — they are general indicators. M1/M2 = Mathematics, S1/S2 = Science, L1/L2/L3 = Literacy.

Scoring: **Yes (1 point)** · **Partial (0.5 point)** · **No (0 point)**

---

## Section A — Structural Integrity Indicators (3 indicators, Critical Stage 1)

### SI1 — Instructional Clarity [AI]

**Description:** The teacher clearly communicates the lesson's purpose and learning expectations — stating goals explicitly and explaining content in a logical, coherent sequence.

**What to measure:** Whether the teacher states a clear learning goal early in the lesson and whether explanations follow a logical structure with connectors — making content easy to follow.

**Yes (1 point) — Observable Evidence:**
- Teacher states "Today we will learn [specific skill/concept]" within first 5 minutes
- Uses precise academic vocabulary (defines terms before using them)
- Explanations follow logical sequence with connectors ("first," "next," "because," "therefore")
- Checks for understanding of instructions: "Does everyone understand what to do?"
- COUNT: At least 1 clear goal statement + 3+ logical connectors in explanations

**Partial (0.5 point):**
- Goal mentioned but vague ("We're learning about animals" vs. "classify animals by characteristics")
- OR explanations use 1-2 logical connectors but lack full coherence
- OR teacher checks understanding only at end, not during explanations
- COUNT: Either clear goal OR logical explanations, but not both

**No (0 point):**
- No explicit goal statement in first 10 minutes
- Explanations jump between ideas without connectors
- Vague language: "You know," "this thing," "kind of like"
- No comprehension checks
- COUNT: 0 goal statements AND 0-1 logical connectors

**AI Detection Method:**
- Scan first 5 minutes for phrases: "Today we will," "By the end," "You will learn"
- Count logical connectors (first, next, because, therefore, so, then)
- Identify comprehension check questions
- Analyze vocabulary precision vs. vague language frequency

**Rationale:** All evidence is purely verbal — fully audio-observable through speech pattern analysis.

---

### SI2 — Logical Flow [AI]

**Description:** The lesson progresses coherently from opening through instruction to closure.

**What to measure:** Whether the lesson has three identifiable phases — beginning, middle, and end — with logical topic coherence throughout.

**Yes (1 point):**
- Clear opening: Introduction of topic/objective within first 5 minutes
- Distinct middle section: Core instruction and activities
- Clear closure: Wrap-up or summary at lesson end
- Transition signals connect segments: "Now that we've..., let's move to...", "Next, we will..."
- Verbal markers indicate progression: "First," "Next," "Now," "Finally," "To conclude"
- Logical topic coherence throughout (doesn't jump randomly)
- COUNT: 3 distinct phases (beginning → middle → end)

**Partial (0.5 point):**
- Basic structure present but transitions are abrupt or unclear
- Missing clear opening OR closure (but has 2 out of 3 phases)
- Some transition language but inconsistent (1-2 markers only)
- Minor topic jumping but generally coherent
- COUNT: 2 phases clearly identifiable

**No (0 point):**
- Disjointed lesson flow with no clear beginning, middle, or end
- No transition signals between activities
- Jumps randomly between topics without connectors
- Lesson feels like disconnected segments
- COUNT: 0-1 phases identifiable

**AI Detection Method:**
- Identify temporal phase markers (beginning/middle/end indicators)
- Count sequential connectors: "first," "next," "now," "then," "after that," "finally," "in conclusion"
- Detect transition signals
- Analyze topic coherence
- Track lesson timeline (beginning 0-10%, middle 10-85%, end 85-100%)

---

### SI3 — Subject Content Accuracy [AI]

> As per subject, the specific training should be shown.

**Description:** The teacher delivers factually correct content, accurate definitions, and clear explanations throughout the lesson.

**What to measure:** Correctness of facts, definitions, and explanations — distinguishing minor non-critical slips from significant errors that mislead learning.

**Yes (1 point):**
- All facts stated are conceptually correct
- Definitions accurate and complete
- Responses to student questions are correct and clear
- No misconceptions reinforced
- May include 0–1 minor non-critical slip
- VERIFICATION: Cross-check against curriculum standards/textbook

**Partial (0.5 point):**
- Content is mostly accurate
- 1–2 minor errors with minimal impact on learning
- Teacher may show uncertainty language ("I think...", "I'm not sure but...")
- Core concept is still correctly explained
- COUNT: 1-2 minor inaccuracies

**No (0 point):**
- Significant factual errors that mislead learning
- Incorrect definitions or explanations
- Reinforces misconceptions
- COUNT: 3+ errors OR 1+ critical error

**AI Detection Method:**
- Fact extraction and verification against knowledge base
- Definition comparison to standard sources
- Uncertainty language detection: "I think," "maybe," "not sure"
- Identification of conceptual inaccuracies or misconceptions

---

## Section B — Pedagogical Integrity Indicators — Core (5 indicators, High Priority Stage 2)

### PIC-1 — Activities & Tasks Alignment [AI]

**Description:** The teacher's activities, tasks, and questions are connected to the learning objective and match its cognitive level (remembering, understanding, applying, analyzing, evaluating, creating).

**What to measure:** Whether activities align with the stated SLO AND match the cognitive level intended in the objective.

**Yes (1 point):**
- Activities and tasks clearly connected to the stated SLO
- Activities match the cognitive level of the SLO (e.g., analysis tasks for analysis-level objectives)
- Questions asked during lesson match the cognitive demand of the objective
- COUNT: Clear alignment of activities with SLO AND cognitive level match

**Partial (0.5 point):**
- Activities connected to SLO BUT cognitive level doesn't match
- OR some activities match cognitive level but others don't
- OR activities seem relevant but connection to SLO is unclear
- COUNT: Either SLO connection OR cognitive level match — but not both

**No (0 point):**
- Activities appear random and disconnected from stated objective
- Cognitive level completely mismatched
- COUNT: No alignment to SLO AND cognitive level mismatch

**AI Detection Method:**
- Match activity and task keywords to SLO keywords
- Extract and classify task verbs (using Bloom's taxonomy)
- Compare cognitive level of tasks to cognitive level stated in SLO

---

### PIC-2 — Use of Academic Language [AI]

**Description:** The teacher uses subject-specific terminology correctly and models it for students.

**What to measure:** Whether technical terms are used accurately, defined when first introduced, and modeled consistently throughout the lesson.

**Yes (1 point):**
- Uses technical terms correctly: "photosynthesis," "denominator," "habitat"
- Defines terms when first used: "A habitat is where an animal lives"
- Models proper usage: "We call this a rectangle because..."
- Corrects student language: "We say 'sum' not 'answer' in addition"
- COUNT: All technical terms clearly defined

**Partial (0.5 point):**
- Uses some technical terms but inconsistently
- Terms used but not defined
- COUNT: Some terms are used

**No (0 point):**
- Avoids technical vocabulary
- Uses incorrect terminology
- Casual language throughout: "thingy," "stuff," "that part"
- COUNT: No technical terms

**AI Detection Method:**
- Identify subject-specific vocabulary from glossary
- Count academic term frequency (target: 5+ terms)
- Detect definition patterns: "is," "means," "called"
- Track vague language frequency

---

### PIC-3 — Understanding Student Misconceptions [AI]

> As per subject, the specific training should be shown.

**Description:** The teacher identifies and accurately corrects student errors and misconceptions during the lesson.

**What to measure:** Whether the teacher recognizes incorrect student responses and corrects them accurately — not just acknowledges them.

**Yes (1 point):**
- Identifies incorrect student response and corrects it accurately
- Addresses common misconceptions proactively: "Many people think X, but actually..."
- Prevents reinforcement of errors — does not accept wrong answers as correct
- COUNT: 2+ misconceptions identified and correctly addressed

**Partial (0.5 point):**
- Recognizes error but correction is incomplete or inaccurate
- Says "wrong" but does not provide correct answer
- COUNT: 1 misconception addressed OR recognition without full correction

**No (0 point):**
- Accepts incorrect student answers without correction
- Reinforces misconceptions
- Provides incorrect corrections
- COUNT: 0 misconceptions addressed OR errors reinforced

**AI Detection Method:**
- Detect correction patterns: "not quite," "actually," "that's incorrect," "the correct answer is"
- Identify proactive misconception language: "many people think"
- Track incorrect student responses followed by teacher correction
- Verify correction accuracy against knowledge base

---

### PIC-4 — Quality Questioning [AI]

**Description:** The teacher asks open-ended questions to promote thinking and uses probing follow-ups to deepen student responses.

**What to measure:** Whether the teacher initiates critical thinking through open-ended questions AND deepens it through probing follow-ups.

**Yes (1 point):**
- Asks open-ended questions requiring reasoning: "Why," "How," "What if," "Explain"
- Does not accept surface answers — probes deeper: "Why do you think that?" "Can you explain more?"
- Pushes for justification after student responses
- COUNT: 2+ open-ended questions AND at least 1 probing follow-up

**Partial (0.5 point):**
- Asks open-ended questions but does not probe deeper
- OR probes occasionally but majority of questions are closed or recall-based
- COUNT: 1-2 open-ended questions OR probing absent entirely

**No (0 point):**
- Predominantly yes/no or recall questions throughout
- No probing follow-ups at any point
- Students never pushed beyond one-word or surface answers
- COUNT: 0-1 open-ended questions AND 0 probing

**AI Detection Method:**
- Classify all questions (open vs. closed) — target: 70%+ open-ended
- Identify probing sequences (student answer → teacher follow-up)
- Count "why," "how," "explain," "justify" after student responses
- Track 5+ open questions + 3+ probing follow-ups

---

### PIC-5 — Effective Feedback [AI]

**Description:** The teacher provides specific, actionable verbal feedback that helps students understand what is correct, what is incorrect, and how to improve.

**What to measure:** Whether verbal feedback is specific and actionable — going beyond generic praise or correction to guide student improvement.

**Yes (1 point):**
- Feedback is specific and directly related to the task or learning objective
- Describes what is correct or incorrect: "You added instead of multiplied in step 3"
- Affirms with detail: "Your answer is correct because you identified the main idea"
- Guides next steps: "Try using this formula..." / "Next time, start by..."
- COUNT: 2+ instances of specific, actionable verbal feedback with clear guidance

**Partial (0.5 point):**
- Feedback present but generic throughout: "Good job," "Wrong," "Try again"
- OR feedback is specific occasionally but inconsistent
- OR feedback acknowledges response but does not guide improvement
- COUNT: Feedback present but lacking specificity OR guidance

**No (0 point):**
- No meaningful feedback given after student responses
- OR all feedback is generic with no guidance whatsoever
- OR feedback is so delayed it is disconnected from the student's response
- COUNT: 0–1 feedback instances OR entirely generic throughout

**AI Detection Method:**
- Timestamp student responses and teacher feedback (target: within 5 seconds)
- Classify feedback (generic vs. specific)
- Identify guidance language: "try," "use," "add," "change," "next time," "instead," "because"
- Track feedback rate (target: 80%+ responses get immediate feedback)

---

## Section C — Pedagogical Integrity Indicators — Advanced (5 indicators, Developmental Stage 3+)

### PIA-1 — Prior Knowledge [AI]

**Description:** The teacher activates students' existing knowledge and builds on their responses to connect to new content.

**What to measure:** Whether the teacher elicits prior knowledge AND genuinely builds on student responses — both must be present.

**Yes (1 point):**
- Teacher actively elicits what students already know
- Teacher genuinely builds on student responses — uses what students say to bridge into new content
- COUNT: At least 1 prior knowledge question + at least 1 instance of building on a student response — both must be present

**Partial (0.5 point):**
- Asks about prior knowledge but doesn't wait for or build on responses
- OR makes connections to past learning without checking what students actually remember
- COUNT: Either questioning OR building, but not both

**No (0 point):**
- Lesson starts directly with new content
- No mention of previous learning at any point
- COUNT: 0 prior knowledge questions and 0 building instances

**AI Detection Method:**
- Search for recall prompts: "remember," "last time," "we learned," "what do you know about"
- Detect question-response-building sequences
- Identify temporal references to past lessons

---

### PIA-2 — Meaningful Connections [AI]

> As per subject, the specific training should be shown.

**Description:** The teacher connects new content to something students can relate to — through real life examples, analogies, or cross-curricular links.

**What to measure:** Whether connections are explicitly verbalized and clearly explained — not just briefly mentioned.

**Yes (1 point):**
- Provides concrete real life examples: "Like when you [familiar experience]..."
- Uses analogies: "Think of this as similar to..."
- Real-world applications: "You use this when you [daily activity]..."
- Cross-curricular connections: "Remember in science when we..."
- Connection is clearly explained — not just mentioned
- COUNT: At least one distinct example/connection with clear explanation

**Partial (0.5 point):**
- Mentions connections but doesn't fully explain them
- Examples are superficial: "This is like real life" (without specifics)
- COUNT: Connections OR examples without elaboration

**No (0 point):**
- Purely abstract teaching
- No examples, analogies, or applications provided
- Content taught entirely in isolation
- COUNT: 0 connections to other contexts

**AI Detection Method:**
- Search for connection phrases: "like when," "for example," "imagine," "in real life," "similar to," "remember in"
- Identify analogy structures: "X is like Y because..."
- Detect cross-curricular references
- Count distinct connection instances (target: 3+)

---

### PIA-3 — Catering to Learning Levels [AI]

**Description:** The teacher verbally supports students at different learning levels through scaffolding, varied explanations, and extension opportunities.

**What to measure:** Whether the teacher uses verbal differentiation strategies — scaffolding for struggling students, varied explanation approaches, and extension for advanced students.

**Yes (1 point):**
- Scaffolds for struggling students: "Let's break this into smaller steps"
- Offers extension: "Those who finish can try this challenge"
- Provides different explanation approaches for same concept: "Let me explain it another way"
- COUNT: 2+ instances of verbal differentiation

**Partial (0.5 point):**
- Acknowledges different levels but doesn't act: "Some of you might find this hard"
- OR only 1 instance of verbal differentiation — not sustained
- COUNT: 1 verbal differentiation instance OR acknowledgment without action

**No (0 point):**
- Same explanation for all students throughout
- No scaffolding, extension, or variation at any point
- COUNT: 0 differentiation instances

**AI Detection Method:**
- Detect scaffolding language: "step by step," "break it down," "start with"
- Find extension language: "challenge," "if you finish," "harder example"
- Identify re-explanation variation: "another way," "differently," "think of it as"

---

### PIA-4 — Responsive Re-explanation [AI]

**Description:** When students struggle with a concept, the teacher re-explains using a different approach, example, or method rather than repeating the same explanation or moving on.

**What to measure:** Whether the teacher provides a genuinely different re-explanation — not the same words repeated.

> **Note:** Applicable only when lesson is pure revision with no new concept introduced.

**Yes (1 point):**
- Provides different approach in second explanation: "Let me explain it differently..." / "Think of it this way..."
- Uses new example or analogy not used in first explanation
- Re-explanation is genuinely different — not same words repeated
- Checks if new explanation worked: "Does that make more sense now?"
- COUNT: At least one solid re-explanation sequence with different approaches

**Partial (0.5 point):**
- Re-explains but uses same words or approach as first explanation
- Acknowledges confusion but doesn't fully address it
- COUNT: 1 re-explanation attempt but same approach repeated

**No (0 point):**
- No re-explanation at any point despite student confusion signals
- Repeats same explanation verbatim
- Moves on without addressing confusion
- COUNT: 0 re-explanations

**AI Detection Method:**
- Identify re-explanation phrases: "another way," "think of it as," "differently," "let me try again"
- Compare first and second explanations for variation
- Detect student confusion signals (context only): "I don't understand," "huh?", "what?"
- Track checks after re-explanation: "does that make sense," "is that clearer"

---

### PIA-5 — Student Agency & Participation [AI]

**Description:** The teacher provides genuine opportunities for students to lead, make choices, and take ownership of their learning.

**What to measure:** Whether students have real opportunities to lead, decide, or influence the direction of learning — not just respond to teacher questions.

**Yes (1 point):**
- Students are given genuine opportunity to lead, decide, or own something in the lesson
- Could be: leading an activity, deciding how to solve a problem, choosing an example, directing group work, or presenting their thinking
- Student voice is audible
- Teacher acts on student input
- COUNT: 1+ genuine opportunity where student leads, decides, or owns something meaningful

**Partial (0.5 point):**
- Students participate meaningfully but within tight teacher direction
- Teacher invites input but scope is narrow
- Student voice present but teacher retains all significant decisions
- COUNT: Student participation present but agency limited or constrained

**No (0 point):**
- Teacher makes all decisions
- No student choice, input, or voice invited at any point
- Purely teacher-directed from start to finish
- COUNT: 0 agency opportunities

**AI Detection Method:**
- Detect choice language: "you choose," "decide," "which do you prefer"
- Identify solicitation: "what do you think we should"
- Count genuine agency opportunities (target: 3+)
- Track student-initiated talk

---

## Section D — Model Alignment Indicators (1 indicator, Optimization Stage 4)

### MA-0 — Instructional Model Structure (GRR) [AI]

**Description:** The lesson follows a structured instructional model with a clear gradual release of responsibility — moving from teacher-led to student-led work.

**What to measure:** Whether all three instructional phases are present — teacher modeling (I Do), guided practice (We Do), and independent practice (You Do) — with teacher support visibly decreasing across the lesson.

**Yes (1 point):**
- Teacher modeling: Teacher demonstrates or explains the new concept/skill
- Guided practice: Teacher and students work together with teacher providing support
- Independent practice: Students work on their own with minimal teacher intervention
- Key evidence: Teacher support and involvement decreases as lesson progresses
- COUNT: All 3 phases present + clear shift from teacher-led to student-led work

**Partial (0.5 point):**
- Two phases present but missing one (commonly skips guided practice)
- OR all three phases present but teacher support level remains constant
- OR one phase very brief or unclear
- COUNT: 2 phases present OR weak progression

**No (0 point):**
- Lesson dominated by single mode: all lecture OR all independent work
- No evidence of instructional progression
- COUNT: 0-1 phases identifiable

**AI Detection Method:**
- Track teacher talk ratio across lesson timeline
- Verify teacher talk decreases over time (e.g., 80% → 50% → 20%)
- Detect phase transitions through changes in interaction patterns

> **Critical distinction:** SI2 measures lesson structure (beginning/middle/end). MA-0 measures instructional model (I Do/We Do/You Do).

---

## Section E — Subject-Specific Pedagogical Indicators (7 indicators)

### MATHEMATICS

#### M1 — Mathematical Discourse & Reasoning [AI]

**Description:** The teacher pushes students to explain their mathematical thinking and justify their solutions — focusing on process, not just the answer.

**What to measure:** Whether the teacher asks students to explain HOW they solved a problem and whether students produce audible mathematical reasoning at a level appropriate to their grade.

**Yes (1 point):**
- Teacher asks reasoning questions: "How do you know?" / "Why does that work?" / "Tell me how you solved it"
- Students produce audible mathematical reasoning at any grade-appropriate level:
  - Grade 1-2: "I counted on my fingers" / "because 2 and 2 make 4"
  - Grade 3-5: "I first added then subtracted" / "I knew it was wrong because..."
- Teacher presses for reasoning — does not accept answer-only responses
- COUNT: 2+ reasoning questions + at least 1 audible student explanation

**Partial (0.5 point):**
- Teacher asks reasoning questions but accepts one-word or answer-only responses
- OR reasoning prompted but students never produce explanation
- COUNT: 1-2 reasoning questions OR questions asked but no student explanation follows

**No (0 point):**
- Entirely answer-focused: "What is the answer?" with no how or why
- No student mathematical explanation at any point
- COUNT: 0 reasoning questions AND 0 student explanations

---

#### M2 — Problem-Solving & Productive Struggle [AI]

**Description:** The teacher presents challenging problems and allows students adequate think time to struggle productively — without rushing in with answers.

**What to measure:** Whether a genuinely challenging problem is presented, sufficient think time is allowed, and the teacher encourages persistence rather than immediately providing solutions.

**Yes (1 point):**
- Teacher presents a problem requiring genuine thinking (multi-step, non-routine, or unfamiliar)
- Teacher allows adequate think time appropriate to the problem
- Encourages persistence: "Keep trying, you're on the right track"
- Doesn't immediately give answers when students struggle
- COUNT: Challenging problem present + sufficient think time allowed + at least 1 encouragement

**Partial (0.5 point):**
- Problem is presented but think time is too brief
- OR problem is challenging but teacher jumps in too quickly
- OR encouragement is present but no real think time is given
- COUNT: Problem present but either think time OR teacher stance is insufficient

**No (0 point):**
- Only routine procedural practice (no problem-solving)
- Teacher immediately provides solutions
- No think time allowed
- COUNT: 0 problem-solving opportunities

---

### SCIENCE

#### S1 — Inquiry-Based Approach [AI]

**Description:** The teacher structures concept introduction so students think first — rather than being told the answer immediately.

**What to measure:** Whether the teacher withholds the answer and creates genuine space for student thinking before explaining — at any point in the lesson.

**Yes (1 point):**
- When introducing or exploring a concept, teacher does NOT give answer first
- Opens concept with a question, picture, or scenario
- Students are given genuine space to respond before teacher explains
- Teacher builds on at least one student response to guide toward concept
- COUNT: Inquiry approach present at least once + student thinking BEFORE teacher explanation

**Partial (0.5 point):**
- Teacher attempts inquiry opening but gives answer too quickly
- OR starts with inquiry but shifts to pure transmission
- OR asks "what do you think?" but dismisses all responses
- COUNT: Inquiry attempted but not sustained

**No (0 point):**
- Teacher starts directly with definition or explanation
- No space for student thinking at any point
- Pure transmission throughout
- COUNT: 0 inquiry moments

---

#### S2 — Science Talk & Student Sense-Making [AI]

**Description:** Students express science ideas in their own words — rather than echoing the teacher or giving one-word answers.

**What to measure:** Whether students verbally make sense of science concepts in their own words — student talk quality only, not teacher behavior.

**Yes (1 point):**
- Students express science ideas in their own words — not repeating teacher's exact phrase
- At least 2 students produce sentence-level science responses
- Students use any form of reasoning: "I think because..." / "Maybe it's because..."
- COUNT: 2+ students expressing science ideas in own words at sentence level

**Partial (0.5 point):**
- Some sentence-level responses but majority are one-word or chorus answers
- Students express ideas but only by repeating teacher's exact wording
- Only 1 student produces own-words expression
- COUNT: 1 student sentence-level science expression OR responses present but all echoed

**No (0 point):**
- All student responses are one-word, chorus, or direct repetition
- No student expresses a science idea in their own words at any point
- Pure IRE throughout
- COUNT: 0 instances of student science expression in own words

---

### LITERACY (English or Urdu)

#### L1 — Explicit Phonics/Decoding [AI]

**Description:** The teacher provides structured phonics instruction following a clear pedagogical sequence — from pronunciation and sound identification through to blending and segmenting.

**What to measure:** Whether phonics instruction follows the correct sequence — pronunciation → initial/final sounds → blending → segmenting.

**Yes (1 point):**
- Phonics instruction follows clear sequence: pronunciation → initial/final sounds → blending → segmenting
- Each step explicitly taught and modeled: "/b/ is the sound for letter B" / "Listen: /c/ /a/ /t/ = cat"
- Students practice at each stage — audible student responses present
- Sequence is complete and consistent
- COUNT: All 4 stages of phonics sequence present and explicitly taught

**Partial (0.5 point):**
- General phonics sequence present but inconsistencies or omissions evident
- Teacher exhibits overall structure but skips or rushes through one or more steps
- COUNT: 2-3 stages of phonics sequence present

**No (0 point):**
- Phonetic drill and sequenced structure completely skipped
- No phonics instruction at any point
- COUNT: 0-1 stages present

---

#### L2 — Comprehension Strategy Instruction [AI]

**Description:** The teacher explicitly teaches a reading comprehension strategy by naming it, modeling it, and having students practice it.

**What to measure:** Whether the complete strategy instruction sequence is present — name it, model it, practice it — all three must be present.

**Yes (1 point):**
- Names the strategy explicitly: "This is called predicting" / "Today we will practice summarizing"
- Models strategy with text: "Watch me — I think the next part will be about... because I can see..."
- Students practice strategy audibly
- COUNT: All 3 steps present — name + model + student practice

**Partial (0.5 point):**
- Names and models strategy but no student practice
- OR students practice but strategy never explicitly named or modeled
- COUNT: 2 out of 3 steps present

**No (0 point):**
- No strategy instruction at any point
- Teacher asks comprehension questions but never teaches HOW to comprehend
- COUNT: 0-1 steps present

---

#### L3 — Reading-Writing Connections [AI]

**Description:** The teacher explicitly connects reading and writing activities — using text as a model or prompt for student writing.

**What to measure:** Whether explicit verbal links between reading and writing are present — not just whether both activities happen in the same lesson.

**Yes (1 point):**
- Explicit links: "We read about X, now write about..."
- Uses text as model: "Notice how the author..., you can do that in your writing"
- Writing in response to text: "Write what you think will happen next"
- COUNT: 2+ explicit reading-writing connections

**Partial (0.5 point):**
- Reading and writing both happen but connection not explicit
- OR weak connection: "We read, now write" (no clear link)
- COUNT: 1 connection OR implicit connection

**No (0 point):**
- Reading and writing are completely separate
- OR only reading OR only writing (not both)
- No connection verbalized
- COUNT: 0 connections

---

## Section F — Student Learning Gain Proxies (SLGPs)

> **Definition:** Student Learning Gain Proxies are observable signals in a lesson transcript that indicate learning is actively happening — not just that teaching is occurring. They focus exclusively on what students say and how student speech changes across the lesson.
>
> Designed to work with the **collective student voice** (up to 50 students with no individual speaker identification) — patterns detectable across all student speech.

### SLGP-1 — Diversity of Conceptual Expression

**Question:** Do students express the concept in varied ways — or do they all repeat the teacher's exact words?

| Level | Criteria |
|---|---|
| **Strong** | Students use at least 3 different phrasings of the concept, none copying the teacher's wording — and at least one student uses a word or example the teacher never introduced |
| **Present** | Students phrase the concept in 2 or more ways but only use words and examples the teacher already introduced |
| **Partial** | All student responses copy the teacher's wording closely, or students only give very short answers — one word, a number, or a group chorus |
| **Not observed** | No student responses about the concept are present in the transcript |

---

### SLGP-2 — Student Reasoning in Responses

**Question:** Do students explain why an answer is correct — not just what the answer is?

| Level | Criteria |
|---|---|
| **Strong** | At least two student responses contain an explanation or reason — and at least one was not prompted by the teacher asking "why" |
| **Present** | At least one student response contains an explanation or reason, but only after the teacher explicitly asked for one |
| **Partial** | The teacher asked for reasoning at least once but no student response containing a reason followed |
| **Not observed** | The teacher never asked for reasoning and no student reasoning appears in the transcript |

---

### SLGP-3 — Student-Initiated Questions

**Question:** Do any students ask a genuine content question — showing they have processed the concept enough to identify a gap or an extension?

| Level | Criteria |
|---|---|
| **Strong** | At least one student asks a genuine content question that goes beyond what was taught — extending the concept, testing its limits, or connecting it to something else (requires human review) |
| **Present** | At least one student asks a clarification question about the concept — showing they are trying to understand something they are unsure about |
| **Partial** | Students ask only procedural questions ("what page?", "do we write it down?") with no content questions present |
| **Not observed** | No student questions of any kind appear in the transcript |

---

### SLGP-4 — Spontaneous Transfer and Connection-Making

**Question:** Does any student connect the lesson concept to something outside the lesson — from their own life, a previous lesson, or another subject?

| Level | Criteria |
|---|---|
| **Strong** | At least one student makes an unprompted connection between the lesson concept and something from outside the lesson (requires human review) |
| **Present** | A student makes a connection to something outside the lesson only after the teacher explicitly prompts them to |
| **Partial** | Teacher prompts for connections but no student makes one |
| **Not observed** | No connection-making activity present in the lesson at all |

---

### SLGP-5 — Visible Learning Progression Across the Lesson

**Question:** Do student responses about the concept sound more complete and accurate by the end of the lesson than at the beginning?

| Level | Criteria |
|---|---|
| **Strong** | By the end of the lesson, students use the concept's key vocabulary noticeably more often and in longer, more complete responses than at the start — including words that only the teacher used earlier |
| **Present** | Student responses are somewhat more complete or accurate by the end of the lesson but the improvement is modest or inconsistent |
| **Partial** | Student responses about the concept look similar at the end as at the start — no noticeable change |
| **Not observed** | Too few student responses to compare beginning and end (fewer than 3 student responses about the concept) |
