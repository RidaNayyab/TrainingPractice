#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { Client } = pg;

console.log('📚 YOUR SAVED QUESTIONS\n');

const dbClient = new Client({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE
});

try {
  await dbClient.connect();

  // Get unique training codes
  const codesResult = await dbClient.query(
    `SELECT DISTINCT training_code
     FROM generated_practice_questions
     ORDER BY training_code`
  );

  const trainingCodes = codesResult.rows.map(r => r.training_code);

  console.log(`Found ${trainingCodes.length} training codes:\n`);

  for (const code of trainingCodes) {
    const result = await dbClient.query(
      `SELECT question_id, indicator_codes, scenario, prompt
       FROM generated_practice_questions
       WHERE training_code = $1
       ORDER BY question_id`,
      [code]
    );

    console.log(`\n${'='.repeat(80)}`);
    console.log(`📋 Training Code: ${code}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`Total Questions: ${result.rows.length}\n`);

    result.rows.forEach((row, idx) => {
      console.log(`Q${idx + 1}: ${row.question_id}`);
      console.log(`  Indicator: ${row.indicator_codes?.[0] || '(not set)'}`);
      console.log(`  Scenario: ${row.scenario.substring(0, 70)}...`);
      console.log(`  Prompt: ${row.prompt.substring(0, 70)}...\n`);
    });
  }

  // Summary
  const allResult = await dbClient.query(
    `SELECT COUNT(*) as total FROM generated_practice_questions`
  );

  console.log(`\n${'='.repeat(80)}`);
  console.log(`✅ TOTAL QUESTIONS SAVED: ${allResult.rows[0].total}`);
  console.log(`${'='.repeat(80)}\n`);

  await dbClient.end();

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
