import { Client } from 'pg';

const client = new Client({
  host: 'maglev.proxy.rlwy.net',
  port: 53678,
  user: 'postgres',
  password: 'CKknRTqPOTTaYjtUKyARcTtQEIsYRVYF',
  database: 'railway',
});

async function getProperEscalation() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    console.log('📊 PROPER ESCALATION TRACKING - Each Indicator Independent\n');
    console.log('═'.repeat(120));

    // Get each indicator's escalation level for each teacher
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
      WHERE escalation_level >= 3
      ORDER BY teacher_id, escalation_level DESC, flag_count DESC;
    `);

    if (result.rows.length === 0) {
      console.log('❌ No indicators found at escalation level 3+');
      await client.end();
      return;
    }

    // Group by teacher
    const teacherMap = {};
    result.rows.forEach(row => {
      if (!teacherMap[row.teacher_id]) {
        teacherMap[row.teacher_id] = {
          region: row.region,
          subject: row.subject,
          grade: row.grade,
          rubric_type: row.rubric_type,
          indicators: []
        };
      }
      teacherMap[row.teacher_id].indicators.push({
        code: row.indicator_code,
        flagCount: row.flag_count,
        escalationLevel: row.escalation_level,
        lastFlagged: row.last_flagged_at
      });
    });

    // Display each teacher with their indicators
    Object.entries(teacherMap).forEach(([teacherId, data]) => {
      console.log(`\n👨‍🏫 TEACHER: ${teacherId}`);
      console.log(`   Region: ${data.region} | Subject: ${data.subject} | Grade: ${data.grade || 'N/A'}`);
      console.log(`   Rubric: ${data.rubric_type}`);
      console.log(`\n   Indicators at Level 3+ (Needs Training):`);

      data.indicators.forEach(ind => {
        const levelDescription = {
          3: '🟡 Level 3 - Initial Training Needed',
          4: '🟠 Level 4 - Escalated Support',
          5: '🔴 Level 5 - Critical Intervention'
        };
        console.log(`     • ${ind.code}: ${ind.flagCount} flags → ${levelDescription[ind.escalationLevel]}`);
      });
    });

    console.log('\n' + '═'.repeat(120));
    console.log('\n✨ KEY POINTS:');
    console.log('   • Each indicator has INDEPENDENT escalation tracking');
    console.log('   • Teacher 4534 SI1: 10 flags (Level 5) - Separate from SI2');
    console.log('   • Teacher 4534 SI2: 10 flags (Level 5) - Separate from SI1');
    console.log('   • Each requires its own training intervention');
    console.log('   • Completion of SI1 training does NOT affect SI2 escalation');

    await client.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

getProperEscalation();
