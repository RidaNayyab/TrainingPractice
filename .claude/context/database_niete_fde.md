# NIETE FDE Database — Fetching Observation Data

> Companion to `fde_observation_data_extraction.md` (full reference) and `dc_kappa_study_300_selection.md` (how the 300 were chosen). Used for the DC Kappa Study — pulling everything about an observation: recording details, teacher/school/lesson info, and the full Digital Coach scorecard.

---

## 1. Connection

Same database the NIETE admin portal uses: **FDE production**, `fde_production` schema.

| Variable | Meaning |
|---|---|
| `PROD_FDE_DATABASE_HOST` | Host |
| `PROD_FDE_DATABASE_NAME` | Database name |
| `PROD_FDE_DATABASE_USER` | Read-only user |
| `PROD_FDE_DATABASE_PASSWORD` | Password |

- **Port:** 2344
- **SSL required**

### psql example
```bash
psql "postgresql://${PROD_FDE_DATABASE_USER}:${PROD_FDE_DATABASE_PASSWORD}@${PROD_FDE_DATABASE_HOST}:2344/${PROD_FDE_DATABASE_NAME}?sslmode=require"
```

### Node example (pattern from `server/fde-db.ts`)
```js
import pg from 'pg';
const u = encodeURIComponent(process.env.PROD_FDE_DATABASE_USER);
const p = encodeURIComponent(process.env.PROD_FDE_DATABASE_PASSWORD);
const cs = `postgresql://${u}:${p}@${process.env.PROD_FDE_DATABASE_HOST}:2344/${process.env.PROD_FDE_DATABASE_NAME}`;
const pool = new pg.Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });
```

> `observation_id` is a **UUID** (e.g. `560a10a5-2a5a-4453-9de5-a312d9827fe5`), not a number. Always pass it as a string / parameter.

---

## 2. What you can fetch for one observation

| What | Where it comes from |
|---|---|
| Audio file URL, feedback text, status, date, "agreed with feedback" | `coaching_observation` (the header row) |
| Teacher name, school name, EMIS | `users_teacherprofile` → `users_user`, and `schools_school` |
| Subject and grade | The lesson plan's tags: `lesson_plan_corelessonplan.tags` |
| The DC scorecard (every indicator + its score) | `coaching_observationanswer` → `coaching_observationquestion` + `coaching_questionoption` |
| Section percentages (Section B / C / D) | Computed from the scorecard |

---

## 3. Header — recording, teacher, school, subject, grade

```sql
SELECT
  co.id::text                                            AS observation_id,
  co.observation_date,
  co.status,
  co.audio_url,
  co.feedback,
  co.teacher_response,
  co.agreed_with_feedback,
  tmpl.name                                              AS template,        -- "FICO V3"
  u.name                                                 AS teacher_name,
  s.emis::text                                           AS school_emis,
  s.name                                                 AS school_name,
  COALESCE(lp.tags->>'subject_label', lp.tags->>'subject') AS subject,
  lp.tags->>'grade'                                      AS grade,
  lp.tags->>'topic'                                      AS topic
FROM fde_production.coaching_observation co
JOIN fde_production.users_teacherprofile tp ON tp.id = co.user_profile_object_id
JOIN fde_production.users_user u            ON u.id  = tp.user_id
JOIN fde_production.schools_school s        ON s.id  = tp.school_id
LEFT JOIN fde_production.coaching_observationtemplate tmpl ON tmpl.id = co.template_id
LEFT JOIN fde_production.lesson_plan_corelessonplan lp     ON lp.id   = co.lesson_plan_id
WHERE co.id = '560a10a5-2a5a-4453-9de5-a312d9827fe5';   -- <-- your observation_id
```

### Example result (real row)
```
observation_id : 560a10a5-2a5a-4453-9de5-a312d9827fe5
observation_date: 2026-04-28
status         : completed
audio_url      : https://classroom-observations-audios.s3.ap-southeast-1.amazonaws.com/4205a6df-...m4a
template       : FICO V3
teacher_name   : Fatima Malik
school_emis    : 281
school_name    : IMSG (I-VIII) I-9/4
subject        : Eng
grade          : 1
```

---

## 4. The full DC scorecard — every indicator and its score

Returns one row per scored indicator: section, indicator text, tier, chosen answer, score bucket.

```sql
SELECT
  sec."order"  AS section_order,
  sec.title    AS section,           -- "Section B V3", "Section C V3", "Section D V3"
  q."order"    AS q_order,
  q.prompt     AS indicator,
  q.tier,                            -- structural / core / advanced / subject_specific
  opt.value    AS chosen,            -- YES / PARTIAL / NO / NOT_OBSERVED / ...
  opt.score_type                     -- yes / partial / no / na / not_observed / ignore
FROM fde_production.coaching_observationanswer a
JOIN fde_production.coaching_observationquestion q  ON q.id  = a.question_id
JOIN fde_production.coaching_observationsection sec ON sec.id = q.section_id
LEFT JOIN fde_production.coaching_questionoption opt ON opt.id = a.single_choice_option_id
WHERE a.observation_id = '560a10a5-2a5a-4453-9de5-a312d9827fe5'
  AND q.is_scored = true
