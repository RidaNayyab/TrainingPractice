import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the files
const evaluationRubric = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/data/evaluationRubric.json'), 'utf-8'));
const contextualTrainingData = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/data/contextualTrainingData.json'), 'utf-8'));
const trainings = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/data/trainings.json'), 'utf-8'));

console.log('════════════════════════════════════════════════════════════════════');
console.log('DEBUGGING: CONTEXT EXTRACTION FOR QUESTION GENERATION');
console.log('════════════════════════════════════════════════════════════════════\n');

// Test with L1 (CRITICAL indicator)
const testIndicatorCode = 'L1';
const testTrainingCode = 'L1'; // Trainings are keyed by indicator code, not training name
const testLearningOutcome = 'Teachers can design explicit, systematic phonics instruction';

console.log(`Testing with: ${testIndicatorCode} (CRITICAL - 72% failure rate)\n`);

// ========== CONTEXT EXTRACTION LOGIC (from server.ts) ==========
let indicatorRubric = null;
let indicatorName = '';
let databaseContext = '';
let rubricContext = '';
let trainingContext = '';

// 1. RUBRIC CONTEXT
console.log('1️⃣ EXTRACTING RUBRIC CONTEXT');
console.log('─'.repeat(70));

if (testIndicatorCode && evaluationRubric.indicators && evaluationRubric.indicators[testIndicatorCode]) {
  indicatorRubric = evaluationRubric.indicators[testIndicatorCode];
  indicatorName = indicatorRubric.name;

  console.log(`✅ Found indicator rubric: "${indicatorName}"`);
  console.log(`   Code: ${testIndicatorCode}`);

  const yesCriteria = (indicatorRubric.criteria?.YES || []).slice(0, 3);
  console.log(`   YES Criteria count: ${yesCriteria.length}`);
  yesCriteria.forEach((c, i) => {
    console.log(`      ${i + 1}. ${c.substring(0, 70)}${c.length > 70 ? '...' : ''}`);
  });

  rubricContext = `
RUBRIC CONTEXT (Official FiCO V3 Criteria):
Indicator: ${indicatorName} (${testIndicatorCode})
What excellent performance looks like:
${yesCriteria.map((c, i) => `  ${i + 1}. ${c}`).join('\n')}`;

  console.log(`\n✅ Rubric context created (${rubricContext.length} chars)`);
} else {
  console.log(`❌ FAILED: Indicator ${testIndicatorCode} NOT FOUND in evaluationRubric.json`);
  console.log(`   Available indicators: ${Object.keys(evaluationRubric.indicators).slice(0, 5).join(', ')}...`);
}

// 2. DATABASE CONTEXT
console.log('\n2️⃣ EXTRACTING DATABASE CONTEXT');
console.log('─'.repeat(70));

if (testIndicatorCode && contextualTrainingData.indicator_contexts && contextualTrainingData.indicator_contexts[testIndicatorCode]) {
  const contextData = contextualTrainingData.indicator_contexts[testIndicatorCode];

  if (contextData.real_performance) {
    const perf = contextData.real_performance;
    console.log(`✅ Found performance data for ${testIndicatorCode}`);
    console.log(`   Failure Rate: ${perf.fail_rate_percent.toFixed(1)}%`);
    console.log(`   NO count: ${perf.no_score_count}`);
    console.log(`   PARTIAL count: ${perf.partial_score_count}`);
    console.log(`   YES count: ${perf.yes_score_count}`);
    console.log(`   Total: ${perf.total_assessments}`);
    console.log(`   Tier: ${perf.tier}`);
    console.log(`   Common Gap: ${perf.common_failure_pattern}`);

    databaseContext = `
DATABASE CONTEXT (Real Teacher Performance - Apr-May 2026, 566 teachers):
- Failure Rate: ${perf.fail_rate_percent}% (${perf.no_score_count + perf.partial_score_count} failed out of ${perf.total_assessments})
- No Score: ${perf.no_score_count} teachers | Partial: ${perf.partial_score_count} teachers | Yes: ${perf.yes_score_count} teachers
- Performance Level: ${perf.common_failure_pattern}
This tells us what teachers are actually struggling with in real observations.`;

    console.log(`\n✅ Database context created (${databaseContext.length} chars)`);
  } else {
    console.log(`⚠️  No real_performance data for ${testIndicatorCode}`);
  }
} else {
  console.log(`❌ FAILED: ${testIndicatorCode} NOT FOUND in contextualTrainingData.json`);
  console.log(`   Indicator contexts keys:`, Object.keys(contextualTrainingData.indicator_contexts).slice(0, 5));
}

// 3. TRAINING CONTEXT (keyed by indicator code, not training code)
console.log('\n3️⃣ EXTRACTING TRAINING CONTEXT');
console.log('─'.repeat(70));

if (testIndicatorCode && trainings && trainings[testIndicatorCode]) {
  const training = trainings[testIndicatorCode];
  console.log(`✅ Found training: "${training.name}"`);
  console.log(`   Code: ${testIndicatorCode}`);
  console.log(`   Description: ${training.description}`);
  console.log(`   Resources: ${training.resources?.length || 0} videos`);
  console.log(`   Learning Outcome: ${testLearningOutcome}`);

  trainingContext = `
TRAINING CONTEXT (Course Content):
Training: ${training.name || testIndicatorCode}
Description: ${training.description || 'General pedagogical skill'}
Learning Outcome: ${testLearningOutcome}
Resources: ${training.resources?.length || 0} training videos available
Focus: Teachers completing this training should be able to demonstrate this indicator effectively.`;

  console.log(`\n✅ Training context created (${trainingContext.length} chars)`);
} else {
  console.log(`⚠️  Training for ${testIndicatorCode} NOT FOUND`);
  console.log(`   Available trainings: ${Object.keys(trainings).slice(0, 5).join(', ')}...`);
}

// ========== COMBINED CONTEXT FOR CLAUDE ==========
console.log('\n' + '═'.repeat(70));
console.log('FINAL CONTEXT PASSED TO CLAUDE');
console.log('═'.repeat(70));

const fullContext = `
${rubricContext}

${databaseContext}

${trainingContext}`;

console.log('\nContext being sent to Claude:');
console.log('─'.repeat(70));
console.log(fullContext);
console.log('─'.repeat(70));

console.log('\n' + '═'.repeat(70));
console.log('VERIFICATION SUMMARY');
console.log('═'.repeat(70));
console.log(`
✅ Rubric loaded:      ${rubricContext.length > 0 ? 'YES' : 'NO'}
✅ Database context:   ${databaseContext.length > 0 ? 'YES' : 'NO'}
✅ Training context:   ${trainingContext.length > 0 ? 'YES' : 'NO'}

Total context size: ${fullContext.length} characters

Issues found: ${
  (rubricContext.length === 0 ? 'Missing rubric | ' : '') +
  (databaseContext.length === 0 ? 'Missing database context | ' : '') +
  (trainingContext.length === 0 ? 'Missing training context' : '')
}
`);
