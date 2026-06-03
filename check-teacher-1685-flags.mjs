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

    const result = await client.query(`
      SELECT id, teacher_id, created_at, results_json,
        (SELECT improvement_areas FROM observation_feedback_loops WHERE observation_id = o.id LIMIT 1) as improvement_areas
      FROM observations o
      WHERE teacher_id = '1685'
      ORDER BY created_at DESC
    `);

    console.log(`Found ${result.rows.length} observations for teacher 1685\n`);

    const flaggedMap = {};

    result.rows.forEach(obs => {
      let flaggedIndicators = new Set();

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

      flaggedIndicators.forEach(ind => {
        if (!flaggedMap[ind]) flaggedMap[ind] = 0;
        flaggedMap[ind]++;
      });
    });

    console.log('Flagged indicators for teacher 1685:');
    Object.entries(flaggedMap).forEach(([ind, count]) => {
      console.log(`  ${ind}: ${count} times`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
