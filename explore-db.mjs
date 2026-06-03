import { Client } from 'pg';

const client = new Client({
  host: 'maglev.proxy.rlwy.net',
  port: 53678,
  user: 'postgres',
  password: 'CKknRTqPOTTaYjtUKyARcTtQEIsYRVYF',
  database: 'railway',
});

async function exploreTables() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('📊 Tables in database:\n');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Get schema for each table
    console.log('\n\n📋 Detailed Schema:\n');

    for (const tableRow of tablesResult.rows) {
      const tableName = tableRow.table_name;
      const schemaResult = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);

      console.log(`\n${tableName}:`);
      schemaResult.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)';
        console.log(`  - ${col.column_name}: ${col.data_type} ${nullable}`);
      });

      // Get a sample row count
      const countResult = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
      console.log(`  [${countResult.rows[0].count} rows]\n`);
    }

    await client.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

exploreTables();
