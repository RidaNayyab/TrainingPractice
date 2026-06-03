import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.local') });

const client = new Client({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

async function main() {
  try {
    await client.connect();

    // Check for tables related to tiers or teacher progress
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%tier%' OR table_name LIKE '%teacher%progress%' OR table_name LIKE '%teacher_progress%')
      ORDER BY table_name
    `);

    console.log('Available tables with "tier" or "progress" in name:');
    if (result.rows.length === 0) {
      console.log('  (none found)');
    } else {
      result.rows.forEach(row => console.log(`  - ${row.table_name}`));
    }

    // Check what tables exist in public schema
    const allTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\nAll public tables:');
    allTables.rows.forEach(row => console.log(`  - ${row.table_name}`));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
