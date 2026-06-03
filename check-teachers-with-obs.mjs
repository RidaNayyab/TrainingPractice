import pg from 'pg';

const dbClient = new pg.Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/railway'
});

await dbClient.connect();

// Get distinct teachers with observations, count their observations
const result = await dbClient.query(
  `SELECT teacher_id, COUNT(*) as obs_count 
   FROM observations 
   GROUP BY teacher_id 
   ORDER BY teacher_id ASC`
);

console.log(`Total teachers with observations: ${result.rows.length}`);
console.log('\nTeachers with observation counts:');
const teachers = result.rows.map(row => row.teacher_id);
console.log(JSON.stringify(teachers));

await dbClient.end();
