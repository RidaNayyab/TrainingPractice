import { Client } from 'pg';

const client = new Client({
  host: 'maglev.proxy.rlwy.net',
  port: 53678,
  user: 'postgres',
  password: 'CKknRTqPOTTaYjtUKyARcTtQEIsYRVYF',
  database: 'railway',
});

async function getSampleData() {
  try {
    await client.connect();
    console.log('✅ Connected\n');

    // Get sample observation with results
    console.log('📊 Sample Observation:\n');
    const obsResult = await client.query(`
      SELECT
        id, teacher_id, region, rubric_type, subject, grade,
        results_json, created_at
      FROM observations
      LIMIT 1;
    `);
    if (obsResult.rows[0]) {
      console.log(JSON.stringify(obsResult.rows[0], null, 2));
    }

    // Get indicator codes in use
    console.log('\n\n🏷️  Indicator Codes in Use:\n');
    const indicatorResult = await client.query(`
      SELECT DISTINCT indicator_code, rubric_type, region
      FROM teacher_indicator_flags
      LIMIT 20;
    `);
    indicatorResult.rows.forEach(row => {
      console.log(`  - ${row.indicator_code} (Rubric: ${row.rubric_type}, Region: ${row.region})`);
    });

    // Get teacher with flags
    console.log('\n\n👨‍🏫 Sample Teacher with Flags:\n');
    const teacherResult = await client.query(`
      SELECT
        teacher_id, indicator_code, subject, grade, region,
        flag_count, consecutive_strong, escalation_level,
        last_flagged_at, last_strong_at
      FROM teacher_indicator_flags
      WHERE flag_count >= 3
      LIMIT 3;
    `);
    if (teacherResult.rows.length > 0) {
      console.log(JSON.stringify(teacherResult.rows, null, 2));
    }

    // Get feedback example
    console.log('\n\n💬 Sample Feedback Loop:\n');
    const feedbackResult = await client.query(`
      SELECT
        id, teacher_id, observation_id,
        feedback_english, improvement_areas
      FROM observation_feedback_loops
      LIMIT 1;
    `);
    if (feedbackResult.rows[0]) {
      console.log(JSON.stringify(feedbackResult.rows[0], null, 2));
    }

    await client.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

getSampleData();
