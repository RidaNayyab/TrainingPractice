import dotenv from 'dotenv';
import pkg from 'pg';
const { Client } = pkg;

dotenv.config({ path: '.env.local' });

const client = new Client({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

await client.connect();

const result = await client.query(`
  SELECT o.id, o.teacher_id, o.created_at, ofl.feedback_english
  FROM observations o
  LEFT JOIN observation_feedback_loops ofl ON o.id = ofl.observation_id
  WHERE o.teacher_id = '12711'
  ORDER BY o.created_at DESC
  LIMIT 5
`);

console.log('📊 Latest 5 observations for Teacher 12711:');
result.rows.forEach((row, i) => {
  console.log(`\n${i+1}. Created: ${row.created_at}`);
  console.log(`   ID: ${row.id}`);
  console.log(`   Feedback: ${row.feedback_english?.substring(0, 80) || 'No feedback'}...`);
});

const totalResult = await client.query(`
  SELECT COUNT(*) as total_observations
  FROM observations
`);

console.log(`\n✅ Total observations in database: ${totalResult.rows[0].total_observations}`);

await client.end();
