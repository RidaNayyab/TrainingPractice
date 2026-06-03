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

async function checkAllRegions() {
  try {
    await dbClient.connect();
    console.log('✅ Connected to Railway database\n');

    // Check all tables for regions and Niete
    const tables = [
      'observations',
      'teacher_indicator_flags',
      'indicator_flag_history_dc',
      'teacher_tier_progression',
      'indicator_flag_audit'
    ];

    for (const table of tables) {
      console.log(`\n📊 ${table}:`);
      
      const regions = await dbClient.query(`
        SELECT DISTINCT region, COUNT(*) as count
        FROM ${table}
        GROUP BY region
        ORDER BY count DESC
      `);

      if (regions.rows.length > 0) {
        console.table(regions.rows);
      } else {
        console.log('  No region column or data');
      }

      // Check for Niete
      const nieteCount = await dbClient.query(`
        SELECT COUNT(*) as count FROM ${table}
        WHERE region ILIKE '%niete%'
      `);

      if (nieteCount.rows[0].count > 0) {
        console.log(`  ✨ Found ${nieteCount.rows[0].count} records with "Niete" region!`);
      }
    }

    await dbClient.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAllRegions();
