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

async function fetchNieteData() {
  try {
    await dbClient.connect();
    console.log('✅ Connected to database\n');

    // Search for teachers with "Niete" in their ID
    console.log('🔍 Searching for teachers with "Niete"...\n');

    const teacherSearch = await dbClient.query(`
      SELECT DISTINCT teacher_id, COUNT(*) as observation_count
      FROM observations
      WHERE teacher_id ILIKE '%niete%'
      GROUP BY teacher_id
      ORDER BY observation_count DESC
    `);

    if (teacherSearch.rows.length === 0) {
      console.log('❌ No teachers found with "Niete" in the ID.');
      console.log('\n📊 Listing all unique teacher IDs and their observation counts:');
      const allTeachers = await dbClient.query(`
        SELECT DISTINCT teacher_id, COUNT(*) as observation_count
        FROM observations
        GROUP BY teacher_id
        ORDER BY observation_count DESC
      `);
      console.log(`Total unique teachers: ${allTeachers.rows.length}\n`);
      console.table(allTeachers.rows);
      await dbClient.end();
      return;
    }

    console.log('Found teachers with "Niete":');
    console.table(teacherSearch.rows);

    // For each matching teacher, fetch all observations
    for (const teacher of teacherSearch.rows) {
      console.log(`\n\n${'='.repeat(80)}`);
      console.log(`📚 TEACHER: ${teacher.teacher_id}`);
      console.log(`📊 Total observations: ${teacher.observation_count}`);
      console.log('='.repeat(80));

      // Fetch all observations
      const observations = await dbClient.query(`
        SELECT
          id,
          teacher_id,
          subject,
          grade,
          region,
          rubric_type,
          status,
          created_at
        FROM observations
        WHERE teacher_id ILIKE $1
        ORDER BY created_at DESC
      `, [`%${teacher.teacher_id}%`]);

      console.log(`\n✨ Retrieved ${observations.rows.length} observations\n`);

      // Group by status
      const statusGroups = {};
      observations.rows.forEach(obs => {
        if (!statusGroups[obs.status]) statusGroups[obs.status] = [];
        statusGroups[obs.status].push(obs);
      });

      console.log('📊 Status breakdown:');
      Object.entries(statusGroups).forEach(([status, obs]) => {
        console.log(`  ${status}: ${obs.length}`);
      });

      // Get feedback loops
      const feedbackCount = await dbClient.query(`
        SELECT COUNT(*) as count
        FROM observation_feedback_loops
        WHERE teacher_id ILIKE $1
      `, [`%${teacher.teacher_id}%`]);

      console.log(`\n💬 Feedback loops: ${feedbackCount.rows[0].count}`);

      // Get flagged indicators
      const flaggedCount = await dbClient.query(`
        SELECT COUNT(*) as count
        FROM teacher_indicator_flags
        WHERE teacher_id ILIKE $1
      `, [`%${teacher.teacher_id}%`]);

      console.log(`🚩 Flagged indicators: ${flaggedCount.rows[0].count}`);

      // Sample observations
      console.log(`\n\n📋 First 5 observations:`);
      observations.rows.slice(0, 5).forEach((obs, i) => {
        console.log(`\n${i + 1}. ID: ${obs.id}`);
        console.log(`   Subject: ${obs.subject}, Grade: ${obs.grade}`);
        console.log(`   Region: ${obs.region}, Rubric: ${obs.rubric_type}`);
        console.log(`   Status: ${obs.status}`);
        console.log(`   Created: ${obs.created_at}`);
      });

      // Export to JSON
      const exportData = {
        teacher_id: teacher.teacher_id,
        total_observations: teacher.observation_count,
        observations: observations.rows,
        export_timestamp: new Date().toISOString()
      };

      const fileName = `niete-${teacher.teacher_id}-observations.json`;
      fs.writeFileSync(fileName, JSON.stringify(exportData, null, 2));
      console.log(`\n\n✅ Data exported to: ${fileName}`);
    }

    await dbClient.end();
    console.log('\n✅ Data fetch complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fetchNieteData();
