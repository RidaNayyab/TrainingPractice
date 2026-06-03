import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const dbClient = new Client({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

async function checkRegions() {
  try {
    await dbClient.connect();
    console.log('✅ Connected to Railway database\n');

    // Get all unique regions
    console.log('🔍 All unique regions in observations table:\n');
    const regions = await dbClient.query(`
      SELECT DISTINCT region, COUNT(*) as observation_count
      FROM observations
      GROUP BY region
      ORDER BY observation_count DESC
    `);

    console.table(regions.rows);

    // Search for Niete specifically
    console.log('\n🔍 Searching for "Niete" region...');
    const nieteSearch = await dbClient.query(`
      SELECT COUNT(*) as count FROM observations
      WHERE region ILIKE '%niete%'
    `);

    console.log(`Found: ${nieteSearch.rows[0].count} observations in "Niete" region`);

    if (nieteSearch.rows[0].count > 0) {
      console.log('\n📚 Sample observations from Niete region:');
      const nieteObs = await dbClient.query(`
        SELECT id, teacher_id, subject, grade, created_at
        FROM observations
        WHERE region ILIKE '%niete%'
        LIMIT 5
      `);
      console.table(nieteObs.rows);
    }

    await dbClient.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkRegions();
