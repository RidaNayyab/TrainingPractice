import { Client } from 'pg';

const client = new Client({
  host: 'maglev.proxy.rlwy.net',
  port: 53678,
  user: 'postgres',
  password: 'CKknRTqPOTTaYjtUKyARcTtQEIsYRVYF',
  database: 'railway',
});

async function findFlaggedTeachers() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Find all teachers with escalation_level >= 3
    console.log('🔍 Finding teachers with 3+ flags on any indicator...\n');
    const result = await client.query(`
      SELECT
        teacher_id,
        indicator_code,
        subject,
        grade,
        region,
        rubric_type,
        flag_count,
        escalation_level,
        last_flagged_at,
        last_strong_at
      FROM teacher_indicator_flags
      WHERE flag_count >= 3
      ORDER BY flag_count DESC, last_flagged_at DESC
      LIMIT 20;
    `);

    if (result.rows.length === 0) {
      console.log('❌ No teachers found with 3+ flags');
      await client.end();
      return;
    }

    console.log(`📊 Found ${result.rows.length} records of flagged indicators\n`);

    // Group by teacher_id
    const teacherMap = {};
    result.rows.forEach(row => {
      if (!teacherMap[row.teacher_id]) {
        teacherMap[row.teacher_id] = [];
      }
      teacherMap[row.teacher_id].push(row);
    });

    console.log('👨‍🏫 Teachers with 3+ flagged indicators:\n');
    console.log('═'.repeat(100));

    Object.entries(teacherMap).forEach(([teacherId, indicators]) => {
      console.log(`\nTeacher ID: ${teacherId}`);
      console.log(`Region: ${indicators[0].region} | Subject: ${indicators[0].subject} | Grade: ${indicators[0].grade || 'N/A'}`);
      console.log(`Rubric Type: ${indicators[0].rubric_type}`);
      console.log('\nFlagged Indicators:');

      indicators.forEach(ind => {
        console.log(
          `  • ${ind.indicator_code}: Flag Count=${ind.flag_count}, Escalation Level=${ind.escalation_level}, Last Flagged=${new Date(ind.last_flagged_at).toLocaleDateString()}`
        );
      });
    });

    console.log('\n' + '═'.repeat(100));
    console.log('\n✅ Recommended teacher for testing:');
    const firstTeacher = result.rows[0];
    console.log(`\n   Teacher ID: ${firstTeacher.teacher_id}`);
    console.log(`   Indicator: ${firstTeacher.indicator_code}`);
    console.log(`   Flags: ${firstTeacher.flag_count}`);
    console.log(`   Subject: ${firstTeacher.subject}`);
    console.log(`   Region: ${firstTeacher.region}`);

    console.log('\n📝 Use this teacher ID in the test page to see real feedback!');

    await client.end();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

findFlaggedTeachers();
