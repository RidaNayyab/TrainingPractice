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

    // Check schema
    const schema = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'teacher_tier_progression'
      ORDER BY ordinal_position
    `);

    console.log('teacher_tier_progression schema:');
    schema.rows.forEach(row => console.log(`  ${row.column_name}: ${row.data_type}`));

    // Check some data
    const data = await client.query(`
      SELECT * FROM teacher_tier_progression 
      LIMIT 10
    `);

    console.log('\nSample data (first 10):');
    console.log(JSON.stringify(data.rows, null, 2));

    // Check for teacher 12711
    const teacher12711 = await client.query(`
      SELECT * FROM teacher_tier_progression 
      WHERE teacher_id = '12711'
    `);

    console.log('\nTier data for teacher 12711:');
    console.log(JSON.stringify(teacher12711.rows, null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
