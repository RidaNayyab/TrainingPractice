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

async function searchAllTables() {
  try {
    await dbClient.connect();
    console.log('✅ Connected to Railway database\n');

    // Search for "niete" in observations
    console.log('🔍 Searching observations table for "niete"...');
    const obsResults = await dbClient.query(`
      SELECT COUNT(*) as count FROM observations
      WHERE teacher_id::TEXT ILIKE '%niete%'
    `);
    console.log(`  Found: ${obsResults.rows[0].count} observations\n`);

    // Search in teacher_indicator_flags
    console.log('🔍 Searching teacher_indicator_flags for "niete"...');
    const flagResults = await dbClient.query(`
      SELECT COUNT(*) as count FROM teacher_indicator_flags
      WHERE teacher_id ILIKE '%niete%'
    `);
    console.log(`  Found: ${flagResults.rows[0].count} flagged indicators\n`);

    // Search in indicator_flag_history
    console.log('🔍 Searching indicator_flag_history_dc for "niete"...');
    const historyResults = await dbClient.query(`
      SELECT COUNT(*) as count FROM indicator_flag_history_dc
      WHERE teacher_id ILIKE '%niete%'
    `);
    console.log(`  Found: ${historyResults.rows[0].count} history records\n`);

    // Search in observation_feedback_loops
    console.log('🔍 Searching observation_feedback_loops for "niete"...');
    const feedbackResults = await dbClient.query(`
      SELECT COUNT(*) as count FROM observation_feedback_loops
      WHERE teacher_id ILIKE '%niete%'
    `);
    console.log(`  Found: ${feedbackResults.rows[0].count} feedback records\n`);

    // Now let's search for any teacher ID containing "1145"
    console.log('🔍 Searching for teacher containing "1145"...');
    const numResults = await dbClient.query(`
      SELECT DISTINCT teacher_id FROM observations
      WHERE teacher_id::TEXT LIKE '%1145%'
    `);
    console.log(`  Found: ${numResults.rows.length}`);
    if (numResults.rows.length > 0) {
      numResults.rows.forEach(r => console.log(`    - ${r.teacher_id}`));
    }
    console.log();

    // Get all unique teacher_ids from teacher_indicator_flags (might be more comprehensive)
    console.log('📊 Getting teacher counts from teacher_indicator_flags...');
    const flagTeachers = await dbClient.query(`
      SELECT teacher_id, COUNT(*) as flag_count
      FROM teacher_indicator_flags
      GROUP BY teacher_id
      ORDER BY flag_count DESC
      LIMIT 20
    `);

    console.log('\nTop 20 teachers by flagged indicators:');
    console.table(flagTeachers.rows);

    // Total counts
    console.log('\n📈 DATABASE SUMMARY:');
    const summary = await dbClient.query(`
      SELECT
        (SELECT COUNT(*) FROM observations) as total_observations,
        (SELECT COUNT(*) FROM teacher_indicator_flags) as total_flags,
        (SELECT COUNT(*) FROM observation_feedback_loops) as total_feedback,
        (SELECT COUNT(DISTINCT teacher_id) FROM observations) as unique_teachers_obs,
        (SELECT COUNT(DISTINCT teacher_id) FROM teacher_indicator_flags) as unique_teachers_flags
    `);

    const row = summary.rows[0];
    console.log(`  Total observations: ${row.total_observations}`);
    console.log(`  Total flagged indicators: ${row.total_flags}`);
    console.log(`  Total feedback records: ${row.total_feedback}`);
    console.log(`  Unique teachers (observations): ${row.unique_teachers_obs}`);
    console.log(`  Unique teachers (flags): ${row.unique_teachers_flags}`);

    await dbClient.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

searchAllTables();
