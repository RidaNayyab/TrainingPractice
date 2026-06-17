import express from 'express';
import cors from 'cors';
import { Client } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Anthropic } from '@anthropic-ai/sdk';

dotenv.config({ path: '.env.local' });

const app = express();
const PORT = 3001;
const client = new Anthropic();

app.use(cors());
// Raw binary handling for audio uploads
app.use('/api/upload-audio', express.raw({ type: 'audio/*', limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));

// Load data files
const trainingsPath = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), 'data/trainings.json');
const matrixPath = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), 'data/indicator-priority-matrix.json');
const practiceQuestionsPath = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), 'data/practiceQuestions.json');
const rubricPath = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), 'data/evaluationRubric.json');
const questionGenPath = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), 'data/questionGenerationPrompt.json');

const trainings = JSON.parse(fs.readFileSync(trainingsPath, 'utf-8'));
const priorityMatrix = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));
const practiceQuestions = JSON.parse(fs.readFileSync(practiceQuestionsPath, 'utf-8'));
const evaluationRubric = JSON.parse(fs.readFileSync(rubricPath, 'utf-8'));
const questionGenConfig = JSON.parse(fs.readFileSync(questionGenPath, 'utf-8'));

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

    console.log(`✅ Loaded ${observationsCache.length} observations`);
    console.log(`✅ Loaded tier data for ${tierCache.size} teachers`);

    await dbClient.end();
    console.log('📴 DB closed');
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
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
async function matchTrainingToFeedback(indicatorCode, feedback, trainingResources) {
  try {
    const prompt = `Given a teacher's feedback and available training resources, which training resource is most appropriate?

Indicator: ${indicatorCode}

Feedback: ${feedback}

Available Training Resources:
${trainingResources.map((r, i) => `${i + 1}. ${r.title} (${r.domain}) - Level ${r.level}\n   Rationale: ${r.rationale}`).join('\n')}

Respond with ONLY the number (1, 2, or 3) of the most appropriate resource.`;

    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 10,
      messages: [{ role: 'user', content: prompt }]
    });

    const match = response.content[0].type === 'text' ? parseInt(response.content[0].text.trim()) : 1;
    return Math.max(1, Math.min(match, trainingResources.length)) - 1;
  } catch (err) {
    console.error('AI matching error:', err);
    return 0; // Default to first resource
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
  const dbConn = new Client({
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT || '5432'),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
  });

  try {
    await dbConn.connect();

    // Query for generated questions first
    const result = await dbConn.query(
      `SELECT question_id, scenario, prompt, rubric_criteria FROM generated_practice_questions
       WHERE $1 = ANY(indicator_codes) ORDER BY question_id`,
      [code]
    );

    await dbConn.end();

    if (result.rows.length > 0) {
      const questions = result.rows.map((row: any) => ({
        id: row.question_id,
        indicatorCode: code,
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
    const userMessage = `TASK: Generate exactly ${questionCount} practice questions.

INPUT:
Code: ${trainingCode}
Indicator: ${indicatorCode}
Outcome: ${learningOutcome}
Context: ${context || 'N/A'}

OUTPUT: Valid JSON array ONLY. No markdown, no explanations.

CRITICAL - JSON FORMAT:
- Each string must be on ONE LINE (replace newlines with spaces)
- All quotes inside strings must be ESCAPED with backslash: \\"
- All backslashes must be escaped: \\\\
- No line breaks except after commas between objects

EXAMPLE:
[{"scenario":"Grade 2 classroom...","prompt":"Write what...","rubricCriteria":["criterion 1","criterion 2"]},{"scenario":"Another class...","prompt":"How would...","rubricCriteria":["item 1","item 2"]}]

QUESTIONS (${questionCount}):
1. Realistic Pakistani classroom scenario for a Grade 1-5 government school teacher
2. Simple, action-oriented prompt - teacher must DO something, not describe or recall
3. 2-3 rubric criteria that are specific and observable

Start JSON array now:`;

    console.log(`📝 Generating questions for ${trainingCode} with system prompt length: ${systemPrompt?.length || 0}`);

    const messageParams: any = {
      model: questionGenConfig.config.model || 'claude-opus-4-7',
      max_tokens: questionGenConfig.config.maxTokens || 4096,
      system: systemPrompt || questionGenConfig.systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    };

    // Temperature is deprecated for claude-opus-4-7, only add for other models
    const model = messageParams.model;
    if (!model.includes('opus-4-7') && !model.includes('opus-4')) {
      messageParams.temperature = questionGenConfig.config.temperature || 0.7;
    }

    const message = await client.messages.create(messageParams);

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    console.log(`📥 Claude response length: ${responseText.length}`);
    console.log(`📝 Claude raw response:\n${responseText}`);
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

    // Post-process: Transform to "You..." scenarios and "What would you..." questions
    const processedQuestions = questions.map((q: any, idx: number) => {
      let prompt = (q.prompt || '').trim();
      let scenario = (q.scenario || '').trim();

      // SCENARIO TRANSFORMATION
      // Q1: Convert third-person teacher name to "You are teaching..."
      if (idx === 0) {
        // Detect teacher name at start (e.g., "Ms. Ayesha is", "Mr. Bilal is")
        const teacherMatch = scenario.match(/^(Ms\.|Mr\.|Mrs\.|Ms|Mr|Mrs)\s+\w+\s+is\s+(teaching|starting)/i);
        if (teacherMatch) {
          // Extract grade and subject/topic
          const gradeMatch = scenario.match(/Grade\s+(\d+)/);
          const subjectMatch = scenario.match(/(?:lesson|class).*?(?:on|about)\s+([^.]+)/i);

          if (gradeMatch) {
            const grade = gradeMatch[1];
            const subject = subjectMatch ? subjectMatch[1].trim() : 'lesson';

            // Build first-person scenario
            const actionMatch = scenario.match(/is\s+\w+[^.]+/);
            const restOfScenario = actionMatch ? actionMatch[0].replace(/^is\s+\w+/, '').trim() : '';

            scenario = `You are teaching Grade ${grade} ${subject}. You ${restOfScenario}`;
            // Truncate at first real ending
            const firstPeriod = scenario.indexOf('.');
            if (firstPeriod > 0) {
              scenario = scenario.substring(0, firstPeriod + 1);
            }
          }
        }
      }

      // Q2: Ensure it starts with "A Pakistani teacher"
      if (idx === 1 && !scenario.toLowerCase().startsWith('a pakistani teacher')) {
        // Replace third-person teacher reference with "A Pakistani teacher"
        scenario = scenario.replace(/^(Ms\.|Mr\.|Mrs\.|Ms|Mr|Mrs)\s+\w+\s+/i, 'A Pakistani teacher ');
      }

      // PROMPT TRANSFORMATION
      // Convert imperative verbs to "What would you..." questions
      prompt = prompt.replace(/^Write\s+/i, 'What would you write to ');
      prompt = prompt.replace(/^Show\s+/i, 'What would you do to ');
      prompt = prompt.replace(/^Demonstrate\s+/i, 'What would you do to ');
      prompt = prompt.replace(/^Rewrite\s+/i, 'How would you rewrite ');
      prompt = prompt.replace(/^Explain\s+/i, 'What would you say to ');
      prompt = prompt.replace(/^Create\s+/i, 'What would you create to ');

      // Remove compound actions (everything after " and ")
      if (prompt.includes(' and ')) {
        prompt = prompt.split(' and ')[0].trim();
      }

      // Ensure prompt ends with question mark
      if (!prompt.endsWith('?')) {
        prompt = prompt.replace(/\.$/, '?').trim();
        if (!prompt.endsWith('?')) prompt += '?';
      }

      // Keep scenario to 2 sentences max
      const scenariaSentences = scenario.split(/\.\s+/).filter(s => s.trim());
      scenario = scenariaSentences.slice(0, 2).join('. ').trim();
      if (!scenario.endsWith('.')) scenario += '.';

      return {
        scenario: scenario,
        prompt: prompt,
        rubricCriteria: (q.rubricCriteria || []).slice(0, 3)
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

    // Add error handler before connecting
    dbConn.on('error', (err) => {
      console.error('[ERROR] Database connection error:', err);
    });

    await dbConn.connect();

    // Create table if it doesn't exist
    await dbConn.query(`
      CREATE TABLE IF NOT EXISTS generated_practice_questions (
        id SERIAL PRIMARY KEY,
        training_code VARCHAR(50) NOT NULL,
        indicator_codes TEXT[] NOT NULL,
        question_id VARCHAR(100) UNIQUE NOT NULL,
        scenario TEXT NOT NULL,
        prompt TEXT NOT NULL,
        rubric_criteria TEXT[] NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Save each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const questionId = `${trainingCode}-q${i + 1}`;

      await dbConn.query(
        `INSERT INTO generated_practice_questions
         (training_code, indicator_codes, question_id, scenario, prompt, rubric_criteria)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (question_id) DO UPDATE SET
         scenario = $4, prompt = $5, rubric_criteria = $6`,
        [
          trainingCode,
          [indicatorCode],
          questionId,
          q.scenario,
          q.prompt,
          q.rubricCriteria,
        ]
      );
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
    const { response, questionId } = req.body;

    if (!response || !questionId) {
      return res.status(400).json({ error: 'Missing response or questionId' });
    }

    // Extract indicator code from questionId (e.g., "SI1-q1" → "SI1")
    const indicatorCode = questionId.split('-')[0];
    const indicatorRubric = evaluationRubric.indicators[indicatorCode];

    if (!indicatorRubric) {
      return res.status(400).json({ error: `No rubric found for indicator ${indicatorCode}` });
    }

    // Build the evaluation prompt with actual rubric criteria
    const rubricText = `
INDICATOR: ${indicatorRubric.name}
DESCRIPTION: ${indicatorRubric.description}

RUBRIC CRITERIA:
YES criteria:
${indicatorRubric.criteria.YES.map((c: string) => `  - ${c}`).join('\n')}

PARTIAL criteria:
${indicatorRubric.criteria.PARTIAL.map((c: string) => `  - ${c}`).join('\n')}

NO criteria:
${indicatorRubric.criteria.NO.map((c: string) => `  - ${c}`).join('\n')}
`;

    const evaluationPrompt = `${evaluationRubric.systemPrompt}

${rubricText}

TEACHER'S RESPONSE:
"${response}"

Now evaluate this response against the rubric criteria above. Return ONLY valid JSON with no other text.`;

    const response_obj = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 800,
      messages: [{ role: 'user', content: evaluationPrompt }]
    });

    const responseText = response_obj.content[0].type === 'text' ? response_obj.content[0].text : '{}';
    console.log('Claude evaluation response:', responseText);

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
    res.json(evaluation);
  } catch (err) {
    console.error('Evaluation error:', err);
    res.status(500).json({ error: 'Failed to evaluate response: ' + (err instanceof Error ? err.message : String(err)) });
  }
});

// AI Student Simulation
const simulationsPath = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), 'data/simulations.json');
const simulations = JSON.parse(fs.readFileSync(simulationsPath, 'utf-8'));

app.post('/api/simulate', async (req, res) => {
  try {
    const { indicatorCode, conversationHistory, turnNumber, maxTurns } = req.body;

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

    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 150,
      system: studentSystemPrompt,
      messages: conversationForClaude,
    });

    const studentMessage = message.content[0].type === 'text' ? message.content[0].text : '';

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

      const evaluationMessage = await client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 400,
        messages: [{ role: 'user', content: evaluationPrompt }],
      });

      const evaluationText = evaluationMessage.content[0].type === 'text' ? evaluationMessage.content[0].text : '{}';

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

      res.json({
        studentMessage,
        isComplete: true,
        evaluation: {
          score: evaluation.score || 'PARTIAL',
          feedback: evaluation.feedback || 'Good effort!',
          rubric_criteria_met: evaluation.rubric_criteria_met || [],
          rubric_criteria_missed: evaluation.rubric_criteria_missed || [],
        },
      });
    } else {
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
