#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { Client } = pg;

console.log('🧪 TESTING QUESTION GENERATION AND STORAGE\n');

// Step 1: Generate questions
console.log('📝 Step 1: Generating questions for SI1...');
try {
  const genResponse = await fetch('http://localhost:3001/api/generate-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      indicatorCode: 'SI1',
      trainingCode: 'SI1',
      learningOutcome: 'State clear learning objectives'
    })
  });

  const genResult = await genResponse.json();
  if (!genResult.questions) {
    console.log('❌ Failed to generate questions');
    console.log('Response:', genResult);
    process.exit(1);
  }

  console.log(`✅ Generated ${genResult.questions.length} questions\n`);

  // Display generated questions
  genResult.questions.forEach((q, i) => {
    console.log(`Q${i + 1}:`);
    console.log(`  Scenario: ${q.scenario.substring(0, 80)}...`);
    console.log(`  Prompt: ${q.prompt.substring(0, 80)}...`);
    console.log(`  Criteria: ${q.rubricCriteria.length} items\n`);
  });

  // Step 2: Save questions
  console.log('💾 Step 2: Saving questions to database...');
  const saveResponse = await fetch('http://localhost:3001/api/save-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      trainingCode: 'SI1',
      indicatorCode: 'SI1',
      questions: genResult.questions
    })
  });

  const saveResult = await saveResponse.json();
  if (!saveResult.success) {
    console.log('❌ Failed to save questions:', saveResult.error);
    process.exit(1);
  }

  console.log(`✅ Saved ${saveResult.count} questions to database\n`);

  // Step 3: Query database to verify
  console.log('🔍 Step 3: Verifying data in database...');
  const dbClient = new Client({
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE
  });

  await dbClient.connect();

  const result = await dbClient.query(
    'SELECT question_id, scenario, prompt, indicator_code, training_title, indicator_rubric, question_context FROM generated_practice_questions WHERE training_code = $1 ORDER BY created_at DESC LIMIT 2',
    ['SI1']
  );

  if (result.rows.length === 0) {
    console.log('❌ No questions found in database!');
  } else {
    console.log(`✅ Found ${result.rows.length} questions in database:\n`);

    result.rows.forEach((row, i) => {
      console.log(`\n=== Question ${i + 1} ===`);
      console.log(`Question ID: ${row.question_id}`);
      console.log(`Indicator: ${row.indicator_code}`);
      console.log(`Training: ${row.training_title}`);
      console.log(`\nScenario: ${row.scenario}`);
      console.log(`\nPrompt: ${row.prompt}`);

      if (row.indicator_rubric) {
        try {
          const rubric = JSON.parse(row.indicator_rubric);
          console.log(`\nIndicator Rubric Keys: ${Object.keys(rubric).join(', ')}`);
        } catch (e) {
          console.log(`Indicator Rubric: ${typeof row.indicator_rubric}`);
        }
      }

      if (row.question_context) {
        try {
          const context = JSON.parse(row.question_context);
          console.log(`Context - Failure Rate: ${context.failureRate}%, Tier: ${context.tier}`);
        } catch (e) {
          console.log(`Question Context: ${typeof row.question_context}`);
        }
      }
    });
  }

  await dbClient.end();
  console.log('\n✅ TEST COMPLETE!\n');

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
