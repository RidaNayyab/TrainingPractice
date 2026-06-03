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

    const result = await client.query(`
      SELECT ttp.teacher_id, ttp.current_tier, COUNT(*) as obs_count
      FROM teacher_tier_progression ttp
      JOIN observations o ON ttp.teacher_id = o.teacher_id
      WHERE ttp.current_tier IN ('advanced', 'core')
      GROUP BY ttp.teacher_id, ttp.current_tier
      ORDER BY ttp.current_tier DESC, ttp.teacher_id
      LIMIT 20
    `);

    console.log('Teachers with core or advanced tier:');
    result.rows.forEach(row => {
      console.log(`  ${row.teacher_id}: ${row.current_tier} (${row.obs_count} observations)`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
