import express from 'express';
import cors from 'cors';
import { Client, Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Anthropic } from '@anthropic-ai/sdk';

dotenv.config({ path: '.env.local' });

const app = express();
const PORT = 3001;
const client = new Anthropic();  // kept for legacy fallback; primary AI path is now OpenRouter

// ─── OpenRouter (OpenAI-compatible) chat helper ────────────────────────────
// Used for question generation, training matcher, response evaluator, and AI-student simulator.
// GPT-5.1 via OpenRouter is the single AI provider for all Claude-style calls in this server.
const OPENROUTER_MODEL = 'openai/gpt-5.1';
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

interface ORMessage { role: 'system' | 'user' | 'assistant'; content: string; }

async function callOpenRouterChat(opts: {
  model?: string;
  system?: string;
  messages: ORMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not set in .env.local');
  }
  const fullMessages: ORMessage[] = opts.system
    ? [{ role: 'system', content: opts.system }, ...opts.messages]
    : opts.messages;
  const r = await fetch(OPENROUTER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model || OPENROUTER_MODEL,
      max_tokens: opts.maxTokens ?? 800,
      temperature: opts.temperature ?? 0.7,
      messages: fullMessages,
    }),
  });
  if (!r.ok) {
    const errText = await r.text();
    throw new Error(`OpenRouter ${r.status}: ${errText.slice(0, 400)}`);
  }
  const data = await r.json();
  return data.choices?.[0]?.message?.content ?? '';
}

app.use(cors());
// Raw binary handling for audio uploads
app.use('/api/upload-audio', express.raw({ type: 'audio/*', limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));

// Load data files
const trainingsPath = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'data/trainings.json');
const matrixPath = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'data/indicator-priority-matrix.json');
const practiceQuestionsPath = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'data/practiceQuestions.json');
const rubricPath = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'data/evaluationRubric.json');
const questionGenPath = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'data/questionGenerationPrompt.json');
const contextualTrainingDataPath = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'data/contextualTrainingData.json');

const trainings = JSON.parse(fs.readFileSync(trainingsPath, 'utf-8'));
const priorityMatrix = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));
const practiceQuestions = JSON.parse(fs.readFileSync(practiceQuestionsPath, 'utf-8'));
const evaluationRubric = JSON.parse(fs.readFileSync(rubricPath, 'utf-8'));
const questionGenConfig = JSON.parse(fs.readFileSync(questionGenPath, 'utf-8'));
const contextualTrainingData = JSON.parse(fs.readFileSync(contextualTrainingDataPath, 'utf-8'));

// Parse FICO V3 rubric markdown into { indicatorCode: rubricSection } map + description map for DB matching
const ficoRubricPath = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '.claude', 'context', 'fico_v3_indicator_rubric.md');
const ficoRubricMap: Record<string, string> = {};
const ficoDescMap: Record<string, string> = {};
const ficoNameMap: Record<string, string> = {};
try {
  const ficoRaw = fs.readFileSync(ficoRubricPath, 'utf-8');
  const headingRegex = /^(#{3,4}) ([A-Z]+-?\d+) — (.+?)$/gm;
  const matches: Array<{ code: string; name: string; start: number; level: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = headingRegex.exec(ficoRaw)) !== null) {
    const name = m[3].replace(/\s*\[AI\]\s*$/, '').trim();
    matches.push({ code: m[2], name, start: m.index, level: m[1].length });
    ficoNameMap[m[2]] = name;
  }
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    let end = ficoRaw.length;
    for (let j = i + 1; j < matches.length; j++) {
      if (matches[j].level <= cur.level) { end = matches[j].start; break; }
    }
    // Stop at the next "## " section header — search from after the heading line so we don't match the current heading itself
    const lineEnd = ficoRaw.indexOf('\n', cur.start);
    const searchFrom = lineEnd === -1 ? cur.start : lineEnd + 1;
    const sectionMatch = ficoRaw.slice(searchFrom).search(/^## [^#]/m);
    if (sectionMatch !== -1 && searchFrom + sectionMatch < end) {
      end = searchFrom + sectionMatch;
    }
    const section = ficoRaw.slice(cur.start, end).trim();
    ficoRubricMap[cur.code] = section;
    const descMatch = section.match(/\*\*Description:\*\*\s*([^\n]+)/);
    if (descMatch) ficoDescMap[cur.code] = descMatch[1].trim();
  }
  console.log(`[DEBUG] FICO rubric loaded: ${Object.keys(ficoRubricMap).length} indicators, ${Object.keys(ficoDescMap).length} with descriptions`);
} catch (e) {
  console.warn(`[WARN] Could not load FICO rubric from ${ficoRubricPath}:`, (e as any).message);
}

// Load the roleplay prompt template. This is the source of truth for /api/roleplay behavior —
// edit .claude/context/roleplay_prompt.md and restart the server, no code changes needed.
const roleplayPromptPath = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '.claude', 'context', 'roleplay_prompt.md');
let roleplayPromptTemplate = '';
try {
  const raw = fs.readFileSync(roleplayPromptPath, 'utf-8');
  // Extract the fenced ``` block that holds the actual prompt (skip the surrounding docs)
  const m = raw.match(/```\s*\n([\s\S]*?)\n```/);
  roleplayPromptTemplate = m ? m[1].trim() : raw.trim();
  console.log(`[DEBUG] Roleplay prompt loaded: ${roleplayPromptTemplate.length} chars`);
} catch (e) {
  console.warn(`[WARN] Could not load roleplay prompt from ${roleplayPromptPath}:`, (e as any).message);
}

// Debug: Log SI1 and SI3 priority ranks at startup
const si1Rank = priorityMatrix.tiers.tier_1_structural.indicators.SI1.priority_rank;
const si3Rank = priorityMatrix.tiers.tier_1_structural.indicators.SI3.priority_rank;
console.log(`[DEBUG] Priority Matrix Loaded: SI1=${si1Rank}, SI3=${si3Rank}`);

let observationsCache: any[] = [];
let tierCache = new Map<string, any>();

