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
    console.log('Connected to database\n');

    // Get all observations
    const result = await client.query(`
      SELECT id, teacher_id, created_at, results_json,
        (SELECT improvement_areas FROM observation_feedback_loops WHERE observation_id = o.id LIMIT 1) as improvement_areas
      FROM observations o
      ORDER BY teacher_id, created_at DESC
    `);

    console.log(`Found ${result.rows.length} total observations\n`);

    const flaggedMap = {};

    result.rows.forEach(obs => {
      let flaggedIndicators = new Set();

      // Check improvement_areas
      if (obs.improvement_areas) {
        let areas = obs.improvement_areas;
        if (typeof areas === 'string') {
          try { areas = JSON.parse(areas); } catch (e) { }
        }
        if (Array.isArray(areas)) {
          areas.forEach(a => {
            if (a.score === 'NO' && a.indicator_code) {
              flaggedIndicators.add(a.indicator_code);
            }
          });
        }
      }

      // Check results_json
      if (obs.results_json && typeof obs.results_json === 'object') {
        const r = obs.results_json;
        if (r.section_b) {
          Object.entries(r.section_b).forEach(([k, v]) => {
            if (v === 'NO') flaggedIndicators.add(k);
          });
        }
        if (r.section_c) {
          Object.entries(r.section_c).forEach(([k, v]) => {
            if (v === 'NO') flaggedIndicators.add(k);
          });
        }
      }

      const key = `${obs.teacher_id}`;
      if (!flaggedMap[key]) flaggedMap[key] = {};

      flaggedIndicators.forEach(ind => {
        if (!flaggedMap[key][ind]) flaggedMap[key][ind] = 0;
        flaggedMap[key][ind]++;
      });
    });

    console.log('Teachers with Flagged Indicators (2+ times):');
    const sortedTeachers = Object.entries(flaggedMap).sort();
    
    let totalWithFlags = 0;
    sortedTeachers.forEach(([teacherId, indicators]) => {
      const flagged = Object.entries(indicators).filter(([_, count]) => count >= 2);
      if (flagged.length > 0) {
        totalWithFlags++;
        console.log(`\nTeacher ${teacherId}:`);
        flagged.forEach(([ind, count]) => {
          console.log(`  ${ind}: ${count} times`);
        });
      }
    });

    console.log(`\n\nSummary: ${totalWithFlags} teachers have indicators flagged 2+ times`);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
