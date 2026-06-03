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

async function checkSchema() {
  try {
    await dbClient.connect();
    console.log('✅ Connected to database\n');

    // Get all table names
    const tables = await dbClient.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('📊 Available tables:');
    tables.rows.forEach(row => console.log(`  - ${row.table_name}`));

    // Get schema for each table
    for (const table of tables.rows) {
      const schema = await dbClient.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [table.table_name]);

      console.log(`\n📋 ${table.table_name}:`);
      schema.rows.forEach(col => console.log(`  - ${col.column_name} (${col.data_type})`));

      // Get row count
      const count = await dbClient.query(`SELECT COUNT(*) as count FROM ${table.table_name}`);
      console.log(`  ➜ Row count: ${count.rows[0].count}`);
    }

    await dbClient.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSchema();