const dbClient = new Client({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

// NIETE FDE production pool — read-only, SSL required. Lazy: only connects when env vars are present.
let fdePool: Pool | null = null;
const fdeHost = process.env.FDE_DATABASE_HOST || process.env.PROD_FDE_DATABASE_HOST;
const fdeUser = process.env.FDE_DATABASE_USER || process.env.PROD_FDE_DATABASE_USER;
const fdePassword = process.env.FDE_DATABASE_PASSWORD || process.env.PROD_FDE_DATABASE_PASSWORD;
const fdeName = process.env.FDE_DATABASE_NAME || process.env.PROD_FDE_DATABASE_NAME;
const fdePort = process.env.FDE_DATABASE_PORT || '2344';
if (fdeHost && fdeUser && fdePassword && fdeName) {
  fdePool = new Pool({
    host: fdeHost,
    port: parseInt(fdePort),
    user: fdeUser,
    password: fdePassword,
    database: fdeName,
    ssl: { rejectUnauthorized: false },
  });
  console.log(`[DEBUG] NIETE FDE pool configured (host=${fdeHost}, port=${fdePort}, db=${fdeName})`);
} else {
  console.log('[DEBUG] NIETE FDE not configured (missing FDE_DATABASE_* env vars) — falling back to Railway observations only');
}

// Cache of failure-rate stats per indicator, sourced from NIETE FDE 300-observation study
const fdeIndicatorStats: Map<string, { total: number; noCount: number; partialCount: number; yesCount: number; failureRate: number }> = new Map();

async function loadFdeIndicatorStats() {
  if (!fdePool) return;
  if (Object.keys(ficoDescMap).length === 0) {
    console.warn('[WARN] FICO descriptions not loaded — skipping NIETE stats (cannot map question prompts to indicator codes)');
    return;
  }
  try {
    // Step 1: build question_id → indicator_code mapping by matching DB prompts to rubric descriptions
    const qResult = await fdePool.query(`
      SELECT q.id::text AS question_id, q.prompt
      FROM fde_production.coaching_observationquestion q
      JOIN fde_production.coaching_observationsection sec ON sec.id = q.section_id
      WHERE q.is_scored = true AND sec.title LIKE '%V3%'
    `);

    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
    const questionIdToCode = new Map<string, string>();
    for (const row of qResult.rows) {
      const promptNorm = norm(row.prompt);
      for (const [code, desc] of Object.entries(ficoDescMap)) {
        if (promptNorm.startsWith(norm(desc).slice(0, 60))) {
          questionIdToCode.set(row.question_id, code);
          break;
        }
      }
    }
    console.log(`[DEBUG] NIETE FDE mapped ${questionIdToCode.size}/${qResult.rows.length} V3 questions to rubric indicators`);

    // Step 2: aggregate score buckets per question_id across all completed FICO V3 observations
    const sResult = await fdePool.query(`
      SELECT a.question_id::text AS question_id, opt.score_type, COUNT(*)::int AS n
      FROM fde_production.coaching_observation co
      JOIN fde_production.coaching_observationanswer a ON a.observation_id = co.id
      LEFT JOIN fde_production.coaching_questionoption opt ON opt.id = a.single_choice_option_id
      WHERE co.template_id = 2
        AND co.status = 'completed'
        AND opt.score_type IN ('yes','partial','no')
      GROUP BY 1, 2
    `);

    const byCode: Record<string, { yes: number; partial: number; no: number }> = {};
    for (const row of sResult.rows) {
      const code = questionIdToCode.get(row.question_id);
      if (!code) continue;
      if (!byCode[code]) byCode[code] = { yes: 0, partial: 0, no: 0 };
      byCode[code][row.score_type as 'yes' | 'partial' | 'no'] += row.n;
    }

    for (const [code, counts] of Object.entries(byCode)) {
      const total = counts.yes + counts.partial + counts.no;
      if (total === 0) continue;
      fdeIndicatorStats.set(code, {
        total,
        yesCount: counts.yes,
        partialCount: counts.partial,
        noCount: counts.no,
        failureRate: Math.round(1000 * (counts.no + 0.5 * counts.partial) / total) / 10,
      });
    }
    console.log(`[DEBUG] NIETE FDE stats loaded for ${fdeIndicatorStats.size} indicators across ${sResult.rows.length} score rows`);
    for (const [code, stats] of fdeIndicatorStats.entries()) {
      console.log(`  ${code}: ${stats.failureRate}% miss rate (${stats.noCount} NO / ${stats.partialCount} PARTIAL / ${stats.yesCount} YES, n=${stats.total})`);
    }
  } catch (e) {
    console.warn('[WARN] Could not load NIETE FDE stats:', (e as any).message);
  }
}

async function initialize() {
  try {
    console.log('🔄 Connecting to database...');
    await dbClient.connect();
    console.log('✅ Connected');

    // Load observations with feedback
    const obsResult = await dbClient.query(`
      SELECT id, teacher_id, transcription, subject, grade, region, rubric_type, created_at,
        results_json,
        (SELECT feedback_english FROM observation_feedback_loops WHERE observation_id = o.id LIMIT 1) as feedback_english,
        (SELECT improvement_areas FROM observation_feedback_loops WHERE observation_id = o.id LIMIT 1) as improvement_areas
      FROM observations o
      ORDER BY o.teacher_id, o.created_at DESC
    `);

    // Load teacher tier progression data
    const tierResult = await dbClient.query(`
      SELECT teacher_id, current_tier, tier_achieved_at, tier_history
      FROM teacher_tier_progression
    `);

    tierResult.rows.forEach((row: any) => {
      tierCache.set(row.teacher_id, {
        current_tier: row.current_tier,
        tier_achieved_at: row.tier_achieved_at,
        tier_history: row.tier_history,
      });
    });

    observationsCache = obsResult.rows;

    console.log(`✅ Loaded ${observationsCache.length} observations (Railway)`);
    console.log(`✅ Loaded tier data for ${tierCache.size} teachers`);

    // Ensure the teacher-response persistence table exists.
    // - Scenario mode: one row per submitted question (with evaluation).
    // - Roleplay mode: one row per SESSION, upserted on every turn — abandoned sessions still keep
    //   whatever was completed. session_id ties turns together; evaluation stays null until the
    //   final turn scoring.
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS teacher_practice_attempts (
        id SERIAL PRIMARY KEY,
        teacher_id VARCHAR(50) NOT NULL,
        indicator_code VARCHAR(50) NOT NULL,
        training_code VARCHAR(50),
        mode VARCHAR(20) NOT NULL,
        question_id VARCHAR(100),
        session_id VARCHAR(64),
        turn_number INTEGER,
        is_complete BOOLEAN DEFAULT FALSE,
        scenario TEXT,
        prompt TEXT,
        rubric_criteria TEXT[],
        response TEXT,
        conversation_history JSONB,
        evaluation JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    // Older DBs may have the pre-migration NOT NULL constraint + missing columns — apply idempotently.
    await dbClient.query(`ALTER TABLE teacher_practice_attempts ALTER COLUMN evaluation DROP NOT NULL`).catch(() => {});
    await dbClient.query(`ALTER TABLE teacher_practice_attempts ADD COLUMN IF NOT EXISTS session_id VARCHAR(64)`);
    await dbClient.query(`ALTER TABLE teacher_practice_attempts ADD COLUMN IF NOT EXISTS turn_number INTEGER`);
    await dbClient.query(`ALTER TABLE teacher_practice_attempts ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT FALSE`);
    await dbClient.query(`ALTER TABLE teacher_practice_attempts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);
    await dbClient.query(`CREATE INDEX IF NOT EXISTS idx_tpa_teacher ON teacher_practice_attempts (teacher_id)`);
    await dbClient.query(`CREATE INDEX IF NOT EXISTS idx_tpa_ind_train ON teacher_practice_attempts (indicator_code, training_code)`);
    // Drop the older partial-unique variant if present (ON CONFLICT can't use partial indexes)
    await dbClient.query(`DROP INDEX IF EXISTS idx_tpa_session`);
    // Regular UNIQUE index — multiple NULL session_ids are treated as distinct by Postgres,
    // so scenario-mode rows (session_id NULL) coexist freely.
    await dbClient.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_tpa_session_unique ON teacher_practice_attempts (session_id)`);
    console.log(`✅ teacher_practice_attempts table ready`);

    await dbClient.end();
    console.log('📴 Railway DB closed');

    // Probe NIETE FDE in parallel with Railway — non-fatal if unavailable
    await loadFdeIndicatorStats();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

// Persist a teacher practice attempt (scenario or roleplay).
// - Scenario: always INSERT — each submitted question is a fresh row.
// - Roleplay: upsert-by-session_id — first turn INSERTs, subsequent turns UPDATE the same row
//   (so abandoned mid-sessions still keep whatever was captured).
// Fire-and-log-on-error so persistence failure never blocks coaching feedback from reaching the teacher.
async function persistPracticeAttempt(row: {
  teacherId: string;
  indicatorCode: string;
  trainingCode?: string;
  mode: 'scenario' | 'roleplay';
  questionId?: string;
  sessionId?: string;      // required for roleplay upsert
  turnNumber?: number;
  isComplete?: boolean;
  scenario?: string;
  prompt?: string;
  rubricCriteria?: string[];
  response?: string;
  conversationHistory?: any[];
  evaluation?: any | null;  // null for mid-roleplay turns, populated on scenario submit + roleplay final turn
}): Promise<void> {
  const conn = new Client({
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT || '5432'),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
  });
  try {
    await conn.connect();

    if (row.mode === 'roleplay' && row.sessionId) {
      // Upsert on session_id: keeps a single row per roleplay session, updated turn-by-turn
      const r = await conn.query(
        `INSERT INTO teacher_practice_attempts
          (teacher_id, indicator_code, training_code, mode, session_id, turn_number, is_complete,
           scenario, prompt, rubric_criteria, conversation_history, evaluation, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
         ON CONFLICT (session_id) DO UPDATE SET
           turn_number = EXCLUDED.turn_number,
           is_complete = EXCLUDED.is_complete OR teacher_practice_attempts.is_complete,
           conversation_history = EXCLUDED.conversation_history,
           evaluation = COALESCE(EXCLUDED.evaluation, teacher_practice_attempts.evaluation),
           updated_at = NOW()
         RETURNING id, (xmax = 0) AS inserted`,
        [
          row.teacherId,
          row.indicatorCode,
          row.trainingCode || null,
          row.mode,
          row.sessionId,
          row.turnNumber ?? null,
          !!row.isComplete,
          row.scenario || null,
          row.prompt || null,
          row.rubricCriteria || null,
          row.conversationHistory ? JSON.stringify(row.conversationHistory) : null,
          row.evaluation ? JSON.stringify(row.evaluation) : null,
        ]
      );
      const { id, inserted } = r.rows[0];
      console.log(`[SAVE-ATTEMPT] ${inserted ? 'INSERT' : 'UPDATE'} id=${id} session=${row.sessionId} teacher=${row.teacherId} roleplay/${row.indicatorCode} turn=${row.turnNumber} complete=${row.isComplete}`);
    } else {
      // Scenario: always INSERT a new row per submitted question
      const r = await conn.query(
        `INSERT INTO teacher_practice_attempts
          (teacher_id, indicator_code, training_code, mode, question_id, scenario, prompt,
           rubric_criteria, response, evaluation, is_complete)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          row.teacherId,
          row.indicatorCode,
          row.trainingCode || null,
          row.mode,
          row.questionId || null,
          row.scenario || null,
          row.prompt || null,
          row.rubricCriteria || null,
          row.response || null,
          row.evaluation ? JSON.stringify(row.evaluation) : null,
          true,
        ]
      );
      console.log(`[SAVE-ATTEMPT] INSERT id=${r.rows[0].id} teacher=${row.teacherId} scenario/${row.indicatorCode}/${row.trainingCode || '-'} q=${row.questionId}`);
    }
  } catch (err) {
    console.error('[ERROR] persistPracticeAttempt failed:', err instanceof Error ? err.message : err);
  } finally {
    try { await conn.end(); } catch {}
  }
}

function getFlaggedIndicators(obs) {
  const flagged = new Set();

  if (obs.improvement_areas) {
    let areas = obs.improvement_areas;
    if (typeof areas === 'string') {
      try { areas = JSON.parse(areas); } catch (e) { areas = []; }
    }
    if (Array.isArray(areas)) {
      areas.forEach(a => {
        if (a.score === 'NO' && a.indicator_code) flagged.add(a.indicator_code);
      });
    }
  }

  if (obs.results_json && typeof obs.results_json === 'object') {
    const r = obs.results_json;
    if (r.section_b) Object.entries(r.section_b).forEach(([k, v]) => { if (v === 'NO') flagged.add(k); });
    if (r.section_c) Object.entries(r.section_c).forEach(([k, v]) => { if (v === 'NO') flagged.add(k); });
  }

  return flagged;
}

// Get which tier a teacher has unlocked (from cache)
function getUnlockedTiers(teacherId: string): string[] {
  const tierData = tierCache.get(teacherId);

  if (!tierData) {
    console.log(`[DEBUG] No tier data found for teacher ${teacherId}, defaulting to structural`);
    return ['tier_1_structural'];
  }

  const currentTier = tierData.current_tier?.toLowerCase() || 'structural';
  console.log(`[DEBUG] Teacher ${teacherId} tier: ${currentTier}`);

  // Build list of unlocked tiers based on current tier progression
  const tiers: string[] = [];
  if (currentTier === 'structural' || currentTier === 'core' || currentTier === 'advanced' || currentTier === 'subject-specific') {
    tiers.push('tier_1_structural');
  }
  if (currentTier === 'core' || currentTier === 'advanced' || currentTier === 'subject-specific') {
    tiers.push('tier_2_core');
  }
  if (currentTier === 'advanced' || currentTier === 'subject-specific') {
    tiers.push('tier_3_advanced');
  }
  if (currentTier === 'subject-specific') {
    tiers.push('tier_4_subject-specific');
  }

  return tiers.length > 0 ? tiers : ['tier_1_structural'];
}

// Get all indicators available in unlocked tiers
function getUnlockedIndicators(tiersList) {
  const indicators = new Set();

  tiersList.forEach(tierKey => {
    const tier = priorityMatrix.tiers[tierKey];
    if (tier && tier.indicators) {
      Object.keys(tier.indicators).forEach(code => indicators.add(code));
    }
  });

  console.log(`[DEBUG] Unlocked tiers: ${tiersList.join(', ')} → Indicators: ${Array.from(indicators).join(', ')}`);
  return indicators;
}

// Get priority rank for an indicator
function getPriorityRank(indicatorCode) {
  const tiers = priorityMatrix.tiers;

  for (const tierKey of Object.keys(tiers)) {
    const tier = tiers[tierKey];
    if (tier && tier.indicators && tier.indicators[indicatorCode]) {
      const ind = tier.indicators[indicatorCode];
      const rank = ind.priority_rank || 99;
      console.log(`[DEBUG] getPriorityRank(${indicatorCode}) found in ${tierKey}, priority_rank=${rank}, full object=${JSON.stringify(ind)}`);
      return rank;
    }
  }

  console.log(`[DEBUG] getPriorityRank(${indicatorCode}) NOT FOUND in any tier`);
  return 99;
}

// Use Claude AI to match feedback to appropriate training resource
// Extract only the section of a coach's structured feedback that pertains to a specific indicator
// (e.g. for SI1, grabs only the "**Instructional Clarity**" paragraph from a feedback that lists SI1, SI3, SI2)
function extractIndicatorFeedbackSection(fullFeedback: string, indicatorCode: string): string {
  const indicatorName = ficoNameMap[indicatorCode];
  if (!indicatorName || !fullFeedback) return fullFeedback;

  // Match the heading "**{indicatorName}**" (with optional numbering before) and capture until the next "**Something**" heading or end
  const escapedName = indicatorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const sectionRegex = new RegExp(`\\*\\*\\s*${escapedName}\\s*\\*\\*([\\s\\S]*?)(?=\\n\\s*\\d+\\.\\s*\\*\\*[^*]+\\*\\*|\\n\\s*\\*\\*[A-Z][^*]+\\*\\*|$)`, 'i');
  const m = fullFeedback.match(sectionRegex);
  return m ? `${indicatorName}: ${m[1].trim()}` : fullFeedback;
}

async function matchTrainingToFeedback(indicatorCode, feedback, trainingResources) {
  try {
    if (!feedback || feedback.trim().length < 20) {
      // No meaningful feedback to analyze — default to entry-level (first) resource
      return 0;
    }

    // Scope feedback to just the section about THIS indicator — otherwise the matcher reads
    // coach guidance for other indicators (SI3, SI2, etc.) and biases toward the broadest fix.
    const scopedFeedback = extractIndicatorFeedbackSection(feedback, indicatorCode);

    const prompt = `You are matching a teacher to the single most appropriate training video for indicator ${indicatorCode}${ficoNameMap[indicatorCode] ? ` (${ficoNameMap[indicatorCode]})` : ''}.

Each training has a RATIONALE that names the *specific failure pattern* it addresses. Your job is to read the coach's actual feedback to this teacher and pick the training whose rationale matches the failure pattern the coach is describing — NOT the broadest/safest option, NOT the lowest-level option by default.

COACH FEEDBACK FOR THIS TEACHER (the section specifically about ${ficoNameMap[indicatorCode] || indicatorCode}):
"""
${scopedFeedback}
"""

CANDIDATE TRAININGS (each addresses a different failure pattern):
${trainingResources.map((r, i) => `${i + 1}. ${r.title} [${r.code}, ${r.level}]\n   Addresses: ${r.rationale}`).join('\n\n')}

DECISION FRAMEWORK:
- Identify what the coach is actually prescribing as the fix (look at any "self-check", "try", "next time" language)
- Map that prescription to the training whose rationale describes the SAME failure pattern
- If the coach is teaching the teacher to STATE a learning goal that was missing → pick the goal-setting / lesson-planning training
- If the coach is teaching the teacher to VERIFY student comprehension of an existing instruction (e.g. "ask one child to repeat it") → pick the comprehension-checks training
- If the coach is signalling that previous tips have not worked and depth/cognitive complexity is the issue (e.g. "tips that are not landing", "try a different approach" after multiple cycles) → pick the higher-level (L1+) training
- Do NOT default to resource #1. If the feedback evidence does not match #1's rationale, pick the better-fitting one.

Respond with ONLY a single digit: the number of the best-matched training.`;

    const text = (await callOpenRouterChat({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 10,
      temperature: 0.3,
    })).trim();
    const match = parseInt(text);
    if (isNaN(match)) {
      console.warn(`[WARN] matchTrainingToFeedback got non-numeric response: "${text}" — defaulting to 0`);
      return 0;
    }
    console.log(`[DEBUG] matchTrainingToFeedback(${indicatorCode}) → picked resource #${match} of ${trainingResources.length}`);
    return Math.max(1, Math.min(match, trainingResources.length)) - 1;
  } catch (err) {
    console.error('AI matching error:', err);
    return 0;
  }
}

app.get('/api/health', (req, res) => res.json({ status: 'ok', cache: observationsCache.length }));

app.get('/api/debug/teacher/:id/tier', (req, res) => {
  const tierData = tierCache.get(req.params.id);
  const obs = observationsCache.filter(o => o.teacher_id === req.params.id);
  const tiers = getUnlockedTiers(req.params.id);
  const indicators = getUnlockedIndicators(tiers);
  res.json({
    teacherId: req.params.id,
    tierData,
    obsCount: obs.length,
    unlockedTiers: tiers,
    unlockedIndicatorsCount: indicators.size,
    unlockedIndicators: Array.from(indicators).sort()
  });
});

app.get('/api/teachers-with-observations', (req, res) => {
  const ids = [...new Set(observationsCache.map(o => o.teacher_id))].sort();
  res.json(ids);
});

app.get('/api/teacher/:id/observations', (req, res) => {
  const obs = observationsCache.filter(o => o.teacher_id === req.params.id);
  res.json(obs);
});

// Get FILTERED flagged indicators (only from unlocked tiers)
app.get('/api/teacher/:id/flagged-indicators', (req, res) => {
  console.log(`[DEBUG] /flagged-indicators called for teacher ${req.params.id}`);
  const obs = observationsCache.filter(o => o.teacher_id === req.params.id);
  const unlockedTiers = getUnlockedTiers(req.params.id);
  const unlockedIndicators = getUnlockedIndicators(unlockedTiers);
  console.log(`[DEBUG] Matrix SI1=${priorityMatrix.tiers.tier_1_structural.indicators.SI1.priority_rank}, SI3=${priorityMatrix.tiers.tier_1_structural.indicators.SI3.priority_rank}`);

  const counts = {};

  obs.forEach(o => {
    getFlaggedIndicators(o).forEach(code => {
      // ONLY count if in unlocked tier
      if (unlockedIndicators.has(code)) {
        if (!counts[code]) counts[code] = { count: 0, priority: getPriorityRank(code) };
        counts[code].count++;
      }
    });
  });

  const result = Object.entries(counts)
    .filter(([_, data]) => data.count >= 2)
    .sort((a, b) => a[1].priority - b[1].priority) // Sort by priority
    .map(([code, data]) => ({
      teacher_id: req.params.id,
      indicator_code: code,
      subject: obs[0]?.subject || 'unknown',
      grade: obs[0]?.grade || null,
      region: obs[0]?.region || 'unknown',
      rubric_type: obs[0]?.rubric_type || 'unknown',
      flag_count: data.count,
      priority: data.priority,
      escalation_level: 1,
      last_flagged_at: obs[0]?.created_at || new Date().toISOString(),
    }));

  res.json(result);
});

// Get highest priority flagged indicator for a teacher
app.get('/api/teacher/:id/highest-priority-indicator', (req, res) => {
  const obs = observationsCache.filter(o => o.teacher_id === req.params.id);
  const unlockedTiers = getUnlockedTiers(req.params.id);
  const unlockedIndicators = getUnlockedIndicators(unlockedTiers);

  const counts = {};

  obs.forEach(o => {
    getFlaggedIndicators(o).forEach(code => {
      if (unlockedIndicators.has(code)) {
        if (!counts[code]) counts[code] = { count: 0, priority: getPriorityRank(code) };
        counts[code].count++;
      }
    });
  });

  const flagged = Object.entries(counts)
    .filter(([_, data]) => data.count >= 2)
    .sort((a, b) => a[1].priority - b[1].priority);

  if (flagged.length === 0) {
    return res.json({ indicator: null, tier: unlockedTiers[0] });
  }

  res.json({
    indicator: flagged[0][0],
    tier: unlockedTiers[0],
    flagCount: flagged[0][1].count,
    priority: flagged[0][1].priority
  });
});

// Get training matched to feedback via AI
app.get('/api/training/:code/for-teacher/:teacherId', async (req, res) => {
  const { code, teacherId } = req.params;
  const t = trainings[code];

  if (!t) return res.status(404).json({ error: 'Training not found' });

  // Get teacher's most recent feedback
  const obs = observationsCache
    .filter(o => o.teacher_id === teacherId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

  const feedback = obs?.feedback_english || '';

  // Use AI to match feedback to best training resource
  const resourceIndex = await matchTrainingToFeedback(code, feedback, t.resources || []);

  res.json({
    name: t.name,
    description: t.description,
    videoUrl: t.videoUrl,
    resources: t.resources || [],
    selectedResourceIndex: resourceIndex,
    selectedResource: (t.resources || [])[resourceIndex],
    teacherFeedback: feedback,
    currentResourceIndex: resourceIndex,
    totalResources: (t.resources || []).length || 1,
    allCompleted: false,
  });
});

// Fallback training endpoint (no AI matching)
app.get('/api/training/:code', (req, res) => {
  const t = trainings[req.params.code];
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json({
    name: t.name,
    description: t.description,
    videoUrl: t.videoUrl,
    resources: t.resources || [],
    currentResourceIndex: 0,
    totalResources: (t.resources || []).length || 1,
    allCompleted: false,
  });
});

app.get('/api/practice/:code', async (req, res) => {
  const code = req.params.code;
  // Optional ?trainingCode=PP_00_01 narrows results to only the questions tied to that specific training
  // (so two teachers with the same flagged indicator but different recommended trainings get different questions)
  const trainingCode = typeof req.query.trainingCode === 'string' ? req.query.trainingCode : undefined;

  const dbConn = new Client({
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT || '5432'),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
  });

  try {
    await dbConn.connect();

    let result;
    if (trainingCode) {
      // Training-scoped lookup: only questions explicitly generated for this training video
      result = await dbConn.query(
        `SELECT question_id, scenario, prompt, rubric_criteria, training_code, training_title FROM generated_practice_questions
         WHERE training_code = $1 AND indicator_code = $2 ORDER BY question_id`,
        [trainingCode, code]
      );
      console.log(`[DEBUG] /api/practice/${code}?trainingCode=${trainingCode} → ${result.rows.length} questions`);
    } else {
      // Backwards-compat: indicator-only lookup returns the full pool
      result = await dbConn.query(
        `SELECT question_id, scenario, prompt, rubric_criteria, training_code, training_title FROM generated_practice_questions
         WHERE indicator_code = $1 ORDER BY question_id`,
        [code]
      );
    }

    await dbConn.end();

    if (result.rows.length > 0) {
      const questions = result.rows.map((row: any) => ({
        id: row.question_id,
        indicatorCode: code,
        trainingCode: row.training_code,
        trainingTitle: row.training_title,
        scenario: row.scenario,
        prompt: row.prompt,
        rubricCriteria: row.rubric_criteria,
      }));
      return res.json(questions);
    }

    // Fall back to hardcoded questions
    const questions = practiceQuestions[code] || [];
    res.json(questions.length > 0 ? questions : [
      {
        id: `${code}-q1`,
        indicatorCode: code,
        scenario: `Scenario for ${code}`,
        prompt: `Describe your approach:`,
        rubricCriteria: ['Clear explanation', 'Specific example', 'Connection to learning'],
      },
      {
        id: `${code}-q2`,
        indicatorCode: code,
        scenario: `In your next lesson, apply ${code}`,
        prompt: `How would you implement this?`,
        rubricCriteria: ['Activity description', 'Direct connection', 'Pedagogical reasoning'],
      },
    ]);
  } catch (err) {
    console.error('[ERROR] Practice questions query failed:', err);
    // Fall back to hardcoded questions on error
    const code = req.params.code;
    const questions = practiceQuestions[code] || [];
    res.json(questions.length > 0 ? questions : [
      {
        id: `${code}-q1`,
        indicatorCode: code,
        scenario: `Scenario for ${code}`,
        prompt: `Describe your approach:`,
        rubricCriteria: ['Clear explanation', 'Specific example', 'Connection to learning'],
      },
      {
        id: `${code}-q2`,
        indicatorCode: code,
        scenario: `In your next lesson, apply ${code}`,
        prompt: `How would you implement this?`,
        rubricCriteria: ['Activity description', 'Direct connection', 'Pedagogical reasoning'],
      },
    ]);
  }
});

app.post('/api/training/complete', (req, res) => {
  res.json({ success: true });
});

app.post('/api/practice/response', (req, res) => {
  res.json({ success: true });
});

// Generate practice questions using Claude AI
app.post('/api/generate-questions', async (req, res) => {
  try {
    const { trainingCode, indicatorCode, learningOutcome, context, systemPrompt } = req.body;

    if (!trainingCode || !learningOutcome) {
      return res.status(400).json({ error: 'trainingCode and learningOutcome are required' });
    }

    const questionCount = questionGenConfig.questionsPerTraining || 2;
    const indicatorRubric = indicatorCode ? ficoRubricMap[indicatorCode] : undefined;
    const indicatorStats = indicatorCode ? fdeIndicatorStats.get(indicatorCode) : undefined;

    const rubricBlock = indicatorRubric
      ? `\n\nFICO V3 RUBRIC FOR ${indicatorCode} (authoritative — questions must enable teachers to demonstrate the YES-criteria; rubricCriteria field MUST be drawn from the observable evidence below):\n${indicatorRubric}\n`
      : '';

    const statsBlock = indicatorStats
      ? `\n\nREAL OBSERVATION DATA (NIETE FDE, ${indicatorStats.total} scored observations on ${indicatorCode}): ${indicatorStats.failureRate}% of teachers miss this indicator (${indicatorStats.noCount} NO, ${indicatorStats.partialCount} PARTIAL, ${indicatorStats.yesCount} YES). Ground scenarios in the failure patterns teachers actually exhibit.\n`
      : '';

    const userMessage = `TASK: Generate exactly ${questionCount} short, tight practice questions. Each one lets a Pakistani government-school teacher PRACTICE — not recall — the transferable skill from the "${trainingCode}" training, judged against the ${indicatorCode || trainingCode} rubric.
${rubricBlock}${statsBlock}
INPUT:
Code: ${trainingCode}
Indicator: ${indicatorCode}
Outcome the teacher just learned: ${learningOutcome}
Context: ${context || 'N/A'}

OUTPUT: Valid JSON array ONLY. No markdown, no explanations.

JSON FORMAT rules:
- Each string on ONE LINE (replace newlines with spaces)
- Escape internal quotes: \\"
- Escape backslashes: \\\\

LENGTH LIMITS:
- scenario: 1-2 sentences, MAX 35 words. Sets the classroom moment concretely. No filler.
- prompt:   1 sentence, MAX 25 words. Asks ONE specific move — often "What would you SAY and DO to…"
- rubricCriteria: 2-3 items, each MAX 20 words. OBSERVABLE and CONCRETE (see below).

TWO QUESTIONS = TWO DIFFERENT FACETS OF THE SAME SKILL (this is critical):
- Do NOT write two variations of the same request. Q1 and Q2 must probe DIFFERENT aspects/layers of the ${indicatorCode} skill.
- Q1: the FIRST-ORDER practice of the skill — the direct mechanical move (e.g. for phonics: modeling one letter's sound variations, students hearing the difference).
- Q2: a DEEPER or ADJACENT facet — the same skill applied to a subtler situation the training also unlocks (e.g. for phonics: recognizing that the same mark also changes MEANING, not just sound; disagreement among students becomes a teaching moment).
- If Q1 and Q2 could be answered with the same rubric criteria, you have failed. Rewrite.

RUBRIC CRITERIA MUST BE OBSERVABLE — write what a coach would literally see or hear:
- ❌ "Teacher clearly models the sound" (abstract)
- ✅ "Teacher says each sound aloud with the correct Harakaat in sequence"
- ❌ "Students practice"
- ✅ "Students repeat each sound after the teacher before moving to the next Harakaat"
- ❌ "Covers pronunciation and positions"
- ✅ "Physical marking on the board matches what is said aloud — Zabar above, Zer below, Pesh above"
Prefer physical, spatial, sequential, or verbatim-speech criteria over abstract descriptors.

WORKED EXAMPLE — two questions on the same L1 phonics skill, probing DIFFERENT facets:
[
  {"scenario":"You write \\"ب\\" on the board with no Harakaat. Students need to hear how Zabar, Zer, and Pesh each change its pronunciation before reading any word.","prompt":"What would you say and do to model all three Harakaat on this one letter so students hear the difference clearly?","rubricCriteria":["Teacher says each sound aloud with the correct Harakaat in sequence","Students repeat each sound after the teacher before moving to the next Harakaat","Physical marking on the board matches what is said aloud — Zabar above, Zer below, Pesh above"]},
  {"scenario":"Mr Kamran gives the class the word \\"بن\\" without Harakaat and asks them to add the correct mark. Half add Zabar, half add Zer.","prompt":"What would you say to help both groups see that neither is wrong — the Harakaat changes the meaning, not just the sound?","rubricCriteria":["Teacher uses both readings in a sentence to show the meaning difference","Students hear both sentences aloud before deciding which Harakaat fits the context","Explanation connects Harakaat choice to meaning, not just correct vs. incorrect pronunciation"]}
]

Notice: Q1 is about SOUND differentiation (mark position → sound). Q2 is about MEANING differentiation (mark choice → different word). Different facets, same L1 skill. Rubric criteria are physical/spatial/observable, not abstract.

Now generate ${questionCount} questions like this — tight, distinct facets, observable rubric. Start JSON array:`;

    console.log(`[DEBUG] generate-questions: indicator=${indicatorCode} rubricInjected=${!!indicatorRubric} statsInjected=${!!indicatorStats}`);

    const model = questionGenConfig.config.model || 'openai/gpt-5.1';
    const provider = questionGenConfig.config.provider || 'openrouter';
    console.log(`📝 Generating questions for ${trainingCode} via ${provider}:${model} (system prompt length: ${systemPrompt?.length || 0})`);

    let responseText: string;

    if (provider === 'openrouter') {
      if (!process.env.OPENROUTER_API_KEY) {
        return res.status(500).json({ error: 'OPENROUTER_API_KEY not set in .env.local' });
      }
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: questionGenConfig.config.maxTokens || 4096,
          temperature: questionGenConfig.config.temperature ?? 0.7,
          messages: [
            { role: 'system', content: systemPrompt || questionGenConfig.systemPrompt },
            { role: 'user', content: userMessage },
          ],
        }),
      });
      if (!r.ok) {
        const errText = await r.text();
        console.error(`[ERROR] OpenRouter ${r.status}: ${errText.slice(0, 400)}`);
        return res.status(502).json({ error: `OpenRouter ${r.status}: ${errText.slice(0, 300)}` });
      }
      const data = await r.json();
      responseText = data.choices?.[0]?.message?.content ?? '';
      console.log(`📥 OpenRouter response length: ${responseText.length} (model: ${data.model || model})`);
    } else {
      // Legacy Anthropic path — kept for fallback if provider is changed back
      const messageParams: any = {
        model,
        max_tokens: questionGenConfig.config.maxTokens || 4096,
        system: systemPrompt || questionGenConfig.systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      };
      if (!model.includes('opus-4-7') && !model.includes('opus-4')) {
        messageParams.temperature = questionGenConfig.config.temperature || 0.7;
      }
      const message = await client.messages.create(messageParams);
      responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      console.log(`📥 Claude response length: ${responseText.length}`);
    }

    console.log(`📝 Raw model response:\n${responseText}`);
    let questions;

    try {
      questions = JSON.parse(responseText);
    } catch (e) {
      // Extract JSON by counting brackets while respecting string boundaries
      const startIdx = responseText.indexOf('[');
      if (startIdx === -1) {
        throw new Error('No JSON array [ found in response');
      }

      // Count brackets while being aware of strings
      let braceCount = 0;
      let endIdx = -1;
      let inString = false;
      let escapeNext = false;

      for (let i = startIdx; i < responseText.length; i++) {
        const char = responseText[i];

        // Handle escape sequences
        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (char === '\\') {
          escapeNext = true;
          continue;
        }

        // Toggle string state
        if (char === '"') {
          inString = !inString;
          continue;
        }

        // Only count brackets when not in a string
        if (!inString) {
          if (char === '[' || char === '{') {
            braceCount++;
          } else if (char === ']' || char === '}') {
            braceCount--;
            if (braceCount === 0 && char === ']') {
              endIdx = i;
              break;
            }
          }
        }
      }

      if (endIdx === -1) {
        // Response might be truncated - try to recover as much as possible
        console.warn('[WARN] Incomplete JSON - attempting recovery. Response length:', responseText.length);
        const lastBrace = responseText.lastIndexOf('}');
        if (lastBrace <= startIdx) {
          throw new Error('Response does not contain valid JSON');
        }
        endIdx = lastBrace;
        console.log('[INFO] Found last closing brace at position', endIdx);
      }

      let jsonStr = responseText.substring(startIdx, endIdx + 1);

      // If we recovered from an incomplete response, ensure it's a valid array
      if (!jsonStr.endsWith(']')) {
        // Count how many complete objects we have
        let objectCount = 0;
        let inStr = false;
        let escaped = false;
        for (let i = startIdx; i <= endIdx; i++) {
          if (escaped) {
            escaped = false;
            continue;
          }
          if (responseText[i] === '\\') {
            escaped = true;
            continue;
          }
          if (responseText[i] === '"') {
            inStr = !inStr;
          }
          if (!inStr && responseText[i] === '}') {
            objectCount++;
          }
        }
        jsonStr = jsonStr + ']';
        console.log(`[INFO] Added closing bracket. Recovered ${objectCount} complete question object(s)`);
      }

      console.log(`[DEBUG] Extracted JSON: length=${jsonStr.length}, first 150 chars:`, jsonStr.substring(0, 150));

      try {
        // Normalize: replace newlines with spaces
        jsonStr = jsonStr.replace(/[\r\n]/g, ' ');
        // Clean up excess spacing
        jsonStr = jsonStr
          .replace(/,\s+/g, ', ')
          .replace(/:\s+/g, ': ')
          .replace(/\[\s+/g, '[')
          .replace(/\s+\]/g, ']');

        questions = JSON.parse(jsonStr);
        console.log(`✅ Successfully parsed ${questions.length} questions`);
      } catch (parseErr) {
        console.error('[ERROR] JSON Parse failed:', (parseErr as any).message);
        const pos = ((parseErr as any).position || 0);
        const startPos = Math.max(0, pos - 50);
        const endPos = Math.min(jsonStr.length, pos + 50);
        console.error('Char at error position:', jsonStr[pos], 'Code:', jsonStr.charCodeAt(pos));
        console.error('Context:', jsonStr.substring(startPos, endPos));
        throw parseErr;
      }
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(500).json({ error: 'Claude did not generate valid questions' });
    }

    const processedQuestions = questions.map((q: any) => {
      let prompt = (q.prompt || '').trim();
      const scenario = (q.scenario || '').trim();

      if (!prompt.endsWith('?')) {
        prompt = prompt.replace(/\.$/, '').trim() + '?';
      }

      return {
        scenario,
        prompt,
        rubricCriteria: q.rubricCriteria || []
      };
    });

    console.log(`✅ Generated ${processedQuestions.length} questions for ${trainingCode}`);
    res.json({ questions: processedQuestions });
  } catch (err) {
    console.error('[ERROR] Question generation failed:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Question generation failed' });
  }
});

// Save generated questions to database
app.post('/api/save-questions', async (req, res) => {
  const dbConn = new Client({
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT || '5432'),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
  });

  try {
    const { trainingCode, indicatorCode, questions } = req.body;

    if (!trainingCode || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'trainingCode and questions array are required' });
    }

    console.log(`[SAVE] Starting save for ${trainingCode}, ${questions.length} questions`);

    // Add error handler before connecting
    dbConn.on('error', (err) => {
      console.error('[ERROR] Database connection error:', err);
    });

    console.log(`[SAVE] Connecting to database: ${process.env.PGHOST}:${process.env.PGPORT}`);
    await dbConn.connect();
    console.log(`[SAVE] Connected successfully`);

    // Create table if it doesn't exist
    await dbConn.query(`
      CREATE TABLE IF NOT EXISTS generated_practice_questions (
        id SERIAL PRIMARY KEY,
        training_code VARCHAR(50) NOT NULL,
        question_id VARCHAR(100) UNIQUE NOT NULL,
        scenario TEXT NOT NULL,
        prompt TEXT NOT NULL,
        rubric_criteria TEXT[] NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        training_title VARCHAR(255),
        indicator_code VARCHAR(50) NOT NULL,
        indicator_rubric JSONB,
        question_context JSONB
      );
    `);

    // Get indicator rubric and context
    const indicatorRubric = evaluationRubric[indicatorCode as keyof typeof evaluationRubric];
    const indicatorContext = contextualTrainingData[indicatorCode as keyof typeof contextualTrainingData];
    const trainingInfo = trainings[indicatorCode as keyof typeof trainings];

    // Save each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      // Include indicatorCode in the ID so trainings shared across indicators (e.g., PP_02_05 is
      // mapped under M2, S1, AND S2) don't collide on question_id UNIQUE and silently overwrite
      // each other via ON CONFLICT. Format: {indicatorCode}-{trainingCode}-q{n}
      const questionId = `${indicatorCode}-${trainingCode}-q${i + 1}`;

      // Belt-and-suspenders: refuse to overwrite a row whose indicator_code differs from what we're saving.
      // This can only happen if question_id collides with another (indicator, training) pair — which shouldn't
      // occur under the current ID format, but the check prevents silent data loss if it ever does.
      const existing = await dbConn.query(
        `SELECT indicator_code FROM generated_practice_questions WHERE question_id = $1`,
        [questionId]
      );
      if (existing.rows.length > 0 && existing.rows[0].indicator_code !== indicatorCode) {
        console.warn(`[SAVE] SKIPPED: question_id "${questionId}" already exists under indicator ${existing.rows[0].indicator_code}, refusing to overwrite with ${indicatorCode}.`);
        continue;
      }

      const isUpdate = existing.rows.length > 0;
      console.log(`[SAVE] ${isUpdate ? 'UPDATE' : 'INSERT'} question ${i + 1}/${questions.length}: ${questionId}`);

      // ON CONFLICT DO UPDATE only fires for the same (indicator, training) pair — a deliberate regenerate.
      // Different (indicator, training) pairs get different question_ids and always INSERT as new rows.
      const insertResult = await dbConn.query(
        `INSERT INTO generated_practice_questions
         (training_code, question_id, scenario, prompt, rubric_criteria, training_title, indicator_code, indicator_rubric, question_context)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (question_id) DO UPDATE SET
         scenario = $3, prompt = $4, rubric_criteria = $5, training_title = $6, indicator_code = $7, indicator_rubric = $8, question_context = $9`,
        [
          trainingCode,
          questionId,
          q.scenario,
          q.prompt,
          q.rubricCriteria,
          trainingInfo?.name || trainingCode,
          indicatorCode,
          JSON.stringify(indicatorRubric),
          JSON.stringify({
            failureRate: indicatorContext?.real_performance?.failureRate,
            tier: indicatorContext?.real_performance?.tier,
            context: indicatorContext
          }),
        ]
      );
      console.log(`[SAVE] ${isUpdate ? 'Updated' : 'Inserted'} ${questionId} (rows affected: ${insertResult.rowCount})`);
    }

    console.log(`✅ Saved ${questions.length} questions for ${trainingCode}`);
    res.json({ success: true, count: questions.length });
  } catch (err) {
    console.error('[ERROR] Save questions failed:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Save questions failed' });
  } finally {
    try {
      await dbConn.end();
    } catch (endErr) {
      console.error('[ERROR] Failed to close database connection:', endErr);
    }
  }
});

