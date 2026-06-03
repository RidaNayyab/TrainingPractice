import { Client } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const dbClient = new Client({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

async function fetchTeacherData() {
  try {
    await dbClient.connect();
    console.log('✅ Connected to Railway database\n');

    const teacherId = '11450';

    // Get observations
    const observations = await dbClient.query(`
      SELECT
        id, teacher_id, subject, grade, region, rubric_type,
        status, created_at, transcription,
        results_json
      FROM observations
      WHERE teacher_id = $1
      ORDER BY created_at DESC
    `, [teacherId]);

    console.log(`📚 TEACHER: ${teacherId}`);
    console.log(`✨ Total observations: ${observations.rows.length}\n`);

    if (observations.rows.length > 0) {
      console.log('📋 Observations:');
      observations.rows.forEach((obs, i) => {
        console.log(`\n${i + 1}. ID: ${obs.id}`);
        console.log(`   Subject: ${obs.subject}, Grade: ${obs.grade}`);
        console.log(`   Region: ${obs.region}, Rubric: ${obs.rubric_type}`);
        console.log(`   Status: ${obs.status}`);
        console.log(`   Created: ${obs.created_at}`);
      });

      // Get feedback for these observations
      const feedback = await dbClient.query(`
        SELECT
          id, observation_id, teacher_id,
          feedback_english, improvement_areas, created_at
        FROM observation_feedback_loops
        WHERE teacher_id = $1
        ORDER BY created_at DESC
      `, [teacherId]);

      console.log(`\n\n💬 FEEDBACK LOOPS: ${feedback.rows.length}`);
      if (feedback.rows.length > 0) {
        feedback.rows.slice(0, 3).forEach((fb, i) => {
          console.log(`\n${i + 1}. Observation: ${fb.observation_id}`);
          console.log(`   ${fb.feedback_english.substring(0, 150)}...`);
        });
      }

      // Get flagged indicators
      const flags = await dbClient.query(`
        SELECT
          id, indicator_code, subject, grade, region, rubric_type,
          flag_count, escalation_level, last_flagged_at
        FROM teacher_indicator_flags
        WHERE teacher_id = $1
        ORDER BY escalation_level DESC
      `, [teacherId]);

      console.log(`\n\n🚩 FLAGGED INDICATORS: ${flags.rows.length}`);
      if (flags.rows.length > 0) {
        console.log('\nFlagged indicators:');
        flags.rows.forEach(flag => {
          console.log(`  - ${flag.indicator_code}: Flags=${flag.flag_count}, Escalation=${flag.escalation_level}`);
        });
      }

      // Export complete data
      const exportData = {
        teacher_id: teacherId,
        summary: {
          total_observations: observations.rows.length,
          total_feedback: feedback.rows.length,
          total_flagged_indicators: flags.rows.length
        },
        observations: observations.rows,
        feedback_loops: feedback.rows,
        flagged_indicators: flags.rows,
        export_timestamp: new Date().toISOString()
      };

      const fileName = `teacher-${teacherId}-complete-data.json`;
      fs.writeFileSync(fileName, JSON.stringify(exportData, null, 2));
      console.log(`\n\n✅ Complete data exported to: ${fileName}`);
    } else {
      console.log('❌ No observations found for this teacher');
    }

    await dbClient.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fetchTeacherData();
