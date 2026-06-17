#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { Client } = pg;

console.log('🔍 Checking database schema...\n');

const dbClient = new Client({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE
});

try {
  await dbClient.connect();

  // Check if table exists
  const tableCheck = await dbClient.query(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'generated_practice_questions'
    );`
  );

  if (!tableCheck.rows[0].exists) {
    console.log('❌ Table "generated_practice_questions" does not exist');
    await dbClient.end();
    process.exit(1);
  }

  console.log('✅ Table "generated_practice_questions" exists\n');

  // Get columns
  const columnsResult = await dbClient.query(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_name = 'generated_practice_questions'
     ORDER BY ordinal_position;`
  );

  console.log('📋 Table columns:');
  columnsResult.rows.forEach(col => {
    console.log(`  - ${col.column_name} (${col.data_type})`);
  });

  // Get row count
  const countResult = await dbClient.query(
    'SELECT COUNT(*) as count FROM generated_practice_questions'
  );

  console.log(`\n📊 Total rows: ${countResult.rows[0].count}\n`);

  // Show sample data
  if (countResult.rows[0].count > 0) {
    console.log('📄 Sample data (first row):');
    const sampleResult = await dbClient.query(
      'SELECT * FROM generated_practice_questions LIMIT 1'
    );

    const row = sampleResult.rows[0];
    Object.keys(row).forEach(key => {
      let value = row[key];
      if (typeof value === 'object') {
        value = JSON.stringify(value).substring(0, 100) + '...';
      } else if (typeof value === 'string') {
        value = value.substring(0, 100) + (value.length > 100 ? '...' : '');
      }
      console.log(`  ${key}: ${value}`);
    });
  }

  await dbClient.end();
  console.log('\n✅ Done');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
