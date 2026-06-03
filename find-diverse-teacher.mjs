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

    // Read the priority matrix to get indicator-tier mapping
    const tiersAllowed = {
      'structural': ['SI1', 'SI2', 'SI3'],
      'core': ['SI1', 'SI2', 'SI3', 'PIC-1', 'PIC-3', 'PIC-4', 'PIC-2', 'PIC-5'],
      'advanced': ['SI1', 'SI2', 'SI3', 'PIC-1', 'PIC-3', 'PIC-4', 'PIC-2', 'PIC-5', 'PIA-3', 'PIA-4', 'PIA-1', 'MA-0', 'PIA-2', 'PIA-5']
    };

    // Get all observations with tier data
    const result = await client.query(`
      SELECT o.teacher_id, ttp.current_tier, o.results_json,
        (SELECT improvement_areas FROM observation_feedback_loops WHERE observation_id = o.id LIMIT 1) as improvement_areas
      FROM observations o
      JOIN teacher_tier_progression ttp ON o.teacher_id = ttp.teacher_id
      ORDER BY o.teacher_id
    `);

    const flagCounts = {};

    result.rows.forEach(row => {
      const key = `${row.teacher_id}`;
      if (!flagCounts[key]) {
        flagCounts[key] = { tier: row.current_tier, flags: {} };
      }

      let flaggedIndicators = new Set();

      if (row.improvement_areas) {
        let areas = row.improvement_areas;
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

      if (row.results_json && typeof row.results_json === 'object') {
        const r = row.results_json;
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
        if (!flagCounts[key].flags[ind]) flagCounts[key].flags[ind] = 0;
        flagCounts[key].flags[ind]++;
      });
    });

    // Find teachers with diverse indicators in their tier
    const candidates = [];
    Object.entries(flagCounts).forEach(([teacherId, data]) => {
      const allowedInds = tiersAllowed[data.tier];
      const matchingFlags = Object.entries(data.flags)
        .filter(([ind, count]) => count >= 2 && allowedInds.includes(ind));

      if (matchingFlags.length > 1) { // Multiple different indicators with 2+ flags
        candidates.push({
          teacherId,
          tier: data.tier,
          indicators: matchingFlags.map(([ind, count]) => `${ind}(${count})`).join(', ')
        });
      }
    });

    console.log('Teachers with multiple different indicators (2+ flags each) in unlocked tier:\n');
    candidates.slice(0, 20).forEach(c => {
      console.log(`  Teacher ${c.teacherId} (${c.tier}): ${c.indicators}`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
