import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('═'.repeat(100));
console.log('COMPREHENSIVE SYSTEM AUDIT - CHECKING FOR MISSING COMPONENTS');
console.log('═'.repeat(100) + '\n');

// Load all data files
const evaluationRubric = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/data/evaluationRubric.json'), 'utf-8'));
const contextualTrainingData = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/data/contextualTrainingData.json'), 'utf-8'));
const performanceData = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/data/performanceData.json'), 'utf-8'));
const trainings = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/data/trainings.json'), 'utf-8'));
const serverCode = fs.readFileSync(path.join(__dirname, 'src/server.ts'), 'utf-8');

console.log('\n1️⃣  RUBRIC INDICATORS - COMPLETENESS CHECK');
console.log('─'.repeat(100));

const rubricIndicators = Object.keys(evaluationRubric.indicators);
console.log(`Total indicators in evaluationRubric.json: ${rubricIndicators.length}`);

let rubricIssues = [];
rubricIndicators.forEach(code => {
  const indicator = evaluationRubric.indicators[code];

  if (!indicator.name) rubricIssues.push(`  ❌ ${code}: Missing 'name'`);
  if (!indicator.description) rubricIssues.push(`  ❌ ${code}: Missing 'description'`);
  if (!indicator.criteria) rubricIssues.push(`  ❌ ${code}: Missing 'criteria'`);
  if (!indicator.criteria?.YES) rubricIssues.push(`  ❌ ${code}: Missing YES criteria`);
  if (!indicator.criteria?.PARTIAL) rubricIssues.push(`  ❌ ${code}: Missing PARTIAL criteria`);
  if (!indicator.criteria?.NO) rubricIssues.push(`  ❌ ${code}: Missing NO criteria`);
});

if (rubricIssues.length === 0) {
  console.log('✅ All indicators complete with YES/PARTIAL/NO criteria');
} else {
  console.log('⚠️  Issues found:');
  rubricIssues.forEach(issue => console.log(issue));
}

console.log('\n2️⃣  PERFORMANCE DATA - COMPLETENESS CHECK');
console.log('─'.repeat(100));

const performanceIndicators = Object.keys(performanceData.indicatorDetails);
console.log(`Total indicators in performanceData.json: ${performanceIndicators.length}`);

let perfIssues = [];
performanceIndicators.forEach(code => {
  const indicator = performanceData.indicatorDetails[code];

  if (!indicator.failureRate) perfIssues.push(`  ❌ ${code}: Missing failureRate`);
  if (!indicator.tier) perfIssues.push(`  ❌ ${code}: Missing tier`);
  if (!indicator.totalAssessments) perfIssues.push(`  ❌ ${code}: Missing totalAssessments`);
  if (!indicator.commonGaps) perfIssues.push(`  ❌ ${code}: Missing commonGaps`);
  if (!indicator.trainingFocus) perfIssues.push(`  ❌ ${code}: Missing trainingFocus`);
});

if (perfIssues.length === 0) {
  console.log('✅ All performance indicators complete');
} else {
  console.log('⚠️  Issues found:');
  perfIssues.forEach(issue => console.log(issue));
}

console.log('\n3️⃣  CONTEXTUAL TRAINING DATA - COMPLETENESS CHECK');
console.log('─'.repeat(100));

const contextIndicators = Object.keys(contextualTrainingData.indicator_contexts);
console.log(`Total indicators in contextualTrainingData.json: ${contextIndicators.length}`);

let contextIssues = [];
contextIndicators.forEach(code => {
  const context = contextualTrainingData.indicator_contexts[code];

  if (!context.name) contextIssues.push(`  ❌ ${code}: Missing 'name'`);
  if (!context.description) contextIssues.push(`  ❌ ${code}: Missing 'description'`);
  if (!context.rubric) contextIssues.push(`  ❌ ${code}: Missing 'rubric' object`);
  if (!context.rubric?.criteria_yes) contextIssues.push(`  ❌ ${code}: Missing YES criteria in rubric`);
});

if (contextIssues.length === 0) {
  console.log('✅ All contextual data complete');
} else {
  console.log('⚠️  Issues found:');
  contextIssues.forEach(issue => console.log(issue));
}

console.log('\n4️⃣  TRAINING DATA - COMPLETENESS CHECK');
console.log('─'.repeat(100));

const trainingIndicators = Object.keys(trainings);
console.log(`Total trainings in trainings.json: ${trainingIndicators.length}`);

let trainingIssues = [];
trainingIndicators.forEach(code => {
  const training = trainings[code];

  if (!training.name) trainingIssues.push(`  ❌ ${code}: Missing 'name'`);
  if (!training.description) trainingIssues.push(`  ❌ ${code}: Missing 'description'`);
  if (!training.videoUrl) trainingIssues.push(`  ⚠️  ${code}: Missing 'videoUrl'`);
  if (!training.resources) trainingIssues.push(`  ❌ ${code}: Missing 'resources'`);
});

if (trainingIssues.length === 0) {
  console.log('✅ All trainings complete');
} else {
  console.log('Issues found:');
  trainingIssues.forEach(issue => console.log(issue));
}

console.log('\n5️⃣  CROSS-REFERENCE VALIDATION');
console.log('─'.repeat(100));

let crossRefIssues = [];