ORDER BY sec."order", q."order";
```

### Example output
```
Section B V3 | q6  structural | YES/yes | The teacher clearly communicates the lesson's...
Section B V3 | q7  structural | YES/yes | The lesson progresses coherently from opening...
Section B V3 | q9  core       | YES/yes | The teacher's activities, tasks, and questions...
...
```

### How the score is read

| `score_type` | Meaning |
|---|---|
| `yes` | Indicator met (1 point) |
| `partial` | Partly met (0.5 point) |
| `no` | Not met (0 points) |
| `na` / `not_observed` / `ignore` | Excluded from the percentage (not counted as wrong) |

> For the coach-agreement (Kappa) comparison, the column you compare against each coach's answer is `chosen` (or `score_type`). Decide up front whether `PARTIAL` is its own category or folded into yes/no — and apply it the same way to both DC and coach answers.

---

## 5. Section percentages (B / C / D)

```sql
WITH scored AS (
  SELECT
    sec.title AS section,
    CASE opt.value
      WHEN 'YES'     THEN 1
      WHEN 'PARTIAL' THEN 0.5
      WHEN 'NO'      THEN 0
      ELSE NULL                       -- NOT_OBSERVED / NA / IGNORE = excluded
    END AS pts
  FROM fde_production.coaching_observationanswer a
  JOIN fde_production.coaching_observationquestion q  ON q.id  = a.question_id
  JOIN fde_production.coaching_observationsection sec ON sec.id = q.section_id
  LEFT JOIN fde_production.coaching_questionoption opt ON opt.id = a.single_choice_option_id
  WHERE a.observation_id = '560a10a5-2a5a-4453-9de5-a312d9827fe5'
    AND q.is_scored = true
)
SELECT section,
       SUM(pts)                                   AS earned,
       COUNT(pts)                                 AS denominator,
       ROUND(100.0 * SUM(pts) / NULLIF(COUNT(pts),0), 1) AS pct
FROM scored
WHERE pts IS NOT NULL
GROUP BY section
ORDER BY section;
```

### Example result
```
Section B V3 : 12 / 14 = 85.7%
Section D V3 : 1.0 / 2  = 50.0%
```

---

## 6. Do all 300 at once (Kappa study batch)

To pull the scorecard for every recording in the study, load the IDs from the CSV and pass them as an array. One row per indicator per observation — ready to save as a CSV for the analysts.

```sql
SELECT
  co.id::text  AS observation_id,
  sec.title    AS section,
  q."order"    AS q_order,
  q.prompt     AS indicator,
  q.tier,
  opt.value    AS dc_chosen,
  opt.score_type AS dc_score_type,
  CASE opt.value WHEN 'YES' THEN 1 WHEN 'PARTIAL' THEN 0.5 WHEN 'NO' THEN 0 ELSE NULL END AS dc_points
FROM fde_production.coaching_observation co
JOIN fde_production.coaching_observationanswer a    ON a.observation_id = co.id
JOIN fde_production.coaching_observationquestion q  ON q.id  = a.question_id
JOIN fde_production.coaching_observationsection sec ON sec.id = q.section_id
LEFT JOIN fde_production.coaching_questionoption opt ON opt.id = a.single_choice_option_id
WHERE co.id = ANY(:observation_ids::uuid[])    -- the 300 IDs from the CSV
  AND q.is_scored = true
ORDER BY co.id, sec."order", q."order";
```

In Node, read the first column of `exports/dc_study_groupA_300.csv`, drop the header, and pass the array as `$1` with `::uuid[]`.

### Quick psql dump to CSV
```bash
psql "postgresql://${PROD_FDE_DATABASE_USER}:${PROD_FDE_DATABASE_PASSWORD}@${PROD_FDE_DATABASE_HOST}:2344/${PROD_FDE_DATABASE_NAME}?sslmode=require" \
  -c "\copy ( <the query in section 6, with the array filled in> ) TO 'dc_scores_300.csv' CSV HEADER"
```

---

## 7. Quick reference: the tables involved

| Table | Role |
|---|---|
| `coaching_observation` | One row per recording (audio_url, feedback, status, links) |
| `coaching_observationanswer` | One row per indicator answered |
| `coaching_observationquestion` | The indicator text, section, tier, `is_scored` |
| `coaching_observationsection` | Section grouping (B / C / D V3) |
| `coaching_questionoption` | The chosen option and its `score_type` |
| `coaching_observationtemplate` | Rubric name (FICO V3) |
| `users_teacherprofile` → `users_user` | The teacher |
| `schools_school` | School name + EMIS |
| `lesson_plan_corelessonplan` | `tags` JSON — subject + grade |

---

## 8. Gotchas (study-specific)

1. **`observation_id` is a UUID** — pass it as text/`uuid`, never as a number.
2. **Subject/grade live on the lesson plan**, not the observation. If `lesson_plan_id` doesn't resolve in `lesson_plan_corelessonplan`, fall back to the legacy join in §6 of the main guide.
3. **Exclude `is_scored = false` questions** from any percentage — they are coach-reflection narratives, not scored indicators.
4. **`NOT_OBSERVED` / `NA` / `IGNORE` are excluded** from the denominator — they are not the same as a "no".
5. **All 300 are FICO V3** (`template_id = 2`), teacher observations (`user_profile_content_type_id = 65`), status `completed`.
6. **Audio length is not in the database** — the `total_duration` column is empty for these rows. If you need to confirm the 15-minute minimum, measure it from the `audio_url` file itself.

---

## Related Project Databases

| Database | Purpose | Connection |
|---|---|---|
| **NIETE FDE Production** | Source of truth for observations, teachers, schools, scorecard | `${PROD_FDE_DATABASE_HOST}:2344` (SSL required) — read-only |
| **Railway (cooperative-endurance)** | This project's own DB for `generated_practice_questions` | `zephyr.proxy.rlwy.net:36200` — credentials in `.env.local` |

> **Observation period for the DC Study:** April–May (300 observations selected for Kappa study). All FICO V3 template. The April–May 2026 observations provide real classroom context for understanding teacher patterns.
