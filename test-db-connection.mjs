import { Client } from 'pg';

const client = new Client({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

try {
  console.log('Connecting to database...');
  console.log('Host:', process.env.PGHOST);
  console.log('Port:', process.env.PGPORT);
  console.log('User:', process.env.PGUSER);
  
  await client.connect();
  console.log('✅ Connected!');
  
  const result = await client.query('SELECT COUNT(*) as count FROM observations');
  console.log('Total observations:', result.rows[0].count);
  
  await client.end();
} catch (err) {
  console.error('❌ Connection failed:', err.message);
}