rubricIndicators.forEach(code => {
  const inPerformance = performanceData.indicatorDetails[code];
  const inContextual = contextualTrainingData.indicator_contexts[code];
  const hasTraining = trainings[code];

  if (!inPerformance) {
    crossRefIssues.push(`  ⚠️  ${code}: In rubric but NOT in performanceData.json`);
  }
  if (!inContextual) {
    crossRefIssues.push(`  ⚠️  ${code}: In rubric but NOT in contextualTrainingData.json`);
  }
  if (!hasTraining) {
    crossRefIssues.push(`  ℹ️  ${code}: No training resources`);
  }
});

if (crossRefIssues.length === 0) {
  console.log('✅ All indicators present across all data sources');
} else {
  console.log('Issues found:');
  crossRefIssues.slice(0, 15).forEach(issue => console.log(issue));
  if (crossRefIssues.length > 15) {
    console.log(`  ... and ${crossRefIssues.length - 15} more`);
  }
}

console.log('\n6️⃣  SERVER CODE - API ENDPOINT CHECK');
console.log('─'.repeat(100));

let serverIssues = [];

if (!serverCode.includes('/api/generate-questions')) {
  serverIssues.push('  ❌ /api/generate-questions endpoint missing');
}
if (!serverCode.includes('evaluationRubric')) {
  serverIssues.push('  ❌ evaluationRubric not loaded');
}
if (!serverCode.includes('contextualTrainingData')) {
  serverIssues.push('  ❌ contextualTrainingData not loaded');
}
if (!serverCode.includes('trainings')) {
  serverIssues.push('  ❌ trainings not loaded');
}
if (!serverCode.includes('RUBRIC CONTEXT')) {
  serverIssues.push('  ❌ Rubric context extraction missing');
}
if (!serverCode.includes('DATABASE CONTEXT')) {
  serverIssues.push('  ❌ Database context extraction missing');
}
if (!serverCode.includes('TRAINING CONTEXT')) {
  serverIssues.push('  ❌ Training context extraction missing');
}
if (!serverCode.includes('THREE-CONTEXT PIPELINE')) {
  serverIssues.push('  ❌ Three-context pipeline header missing');
}

if (serverIssues.length === 0) {
  console.log('✅ All required endpoints and context extraction present');
} else {
  console.log('Issues found:');
  serverIssues.forEach(issue => console.log(issue));
}

console.log('\n7️⃣  DATA QUALITY CHECKS');
console.log('─'.repeat(100));

let qualityIssues = [];

contextIndicators.forEach(code => {
  const context = contextualTrainingData.indicator_contexts[code];
  if (context.real_performance) {
    const perf = context.real_performance;
    if (perf.fail_rate_percent > 100 || perf.fail_rate_percent < 0) {
      qualityIssues.push(`  ❌ ${code}: Invalid fail_rate_percent (${perf.fail_rate_percent})`);
    }
  }
});

rubricIndicators.forEach(code => {
  const rubric = evaluationRubric.indicators[code];
  if (!rubric.criteria.YES || rubric.criteria.YES.length === 0) {
    qualityIssues.push(`  ❌ ${code}: Empty YES criteria`);
  }
});

if (qualityIssues.length === 0) {
  console.log('✅ All data quality checks passed');
} else {
  console.log('Issues found:');
  qualityIssues.forEach(issue => console.log(issue));
}

console.log('\n8️⃣  COVERAGE ANALYSIS');
console.log('─'.repeat(100));

const indicatorsWithAllContexts = rubricIndicators.filter(code => {
  return performanceData.indicatorDetails[code] && trainings[code];
});

const indicatorsWithRubricAndPerformance = rubricIndicators.filter(code => {
  return performanceData.indicatorDetails[code];
});

console.log(`✅ Indicators with Rubric:              ${rubricIndicators.length}/23`);
console.log(`✅ Indicators with Performance Data:    ${indicatorsWithRubricAndPerformance.length}/23 (${((indicatorsWithRubricAndPerformance.length/23)*100).toFixed(1)}%)`);
console.log(`✅ Indicators with Training:            ${trainingIndicators.length}/23 (${((trainingIndicators.length/23)*100).toFixed(1)}%)`);
console.log(`✅ Indicators with ALL THREE:           ${indicatorsWithAllContexts.length}/23 (${((indicatorsWithAllContexts.length/23)*100).toFixed(1)}%)`);

console.log('\n9️⃣  MISSING ITEMS SUMMARY');
console.log('─'.repeat(100));

const missingPerformance = rubricIndicators.filter(code => !performanceData.indicatorDetails[code]);
const missingTraining = rubricIndicators.filter(code => !trainings[code]);

if (missingPerformance.length > 0) {
  console.log(`\n⚠️  Missing from Performance Data (${missingPerformance.length}):`);
  missingPerformance.forEach(code => {
    const rubric = evaluationRubric.indicators[code];
    console.log(`   - ${code}: ${rubric.name}`);
  });
}

if (missingTraining.length > 0) {
  console.log(`\n⚠️  Missing Training Resources (${missingTraining.length}):`);
  missingTraining.forEach(code => {
    const rubric = evaluationRubric.indicators[code];
    console.log(`   - ${code}: ${rubric.name}`);
  });
}

console.log('\n' + '═'.repeat(100));
console.log('AUDIT COMPLETE');
console.log('═'.repeat(100));

const criticalIssues = [...rubricIssues, ...perfIssues, ...contextIssues, ...trainingIssues, ...serverIssues, ...qualityIssues].filter(i => i.includes('❌'));

if (criticalIssues.length === 0) {
  console.log('\n✅ NO CRITICAL ISSUES FOUND - System is complete and ready\n');
} else {
  console.log(`\n⚠️  ${criticalIssues.length} CRITICAL ISSUES FOUND\n`);
}