// Evaluate practice response using Claude AI with proper rubric
app.post('/api/evaluate', async (req, res) => {
  try {
    const {
      response, questionId,
      indicatorCode: bodyIndicatorCode,
      rubricCriteria, scenario, prompt: questionPrompt,
      teacherId, trainingCode,   // new — required for persistence
    } = req.body;

    if (!response || !questionId) {
      return res.status(400).json({ error: 'Missing response or questionId' });
    }

    // Prefer explicit indicatorCode from body. Fall back to parsing the questionId leading token:
    //  - New format: "S1-PP_02_05-q1" → "S1"
    //  - Old legacy: "SI1-q1"          → "SI1"
    // Training-only IDs ("PP_00_01-q1") are ambiguous — those must send indicatorCode in body.
    let indicatorCode = bodyIndicatorCode;
    if (!indicatorCode) {
      const m = questionId.match(/^([A-Z]+-?\d+)-/);
      indicatorCode = m ? m[1] : null;
    }

    if (!indicatorCode) {
      return res.status(400).json({ error: `Could not determine indicator from request (questionId="${questionId}", no indicatorCode in body)` });
    }

    const indicatorRubric = evaluationRubric.indicators[indicatorCode];
    if (!indicatorRubric) {
      return res.status(400).json({ error: `No rubric found for indicator ${indicatorCode}` });
    }

    // Build the evaluation prompt: full FICO rubric for the indicator + the question-specific criteria
    // that this scenario was generated to test. The teacher's response is judged against BOTH.
    const indicatorRubricText = `
FICO INDICATOR: ${indicatorRubric.name} (${indicatorCode})
DESCRIPTION: ${indicatorRubric.description}

INDICATOR-LEVEL RUBRIC:
YES criteria:
${indicatorRubric.criteria.YES.map((c: string) => `  - ${c}`).join('\n')}

PARTIAL criteria:
${indicatorRubric.criteria.PARTIAL.map((c: string) => `  - ${c}`).join('\n')}

NO criteria:
${indicatorRubric.criteria.NO.map((c: string) => `  - ${c}`).join('\n')}
`;

    const questionRubricText = Array.isArray(rubricCriteria) && rubricCriteria.length > 0
      ? `\nQUESTION-SPECIFIC RUBRIC (what THIS scenario is testing the teacher on):\n${rubricCriteria.map((c: string) => `  - ${c}`).join('\n')}\n`
      : '';

    const scenarioBlock = scenario || questionPrompt
      ? `\nSCENARIO PRESENTED TO TEACHER:\n${scenario ? scenario + '\n' : ''}${questionPrompt ? 'Question: ' + questionPrompt + '\n' : ''}`
      : '';

    const evaluationPrompt = `You are an instructional coach scoring a Pakistani government-school teacher's practice response against the FICO V3 rubric.
${indicatorRubricText}
${questionRubricText}${scenarioBlock}
TEACHER'S RESPONSE:
"${response}"

Evaluate the response against BOTH the indicator-level rubric AND the question-specific criteria.

Return ONLY a JSON object with this EXACT shape (no markdown, no commentary):
{
  "score": "YES" | "PARTIAL" | "NO",
  "feedback": "2-3 sentence coaching nudge — see instructions below",
  "rubric_criteria_met": ["<verbatim question-specific criterion the response satisfied>", ...],
  "rubric_criteria_missed": ["<verbatim question-specific criterion the response did NOT satisfy>", ...],
  "rubric_criteria_not_applicable": ["<criterion that could not be judged from this response>", ...]
}

SCORING RULES:
- "score" reflects the indicator-level rubric (YES/PARTIAL/NO) — if all question-specific criteria are met cleanly, score YES; if some are met, PARTIAL; if none, NO.
- Each item in rubric_criteria_met / rubric_criteria_missed / rubric_criteria_not_applicable must be the VERBATIM text of one of the question-specific rubric items listed above. Every question-specific criterion must appear in exactly one of these three arrays.

FEEDBACK RULES (the "feedback" string — short coaching nudge, peer-to-peer):
- Maximum 2 sentences. Aim for ~25 words total. Simple, direct English a teacher reads in 5 seconds.
- Pedagogy vocabulary IS welcome — teachers use it daily. OK to say "observable verb," "action verb," "learning objective," "measurable," "check for understanding," "model," "guided practice," "prior knowledge," "scaffold." These are tools of the trade, not jargon.
- BANNED phrasings (too textbook-y / corporate / abstract): "success threshold," "demonstrate mastery," "measurable criterion" (say "measurable" instead), "demonstrates competency," "benchmark," "rubric expectations," "learning outcome attainment," "evidence of learning."
- Sentence 1: A concrete redirect with a tiny example — e.g. "Try using an observable verb like 'identify' or 'name' — for example 'name 4 parts of a plant.'"
- Sentence 2 (optional): A forward-looking nudge for the NEXT LESSON or NEXT TIME. The teacher cannot retry this question — NEVER invite re-attempt, NEVER ask "want to try again?" / "give it another go?". Use phrases like "In your next lesson…", "Next time you write a goal…", "Going forward…", "When you plan tomorrow's lesson…".
- Tone: warm peer coach. NOT lecturing, NOT scolding, NOT explaining the mistake at length.
- BANNED: "You missed X", "Your answer is wrong/vague/incomplete," "Want to give it another go?", "Try again," restating the full rubric verbatim, semicolons, more than one worked example.
- If the response was strong: name what worked in 5-10 words using legitimate pedagogy terms ("strong action verb," "clear objective," "good use of measurable language"), then give one forward-looking refinement for the next lesson. Still ≤2 sentences total.

Return ONLY the JSON object — no preamble, no fence, no trailing text.`;

    const responseText = await callOpenRouterChat({
      messages: [{ role: 'user', content: evaluationPrompt }],
      maxTokens: 800,
      temperature: 0.3,
    });
    console.log('OpenRouter evaluation response:', responseText);

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to parse response:', responseText);
      return res.status(500).json({ error: 'Failed to parse evaluation response: ' + responseText.substring(0, 200) });
    }

    let evaluation = JSON.parse(jsonMatch[0]);

    // Ensure required fields exist with new feedback format
    evaluation = {
      score: evaluation.score || 'NO',
      feedback: evaluation.feedback || 'Unable to generate coaching feedback',
      rubric_criteria_met: evaluation.rubric_criteria_met || [],
      rubric_criteria_missed: evaluation.rubric_criteria_missed || [],
      rubric_criteria_not_applicable: evaluation.rubric_criteria_not_applicable || [],
    };

    console.log('✅ Evaluation parsed:', evaluation);

    // Persist the attempt + evaluation. Runs async but we don't block the response — teacher sees
    // feedback immediately, save happens in the background. If teacherId is missing we still return
    // feedback but log a warning (some legacy callers didn't send it yet).
    if (teacherId) {
      persistPracticeAttempt({
        teacherId,
        indicatorCode,
        trainingCode,
        mode: 'scenario',
        questionId,
        scenario,
        prompt: questionPrompt,
        rubricCriteria,
        response,
        evaluation,
      });
    } else {
      console.warn(`[WARN] /api/evaluate got no teacherId — attempt NOT persisted (indicator=${indicatorCode}, question=${questionId})`);
    }

    res.json(evaluation);
  } catch (err) {
    console.error('Evaluation error:', err);
    res.status(500).json({ error: 'Failed to evaluate response: ' + (err instanceof Error ? err.message : String(err)) });
  }
});

