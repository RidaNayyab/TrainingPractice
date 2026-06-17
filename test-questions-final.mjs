#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { Client } = pg;

console.log('🧪 TESTING QUESTION STORAGE\n');

const dbClient = new Client({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE
});

try {
  await dbClient.connect();

  // Query all saved questions
  const result = await dbClient.query(`
    SELECT
      id,
      training_code,
      indicator_codes,
      indicator_code,
      training_title,
      question_id,
      scenario,
      prompt,
      rubric_criteria,
      indicator_rubric,
      question_context,
      created_at
    FROM generated_practice_questions
    ORDER BY created_at DESC
    LIMIT 10
  `);

  console.log(`✅ Found ${result.rows.length} questions in database\n`);

  result.rows.forEach((row, idx) => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📌 QUESTION ${idx + 1}`);
    console.log('='.repeat(80));

    console.log(`\n📋 Metadata:`);
    console.log(`  Training Code: ${row.training_code}`);
    console.log(`  Training Title: ${row.training_title || '(not set)'}`);
    console.log(`  Indicator Codes: ${row.indicator_codes?.join(', ') || '(not set)'}`);
    console.log(`  Indicator Code: ${row.indicator_code || '(not set)'}`);
    console.log(`  Question ID: ${row.question_id}`);
    console.log(`  Created: ${row.created_at}`);

    console.log(`\n📝 Content:`);
    console.log(`  Scenario: ${row.scenario}`);
    console.log(`  Prompt: ${row.prompt}`);
    console.log(`  Rubric Criteria: ${JSON.stringify(row.rubric_criteria)}`);

    if (row.indicator_rubric) {
      try {
        const rubric = JSON.parse(row.indicator_rubric);
        const keys = Object.keys(rubric);
        console.log(`\n🎯 Indicator Rubric Keys: ${keys.join(', ')}`);
        if (keys.includes('YES')) {
          console.log(`   YES: ${rubric.YES.length} items`);
        }
      } catch (e) {
        console.log(`  Indicator Rubric: (unparseable)`);
      }
    } else {
      console.log(`\n🎯 Indicator Rubric: (not set)`);
    }

    if (row.question_context) {
      try {
        const context = JSON.parse(row.question_context);
        console.log(`\n📊 Question Context:`);
        console.log(`   Failure Rate: ${context.failureRate || '(not set)'}%`);
        console.log(`   Tier: ${context.tier || '(not set)'}`);
      } catch (e) {
        console.log(`\n📊 Question Context: (unparseable)`);
      }
    } else {
      console.log(`\n📊 Question Context: (not set)`);
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('✅ TEST COMPLETE');
  console.log('='.repeat(80) + '\n');

  await dbClient.end();

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
