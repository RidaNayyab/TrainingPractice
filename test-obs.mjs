import pg from 'pg';

const dbClient = new pg.Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/railway'
});

await dbClient.connect();

// Test with teacher 12711
const result = await dbClient.query(
  `SELECT o.id, o.teacher_id, o.transcription, o.created_at,
    ofl.feedback_english, ofl.improvement_areas
   FROM observations o
   LEFT JOIN observation_feedback_loops ofl ON o.id = ofl.observation_id
   WHERE o.teacher_id = $1
   ORDER BY o.created_at DESC`,
  ['12711']
);

console.log('Observations for teacher 12711:', result.rows.length);
console.log('First observation:', result.rows[0]);

await dbClient.end();
