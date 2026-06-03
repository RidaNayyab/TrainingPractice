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

    console.log('Checking teacher 1685...\n');

    // Check observations
    const obsCount = await client.query('SELECT COUNT(*) as count FROM observations WHERE teacher_id = $1', ['1685']);
    console.log(`Observations for teacher 1685: ${obsCount.rows[0].count}`);

    // Check tier data
    const tierData = await client.query('SELECT * FROM teacher_tier_progression WHERE teacher_id = $1', ['1685']);
    console.log(`Tier data for teacher 1685:`, tierData.rows.length > 0 ? 'EXISTS' : 'NOT FOUND');
    if (tierData.rows.length > 0) {
      console.log(`  Current tier: ${tierData.rows[0].current_tier}`);
    }

    // Check all teacher IDs in the table
    const allTeachers = await client.query(`
      SELECT DISTINCT teacher_id FROM teacher_tier_progression 
      ORDER BY teacher_id::integer
      LIMIT 10
    `);
    console.log(`\nFirst 10 teacher IDs in tier_progression:`, allTeachers.rows.map(r => r.teacher_id));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
