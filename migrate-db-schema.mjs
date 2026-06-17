#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { Client } = pg;

console.log('🔄 Migrating database schema...\n');

const dbClient = new Client({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE
});

try {
  await dbClient.connect();

  // Add new columns if they don't exist
  const columnsToAdd = [
    { name: 'training_title', type: 'VARCHAR(255)' },
    { name: 'indicator_code', type: 'VARCHAR(50)' },
    { name: 'indicator_rubric', type: 'JSONB' },
    { name: 'question_context', type: 'JSONB' }
  ];

  console.log('Adding new columns...');

  for (const col of columnsToAdd) {
    try {
      await dbClient.query(
        `ALTER TABLE generated_practice_questions ADD COLUMN ${col.name} ${col.type};`
      );
      console.log(`  ✅ Added column: ${col.name}`);
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`  ⏭️  Column ${col.name} already exists, skipping`);
      } else {
        throw error;
      }
    }
  }

  console.log('\n✅ Migration complete!\n');

  // Show updated schema
  const columnsResult = await dbClient.query(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_name = 'generated_practice_questions'
     ORDER BY ordinal_position;`
  );

  console.log('📋 Updated table columns:');
  columnsResult.rows.forEach(col => {
    console.log(`  - ${col.column_name} (${col.data_type})`);
  });

  await dbClient.end();

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
