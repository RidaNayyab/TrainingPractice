import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const host = process.env.FDE_DATABASE_HOST || process.env.PROD_FDE_DATABASE_HOST;
const port = process.env.FDE_DATABASE_PORT || '2344';
const user = process.env.FDE_DATABASE_USER || process.env.PROD_FDE_DATABASE_USER;
const password = process.env.FDE_DATABASE_PASSWORD || process.env.PROD_FDE_DATABASE_PASSWORD;
const database = process.env.FDE_DATABASE_NAME || process.env.PROD_FDE_DATABASE_NAME;

if (!host || !user || !password || !database) {
  console.error('❌ Missing FDE_DATABASE_* env vars in .env.local — cannot run.');
  process.exit(1);
}

// Separate config fields (not connection string) — password can contain URL-reserved chars
const pool = new pg.Pool({
  host,
  port: parseInt(port),
  user,
  password,
  database,
  ssl: { rejectUnauthorized: false }
});

async function buildContextPipeline() {
  try {
    console.log('🔨 BUILDING THREE-CONTEXT PIPELINE\n');

    // 1. Load existing rubric
    console.log('1️⃣  Loading evaluation rubric...');
    const rubricPath = path.join(__dirname, 'src/data/evaluationRubric.json');
    const evaluationRubric = JSON.parse(fs.readFileSync(rubricPath, 'utf-8'));
    const rubricIndicators = Object.keys(evaluationRubric.indicators || {});
    console.log(`   ✅ Loaded ${rubricIndicators.length} rubric indicators`);

    // 2. Load trainings
    console.log('\n2️⃣  Loading training mappings...');
    const trainingsPath = path.join(__dirname, 'src/data/trainings.json');
    const trainings = JSON.parse(fs.readFileSync(trainingsPath, 'utf-8'));
    console.log(`   ✅ Loaded training structure`);

    // 3. Load performance data
    console.log('\n3️⃣  Loading performance data from performanceData.json...');
    const perfDataPath = path.join(__dirname, 'src/data/performanceData.json');
    const performanceData = JSON.parse(fs.readFileSync(perfDataPath, 'utf-8'));
    console.log(`   ✅ Loaded performance data for ${Object.keys(performanceData.indicatorDetails).length} indicators`);

    // 4. Build combined context
    console.log('\n4️⃣  Building combined indicator contexts...');

    const contextData = {
      version: '2026-06-16',
      database: 'fde_production',
      observation_period: 'April 13 - May 25, 2026',
      total_observations: 2614,
      unique_teachers: 566,
      unique_regions: 6,
      rubric_indicators: rubricIndicators.length,
      sources: {
        database: 'fde_production (real teacher observations)',
        rubric: 'evaluationRubric.json (FiCO V3 criteria)',
        trainings: 'trainings.json (course content)'
      },
      indicator_contexts: {}
    };

    // Map each rubric indicator to database and training context
    for (const indicatorCode of rubricIndicators) {
      const rubric = evaluationRubric.indicators[indicatorCode];

      // Find matching performance data from performanceData.json
      const perfMatch = performanceData.indicatorDetails[indicatorCode];

      contextData.indicator_contexts[indicatorCode] = {
        name: rubric.name,
        description: rubric.description,

        // RUBRIC CONTEXT
        rubric: {
          criteria_yes: rubric.criteria?.YES || [],
          criteria_partial: rubric.criteria?.PARTIAL || [],
          criteria_no: rubric.criteria?.NO || [],
          ai_detection_method: rubric.aiDetectionMethod,
          audio_observable: rubric.audioObservable
        },

        // DATABASE CONTEXT (from performanceData.json with real Apr-May 2026 data)
        real_performance: perfMatch ? {
          fail_rate_percent: perfMatch.failureRate * 100,
          no_score_count: perfMatch.failureCount,
          partial_score_count: perfMatch.partialCount,
          yes_score_count: perfMatch.successCount,
          total_assessments: perfMatch.totalAssessments,
          tier: perfMatch.tier,
          common_failure_pattern: perfMatch.commonGaps ? perfMatch.commonGaps[0] : 'See details',
          training_focus: perfMatch.trainingFocus
        } : null,

        // TRAINING CONTEXT (to be populated)
        training_codes: []
      };
    }

    // Save combined context
    const contextPath = path.join(__dirname, 'src/data/contextualTrainingData.json');
    fs.writeFileSync(contextPath, JSON.stringify(contextData, null, 2));
    console.log(`   ✅ Saved to contextualTrainingData.json`);

    console.log('\n' + '='.repeat(70));
    console.log('✅ THREE-CONTEXT PIPELINE READY FOR QUESTION GENERATION');
    console.log('='.repeat(70));
    console.log(`\n📊 Pipeline Contents:`);
    console.log(`  • Rubric indicators: ${rubricIndicators.length}`);
    console.log(`  • With real performance data: ${Object.values(contextData.indicator_contexts).filter(c => c.real_performance).length}`);
    console.log(`  • Observation period: Apr-May 2026`);
    console.log(`  • Teachers studied: 566 across 6 regions`);
    console.log(`  • Performance data source: performanceData.json`);
    console.log(`\n📍 Each indicator now has:`);
    console.log(`  1. RUBRIC CONTEXT: Official criteria (YES/PARTIAL/NO)`);
    console.log(`  2. DATABASE CONTEXT: Real failure rates from Apr-May 2026 observations`);
    console.log(`  3. TRAINING CONTEXT: Course content metadata`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

buildContextPipeline();
