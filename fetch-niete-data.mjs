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

async function fetchNieteData() {
  try {
    await dbClient.connect();
    console.log('✅ Connected to database\n');

    // First, let's see all unique teachers to find "Niete"
    console.log('🔍 Searching for teachers with "Niete" in name...\n');

    const teacherSearch = await dbClient.query(`
      SELECT DISTINCT teacher_id, teacher_name
      FROM observations
      WHERE teacher_name ILIKE '%niete%' OR teacher_id LIKE '%niete%'
      LIMIT 10
    `);

    if (teacherSearch.rows.length === 0) {
      console.log('❌ No teachers found with "Niete" in the name.');
      console.log('\n📊 Let me check all unique teacher names:');
      const allTeachers = await dbClient.query(`
        SELECT DISTINCT teacher_name, COUNT(*) as observation_count
        FROM observations
        GROUP BY teacher_name
        ORDER BY observation_count DESC
        LIMIT 20
      `);
      console.table(allTeachers.rows);
      await dbClient.end();
      return;
    }

    console.log('Found teachers:');
    console.table(teacherSearch.rows);

    // For each matching teacher, fetch all observations
    for (const teacher of teacherSearch.rows) {
      console.log(`\n📚 Fetching observations for teacher: ${teacher.teacher_name} (ID: ${teacher.teacher_id})\n`);

      const observations = await dbClient.query(`
        SELECT
          id,
          teacher_id,
          teacher_name,
          subject,
          grade,
          region,
          rubric_type,
          created_at,
          transcription,
          results_json
        FROM observations
        WHERE teacher_id = $1 OR teacher_name ILIKE $2
        ORDER BY created_at DESC
      `, [teacher.teacher_id, `%${teacher.teacher_name}%`]);

      console.log(`✨ Total observations: ${observations.rows.length}`);

      if (observations.rows.length > 0) {
        console.log('\n📋 First 5 observations:');
        observations.rows.slice(0, 5).forEach((obs, i) => {
          console.log(`\n${i + 1}. Observation ID: ${obs.id}`);
          console.log(`   Teacher: ${obs.teacher_name} (${obs.teacher_id})`);
          console.log(`   Subject: ${obs.subject}, Grade: ${obs.grade}`);
          console.log(`   Region: ${obs.region}, Type: ${obs.rubric_type}`);
          console.log(`   Date: ${obs.created_at}`);
          if (obs.transcription) {
            console.log(`   Transcription: ${obs.transcription.substring(0, 100)}...`);
          }
        });

        // Get feedback for these observations
        console.log('\n\n💬 Fetching feedback for these observations...\n');
        const feedback = await dbClient.query(`
          SELECT
            ofl.id,
            ofl.observation_id,
            ofl.feedback_english,
            ofl.improvement_areas,
            ofl.created_at
          FROM observation_feedback_loops ofl
          WHERE ofl.observation_id IN (
            SELECT id FROM observations
            WHERE teacher_id = $1 OR teacher_name ILIKE $2
          )
          ORDER BY ofl.created_at DESC
          LIMIT 10
        `, [teacher.teacher_id, `%${teacher.teacher_name}%`]);

        console.log(`✨ Total feedback records: ${feedback.rows.length}`);
        if (feedback.rows.length > 0) {
          console.log('\n📝 Sample feedback:');
          feedback.rows.slice(0, 3).forEach((fb, i) => {
            console.log(`\n${i + 1}. Feedback for Observation ${fb.observation_id}`);
            console.log(`   ${fb.feedback_english.substring(0, 150)}...`);
          });
        }
      }
    }

    await dbClient.end();
    console.log('\n✅ Data fetch complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fetchNieteData();