// AI Student Simulation
const simulationsPath = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'data/simulations.json');
const simulations = JSON.parse(fs.readFileSync(simulationsPath, 'utf-8'));

app.post('/api/simulate', async (req, res) => {
  try {
    const { indicatorCode, conversationHistory, turnNumber, maxTurns, teacherId, trainingCode, sessionId } = req.body;

    if (!indicatorCode || !conversationHistory || !Array.isArray(conversationHistory)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const simulation = (simulations as any)[indicatorCode];
    if (!simulation) {
      return res.status(404).json({ error: `No simulation found for indicator ${indicatorCode}` });
    }

    // Build conversation for Claude
    const conversationForClaude = conversationHistory.map((msg: any) => ({
      role: msg.role === 'teacher' ? 'user' : 'assistant',
      content: msg.message,
    }));

    // System prompt for the AI student
    const studentSystemPrompt = `You are a realistic ${8}-year-old student in a classroom. Your name is not important. The teacher is teaching about "${simulation.indicatorFocus}".

Student Persona: ${simulation.studentPersona}

Your job is to react authentically to the teacher's instructions. If the teacher's explanation is clear and well-structured, show understanding ("Oh I see!", "That makes sense!"). If the teacher is vague or unclear, push back with honest confusion ("I don't understand", "What does that mean?", "Can you explain more?").

Keep responses short (1-3 sentences) and natural, like a real student would talk.

${
  turnNumber === maxTurns
    ? `This is the final turn. After responding briefly, also be ready for the teacher to wrap up the lesson. Your response should indicate whether the teacher successfully demonstrated: ${simulation.indicatorFocus}`
    : ''
}`;

    const studentMessage = await callOpenRouterChat({
      system: studentSystemPrompt,
      messages: conversationForClaude as ORMessage[],
      maxTokens: 150,
      temperature: 0.8,  // slightly warmer for more natural student voice
    });

    if (turnNumber === maxTurns) {
      // Evaluate the entire conversation
      const evaluationPrompt = `You are an instructional coach evaluating a teacher-student interaction based on the indicator: "${simulation.indicatorFocus}"

Rubric Criteria to evaluate:
${simulation.rubricCriteria.map((c: string) => `- ${c}`).join('\n')}

Based on the conversation below, evaluate the teacher's performance. Did the teacher successfully demonstrate the indicator?

Teacher Responses:
${
  conversationHistory
    .filter((m: any) => m.role === 'teacher')
    .map((m: any) => m.message)
    .join('\n\n')
}

Provide feedback in JSON format:
{
  "score": "YES" | "PARTIAL" | "NO",
  "feedback": "...",
  "rubric_criteria_met": [...],
  "rubric_criteria_missed": [...]
}`;

      const evaluationText = await callOpenRouterChat({
        messages: [{ role: 'user', content: evaluationPrompt }],
        maxTokens: 400,
        temperature: 0.3,
      });

      let evaluation;
      try {
        const jsonMatch = evaluationText.match(/\{[\s\S]*\}/);
        evaluation = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch {
        evaluation = {
          score: 'PARTIAL',
          feedback: 'Evaluation completed',
          rubric_criteria_met: [],
          rubric_criteria_missed: [],
        };
      }

      const finalEval = {
        score: evaluation.score || 'PARTIAL',
        feedback: evaluation.feedback || 'Good effort!',
        rubric_criteria_met: evaluation.rubric_criteria_met || [],
        rubric_criteria_missed: evaluation.rubric_criteria_missed || [],
      };

      // Persist the completed roleplay session with its evaluation.
      // Includes the final student message so the conversation snapshot is complete.
      const fullHistory = [...conversationHistory, { role: 'student', message: studentMessage }];
      if (teacherId && sessionId) {
        persistPracticeAttempt({
          teacherId,
          indicatorCode,
          trainingCode,
          mode: 'roleplay',
          sessionId,
          turnNumber,
          isComplete: true,
          scenario: simulation.setup,
          prompt: simulation.indicatorFocus,
          rubricCriteria: simulation.rubricCriteria,
          conversationHistory: fullHistory,
          evaluation: finalEval,
        });
      } else {
        console.warn(`[WARN] /api/simulate final turn missing teacherId or sessionId — roleplay NOT persisted (indicator=${indicatorCode})`);
      }

      res.json({
        studentMessage,
        isComplete: true,
        evaluation: finalEval,
      });
    } else {
      // Intermediate turn — save the partial conversation upsert-by-session so if the teacher
      // abandons here, we still have their message + the student reply captured in the DB.
      const partialHistory = [...conversationHistory, { role: 'student', message: studentMessage }];
      if (teacherId && sessionId) {
        persistPracticeAttempt({
          teacherId,
          indicatorCode,
          trainingCode,
          mode: 'roleplay',
          sessionId,
          turnNumber,
          isComplete: false,
          scenario: simulation.setup,
          prompt: simulation.indicatorFocus,
          rubricCriteria: simulation.rubricCriteria,
          conversationHistory: partialHistory,
        });
      } else {
        console.warn(`[WARN] /api/simulate intermediate turn missing teacherId or sessionId — turn NOT persisted (indicator=${indicatorCode}, turn=${turnNumber})`);
      }

      res.json({
        studentMessage,
        isComplete: false,
      });
    }
  } catch (err) {
    console.error('Simulation error:', err);
    res.status(500).json({ error: 'Failed to generate student response' });
  }
});

// ─── Roleplay endpoint (prompt-driven, dynamic) ─────────────────────────────
// Uses the template from .claude/context/roleplay_prompt.md.
// On every call:
//   1. Interpolate INDICATOR, INDICATOR_RUBRIC, TRAINING_SUMMARY into the template.
//   2. Send template as system prompt + conversation-so-far to GPT-5.1.
//   3. Model returns JSON { message, isComplete, ending, coachingFeedback }.
//   4. Persist the turn to teacher_practice_attempts (session upsert), returning the model's reply.
app.post('/api/roleplay', async (req, res) => {
  try {
    const {
      indicatorCode,
      trainingCode,
      teacherId,
      sessionId,
      conversationHistory = [],
      turnNumber,
    } = req.body;

    if (!indicatorCode) return res.status(400).json({ error: 'indicatorCode required' });
    if (!roleplayPromptTemplate) return res.status(500).json({ error: 'Roleplay prompt template not loaded on server' });

    // Interpolate live context
    const indicatorName = ficoNameMap[indicatorCode] || indicatorCode;
    const indicatorRubric = ficoRubricMap[indicatorCode] || '(no rubric found for this indicator)';
    const trainingInfo = trainings[indicatorCode];
    const resource = trainingInfo?.resources?.find((r: any) => r.code === trainingCode);
    const trainingSummary = resource
      ? `Title: ${resource.title}\nLevel: ${resource.level}\nDomain: ${resource.domain}\nRationale: ${resource.rationale}`
      : `Training code: ${trainingCode || '(none provided)'}`;

    // Count teacher turns already in history — this is the ground truth signal for "how many
    // chances has she used", independent of any turn number the client sends.
    const teacherTurnsSoFar = (conversationHistory || []).filter((m: any) => m.role === 'teacher').length;

    // Build a very explicit "what to do RIGHT NOW" instruction based on state.
    let situationDirective = '';
    if (teacherTurnsSoFar === 0) {
      situationDirective = `IMMEDIATE INSTRUCTION: The conversation is empty. This is turn 0. Follow the BEFORE TURN 1 — SET THE SCENE instructions. Return the scene text (2-3 lines) in "message", isComplete=false, ending=null.`;
    } else if (teacherTurnsSoFar < 3) {
      situationDirective = `IMMEDIATE INSTRUCTION: The teacher has responded ${teacherTurnsSoFar} time(s) so far. Read her most recent teacher message and score it against the rubric.
- If she has met Level 3 or 4 of the rubric → step out and give the PASS ENDING coaching. Return isComplete=true, ending="PASS", the 4-5 sentence coaching in both "message" and "coachingFeedback".
- If she has NOT met Level 3 or 4 → continue as the student. Return the next student utterance (1-3 lines) in "message", isComplete=false, ending=null.`;
    } else {
      situationDirective = `IMMEDIATE INSTRUCTION: The teacher has already responded 3 times. This is the FORCED FINAL ENDING regardless of score. You MUST step out of the student role now. Do NOT return another student utterance. Return isComplete=true, ending="FINAL", the 5-6 sentence FINAL ENDING coaching in both "message" and "coachingFeedback". Follow the FINAL ENDING structure from the template.`;
    }

    const contextBlock = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXT FOR THIS SESSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INDICATOR: ${indicatorCode} — ${indicatorName}

INDICATOR_RUBRIC:
${indicatorRubric}

TRAINING_SUMMARY:
${trainingSummary}

Teacher turns used so far: ${teacherTurnsSoFar} of 3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${situationDirective}

RESPONSE FORMAT (return ONLY this JSON object, no markdown fences, no preamble):
{
  "message": "string — scene text OR student utterance OR coaching feedback",
  "isComplete": true or false,
  "ending": "PASS" or "FINAL" or null,
  "coachingFeedback": "string when isComplete=true, otherwise null"
}
`;

    const systemPrompt = contextBlock + '\n' + roleplayPromptTemplate;

    // Map conversation to OpenAI-format for OpenRouter
    // 'student' or 'scene' role from our app → 'assistant' in the API. 'teacher' → 'user'.
    const messages: ORMessage[] = conversationHistory.map((m: any) => ({
      role: m.role === 'teacher' ? 'user' : 'assistant',
      content: m.message,
    }));
    // If conversationHistory is empty (turn 0), still need a user message to trigger a response
    if (messages.length === 0) {
      messages.push({ role: 'user', content: '[Begin the session — set the scene.]' });
    }

    const rawText = await callOpenRouterChat({
      system: systemPrompt,
      messages,
      maxTokens: 500,
      temperature: 0.8,
    });

    // Parse the JSON envelope (strip any accidental fences)
    let parsed: any;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { message: rawText, isComplete: false, ending: null };
    } catch {
      parsed = { message: rawText, isComplete: false, ending: null };
    }

    const message = String(parsed.message || '').trim();
    const isComplete = !!parsed.isComplete;
    const ending = parsed.ending || null;
    const coachingFeedback = parsed.coachingFeedback || (isComplete ? message : null);

    // Build the updated history for persistence (add the AI's turn as 'student' or 'scene' as appropriate)
    const historyForSave = [...conversationHistory];
    if (message) {
      const role = (turnNumber === 0 || conversationHistory.length === 0) ? 'scene' : (isComplete ? 'coach' : 'student');
      historyForSave.push({ role, message });
    }

    // Persist turn-by-turn (upsert on session_id)
    if (teacherId && sessionId) {
      persistPracticeAttempt({
        teacherId,
        indicatorCode,
        trainingCode,
        mode: 'roleplay',
        sessionId,
        turnNumber: turnNumber ?? 0,
        isComplete,
        scenario: indicatorName,
        prompt: resource?.title || null,
        rubricCriteria: undefined,
        conversationHistory: historyForSave,
        evaluation: isComplete ? { ending, feedback: coachingFeedback } : null,
      });
    } else {
      console.warn(`[WARN] /api/roleplay missing teacherId or sessionId — turn NOT persisted (indicator=${indicatorCode}, turn=${turnNumber})`);
    }

    res.json({ message, isComplete, ending, coachingFeedback });
  } catch (err) {
    console.error('[ERROR] /api/roleplay:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Roleplay failed: ' + (err instanceof Error ? err.message : String(err)) });
  }
});

// Soniox audio transcription integration
const SONIOX_API_BASE_URL = 'https://api.soniox.com';
const sonioxApiKey = process.env.SONIOX_API_KEY;

// Upload audio file to Soniox
app.post('/api/upload-audio', async (req, res) => {
  try {
    if (!sonioxApiKey) {
      return res.status(500).json({ error: 'Soniox API key not configured' });
    }

    const audioBuffer = req.body as Buffer;
    console.log(`📤 [Soniox] Uploading audio: ${audioBuffer.length} bytes`);

    // Create FormData for Soniox file upload
    const formData = new FormData();
    // Convert Buffer to Blob for FormData
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/webm' });
    formData.append('file', blob, `audio_${Date.now()}.webm`);

    const response = await fetch(`${SONIOX_API_BASE_URL}/v1/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sonioxApiKey}`,
      },
      body: formData,
    });

    const responseText = await response.text();
    console.log(`[Soniox] Upload response status: ${response.status}, body: ${responseText}`);

    if (!response.ok) {
      console.error(`[ERROR] Soniox upload failed: ${responseText}`);
      return res.status(response.status).json({ error: `Upload failed: ${responseText}` });
    }

    const result = JSON.parse(responseText);
    console.log(`✅ [Soniox] File uploaded with ID: ${result.id}`);
    res.json({ fileId: result.id });
  } catch (err) {
    console.error('[ERROR] Audio upload exception:', err);
    res.status(500).json({ error: `Audio upload failed: ${err instanceof Error ? err.message : String(err)}` });
  }
});

// Create transcription request with Soniox
app.post('/api/transcribe', async (req, res) => {
  try {
    if (!sonioxApiKey) {
      return res.status(500).json({ error: 'Soniox API key not configured' });
    }

    const { fileId } = req.body;
    if (!fileId) {
      return res.status(400).json({ error: 'Missing fileId' });
    }

    const config = {
      model: 'stt-async-v4',
      language_hints: ['en'],
      file_id: fileId,
      client_reference_id: `training_${Date.now()}`,
    };

    console.log(`📝 [Soniox] Creating transcription with config:`, JSON.stringify(config));

    const response = await fetch(`${SONIOX_API_BASE_URL}/v1/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sonioxApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[ERROR] Soniox transcription creation failed: ${error}`);
      return res.status(response.status).json({ error: `Transcription creation failed: ${error}` });
    }

    const result = await response.json();
    console.log(`⏳ [Soniox] Transcription created: ${result.id}`);
    res.json({ transcriptionId: result.id });
  } catch (err) {
    console.error('[ERROR] Transcription creation exception:', err);
    res.status(500).json({ error: `Transcription creation failed: ${err instanceof Error ? err.message : String(err)}` });
  }
});

// Check Soniox transcription status
app.get('/api/transcription/:id/status', async (req, res) => {
  try {
    if (!sonioxApiKey) {
      return res.status(500).json({ error: 'Soniox API key not configured' });
    }

    const { id } = req.params;

    const response = await fetch(`${SONIOX_API_BASE_URL}/v1/transcriptions/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sonioxApiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error: error });
    }

    const result = await response.json();
    console.log(`[Soniox] Status response:`, JSON.stringify(result));

    if (result.status === 'error') {
      const errorMsg = result.error_message || result.message || 'Unknown error';
      console.error(`❌ [Soniox] Transcription error: ${errorMsg}`);
      return res.json({
        status: 'error',
        error_message: errorMsg
      });
    }

    console.log(`[Soniox] Status check: ${result.status}`);
    res.json({ status: result.status });
  } catch (err) {
    console.error('[ERROR] Status check exception:', err);
    res.status(500).json({ error: `Status check failed: ${err instanceof Error ? err.message : String(err)}` });
  }
});

// Get Soniox transcription result
app.get('/api/transcription/:id/transcript', async (req, res) => {
  try {
    if (!sonioxApiKey) {
      return res.status(500).json({ error: 'Soniox API key not configured' });
    }

    const { id } = req.params;

    const response = await fetch(`${SONIOX_API_BASE_URL}/v1/transcriptions/${id}/transcript`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sonioxApiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error: error });
    }

    const result = await response.json();

    // Extract text from tokens
    const transcript = result.tokens?.map((t: any) => t.text).join('') || '';
    console.log(`✅ [Soniox] Transcript ready: ${transcript.length} chars`);

    res.json({ transcript });
  } catch (err) {
    console.error('[ERROR] Transcript retrieval exception:', err);
    res.status(500).json({ error: `Transcript retrieval failed: ${err instanceof Error ? err.message : String(err)}` });
  }
});

async function start() {
  await initialize();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 ${observationsCache.length} observations ready`);
    console.log(`🤖 Claude AI integration enabled for training matching`);
  });
}

start();
