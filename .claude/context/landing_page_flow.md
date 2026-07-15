# Landing Page Flow — Region → School → Teacher → Observation

The primary user journey. Sources data from NIETE FDE (2,487 real classroom observations across 558 teachers, 150 schools, 7 regions).

## The chain

```
┌────────────┐     ┌────────────┐     ┌────────────┐     ┌──────────────┐
│  Region ▼  │───▶ │  School ▼  │───▶ │  Teacher ▼ │───▶ │ Observation  │
│  (7)       │     │  (varies)  │     │  (varies)  │     │ list (varies)│
└────────────┘     └────────────┘     └────────────┘     └──────┬───────┘
                                                                 │
                                                                 ▼
                                     ┌───────────────────────────────────┐
                                     │ FeedbackTrainingModule            │
                                     │  1. Show observation feedback     │
                                     │  2. Matcher picks training video  │
                                     │  3. Teacher watches video         │
                                     │  4. Practice mode choice:         │
                                     │     - Scenario Questions          │
                                     │     - Roleplay                    │
                                     │  5. Coaching feedback saved       │
                                     └───────────────────────────────────┘
```

Each step's dropdown is disabled until the previous is picked. Downstream state clears on any change up-chain (change region → schools/teachers/observations reset).

## Frontend component

**File:** `src/TestPage.tsx`

**State:**
```ts
regions: Region[]              // loaded on mount from /api/niete/regions
schools: School[]              // loaded when region selected
teachers: Teacher[]            // loaded when school selected
observations: Observation[]    // loaded when teacher selected
selectedRegion: string
selectedSchool: string
selectedTeacher: Teacher | null
selectedObservation: Observation | null
highestPriorityIndicator: string | null
showTrainingModule: boolean
```

Each `useEffect` watches its trigger state and fetches the next level. Downstream state resets to clear stale data.

## Backend endpoints (all read from in-memory `nieteObsCache`)

### `GET /api/niete/regions`

Returns every region with rollup counts.

```json
[
  { "region_name": "Urban-I", "region_id": "5", "obs_count": 1072, "school_count": 23, "teacher_count": 160 },
  { "region_name": "Tarnol", "region_id": "4", "obs_count": 526, "school_count": 25, "teacher_count": 90 },
  ...
]
```

Sorted alphabetically by region name.

### `GET /api/niete/schools?region=NAME`

Returns schools in the given region with rollup counts.

```json
[
  { "school_id": "119", "school_name": "IMCB Maira Begwal", "region_name": "B.K", "obs_count": 2, "teacher_count": 1 },
  ...
]
```

### `GET /api/niete/teachers?schoolId=ID`

Optionally also accepts `?region=X` to further scope. Returns teachers at the school.

```json
[
  { "teacher_id": "112668", "teacher_name": "Fatima Malik", "school_name": "IMSG (I-VIII) I-9/4", "region_name": "Urban-I", "obs_count": 8 },
  ...
]
```

`teacher_id` is the NIETE `users_user.id` as a string.

### `GET /api/niete/teacher/:teacherId/observations`

All observations for the teacher, most recent first. Each row includes:

```json
{
  "id": "560a10a5-2a5a-4453-9de5-a312d9827fe5",
  "teacher_id": "112668",
  "teacher_name": "Fatima Malik",
  "school_id": "281",
  "school_name": "IMSG (I-VIII) I-9/4",
  "region_id": "5",
  "region_name": "Urban-I",
  "subject": "Eng",
  "grade": "1",
  "topic": "...",
  "observation_date": "2026-04-28",
  "feedback_english": "Based on today's observation... [full coach feedback]",
  "improvement_areas": [
    { "indicator_code": "SI1", "indicator_name": "Instructional Clarity", "score": "NO" }
  ],
  "results_json": { "section_b": { "SI1": "NO", "SI2": "YES", ... } },
  "rubric_type": "FICO V3",
  "source": "niete"
}
```

### `GET /api/niete/observation/:observationId`

Same shape as above — a single observation by UUID.

### `GET /api/niete/observation/:observationId/highest-priority-indicator`

Reads THIS observation's `improvement_areas`, keeps only those in `trainings.json` (skips gaps), sorts by priority rank (from `indicator-priority-matrix.json`), returns the highest-priority one.

```json
{ "indicator": "SI1" }
```

Or `{ "indicator": null }` if no flagged indicator has a training video.

### `GET /api/niete/observation/:observationId/feedback`

The observation's coach feedback text + list of flagged indicator codes. Rarely used directly (the matcher endpoint pulls this itself when given `?observationId=X`).

## Downstream flow (unchanged by NIETE)

When teacher picks an observation → landing page opens `FeedbackTrainingModule` with:

```tsx
<FeedbackTrainingModule
  teacherId={selectedTeacher.teacher_id}
  indicatorCode={highestPriorityIndicator}
  observationId={selectedObservation.id}    // pins matcher + feedback to THIS observation
/>
```

The module then:
1. Fetches `/api/niete/observation/:id` for the exact observation (not the teacher's most-recent — fixes a bug where clicking any observation showed the same feedback)
2. Fetches `/api/training/:code/for-teacher/:id?observationId=X` — matcher pins to this observation's feedback so different observations of the same teacher can produce different training picks
3. Fetches `/api/practice/:code?trainingCode=X` for the specific practice questions
4. Renders the coach feedback, training video, practice choice screen, and either PracticeFlow or SimulationFlow depending on the teacher's pick

## The cache — how it's populated

`loadNieteObservations()` runs once at server boot:

```sql
SELECT co.id, co.observation_date, co.feedback,
       u.id AS user_id, u.name AS teacher_name,
       s.id AS school_id, s.name AS school_name, s.region_id,
       sr.name AS region_name,
       lp.tags->>'subject_label' AS subject,
       lp.tags->>'grade' AS grade,
       lp.tags->>'topic' AS topic
FROM fde_production.coaching_observation co
JOIN fde_production.users_teacherprofile tp ON tp.id = co.user_profile_object_id
JOIN fde_production.users_user u             ON u.id = tp.user_id
JOIN fde_production.schools_school s         ON s.id = tp.school_id
LEFT JOIN fde_production.schools_schoolregion sr ON sr.id = s.region_id
LEFT JOIN fde_production.lesson_plan_corelessonplan lp ON lp.id = co.lesson_plan_id
WHERE co.template_id = 2 AND co.status = 'completed'
ORDER BY co.observation_date DESC
```

Then a second query pulls all scored answers, and for each observation:
- Matches each answer's question prompt to a FICO rubric indicator using `ficoDescMap` (60-char prefix match)
- Where score_type='no' → adds an `improvement_areas` entry
- All score_types → populates `results_json.section_b`

## Design notes

- **Regions include an "Unassigned" bucket** (74 obs, 3 schools) for schools with `region_id=NULL`. Kept so those observations remain reachable.
- **Cache is refresh-on-restart.** New observations in NIETE won't appear until the server is restarted. Fine for prototype; production would want a background refresh job.
- **Observation IDs are UUIDs** (e.g. `560a10a5-2a5a-4453-9de5-a312d9827fe5`) not integers — pass as strings.
- **Real school names.** These are actual Islamabad-area public schools. Handle names respectfully in UI (no truncation that could look mocking).
