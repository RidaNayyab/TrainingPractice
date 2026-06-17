#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { Client } = pg;

console.log('🔄 MIGRATING DATA TO NEW DATABASE\n');

// Old database credentials
const oldDbConfig = {
  host: 'maglev.proxy.rlwy.net',
  port: 53678,
  user: 'postgres',
  password: 'CKknRTqPOTTaYjtUKyARcTtQEIsYRVYF',
  database: 'railway'
};

// New database credentials (from .env.local)
const newDbConfig = {
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE
};

async function migrate() {
  const oldDb = new Client(oldDbConfig);
  const newDb = new Client(newDbConfig);

  try {
    console.log('📡 Connecting to OLD database...');
    await oldDb.connect();
    console.log('✅ Connected to old database\n');

    console.log('📡 Connecting to NEW database...');
    await newDb.connect();
    console.log('✅ Connected to new database\n');

    // Step 1: Create table in new database
    console.log('📋 Creating tables in new database...');
    await newDb.query(`
      CREATE TABLE IF NOT EXISTS generated_practice_questions (
        id SERIAL PRIMARY KEY,
        training_code VARCHAR(50) NOT NULL,
        indicator_codes TEXT[] NOT NULL,
        question_id VARCHAR(100) UNIQUE NOT NULL,
        scenario TEXT NOT NULL,
        prompt TEXT NOT NULL,
        rubric_criteria TEXT[] NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        training_title VARCHAR(255),
        indicator_code VARCHAR(50),
        indicator_rubric JSONB,
        question_context JSONB
      );
    `);
    console.log('✅ Tables created\n');

    // Step 2: Get all data from old database
    console.log('📥 Fetching data from old database...');
    const result = await oldDb.query(
      'SELECT training_code, indicator_codes, question_id, scenario, prompt, rubric_criteria, created_at FROM generated_practice_questions'
    );
    const questions = result.rows;
    console.log(`✅ Found ${questions.length} questions\n`);

    // Step 3: Insert into new database
    console.log('📤 Inserting data into new database...');
    for (const q of questions) {
      try {
        await newDb.query(
          `INSERT INTO generated_practice_questions
           (training_code, indicator_codes, question_id, scenario, prompt, rubric_criteria, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (question_id) DO NOTHING`,
          [
            q.training_code,
            q.indicator_codes,
            q.question_id,
            q.scenario,
            q.prompt,
            q.rubric_criteria,
            q.created_at
          ]
        );
      } catch (err) {
        console.error(`Error inserting ${q.question_id}:`, err.message);
      }
    }
    console.log(`✅ Migrated ${questions.length} questions\n`);

    // Step 4: Verify
    console.log('✅ Verifying data in new database...');
    const verifyResult = await newDb.query(
      'SELECT COUNT(*) as count FROM generated_practice_questions'
    );
    const newCount = verifyResult.rows[0].count;
    console.log(`✅ New database now has ${newCount} questions\n`);

    console.log('='.repeat(80));
    console.log('✅ MIGRATION COMPLETE!');
    console.log('='.repeat(80));
    console.log(`\n📊 Summary:`);
    console.log(`   Old database: ${questions.length} questions`);
    console.log(`   New database: ${newCount} questions`);
    console.log(`\n🎉 Your data is now in: mellow-friendshop (Railway)\n`);

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  } finally {
    await oldDb.end();
    await newDb.end();
  }
}

migrate();
