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
  SELECT COUNT(DISTINCT teacher_id) as count
  FROM observations
`);

const teachersResult = await client.query(`
  SELECT DISTINCT teacher_id 
  FROM observations 
  ORDER BY teacher_id
`);

console.log(`Total unique teachers: ${result.rows[0].count}`);
console.log(`First 30 teachers:`);
console.log(teachersResult.rows.slice(0, 30).map(r => r.teacher_id));

await client.end();
