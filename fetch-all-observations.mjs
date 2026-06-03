import { Client } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const dbClient = new Client({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

async function fetchAllObservations() {
  try {
    await dbClient.connect();
    console.log('✅ Connected to Railway database\n');

    // Get total count first
    const countResult = await dbClient.query(`SELECT COUNT(*) as count FROM observations`);
    const totalCount = parseInt(countResult.rows[0].count);

    console.log(`📊 Total observations in Railway database: ${totalCount}\n`);

    // Fetch all observations
    console.log('📥 Fetching all observations...');
    const observations = await dbClient.query(`
      SELECT * FROM observations
      ORDER BY created_at DESC
    `);

    console.log(`✅ Retrieved ${observations.rows.length} observations\n`);

    // Get basic stats
    const stats = await dbClient.query(`
      SELECT
        COUNT(*) as total_obs,
        COUNT(DISTINCT teacher_id) as unique_teachers,
        COUNT(DISTINCT region) as unique_regions,
        COUNT(DISTINCT subject) as unique_subjects,
        COUNT(DISTINCT grade) as unique_grades,
        COUNT(DISTINCT status) as unique_statuses,
        status, COUNT(*) as status_count
      FROM observations
      GROUP BY status
    `);

    console.log('📈 Observation Statistics:');
    let totalByStatus = 0;
    stats.rows.forEach(row => {
      if (row.status) {
        console.log(`  ${row.status}: ${row.status_count}`);
        totalByStatus += parseInt(row.status_count);
      }
    });

    // Get sample data structure
    if (observations.rows.length > 0) {
      console.log('\n📋 Sample observation (first row):');
      const sample = observations.rows[0];
      console.log(JSON.stringify(sample, null, 2).substring(0, 500) + '...\n');
    }

    // Export to file
    const exportData = {
      metadata: {
        total_observations: observations.rows.length,
        export_timestamp: new Date().toISOString(),
        database: 'Railway',
        host: process.env.PGHOST
      },
      observations: observations.rows
    };

    const fileName = `railway-all-observations-${observations.rows.length}.json`;
    fs.writeFileSync(fileName, JSON.stringify(exportData, null, 2));
    console.log(`✅ Exported ${observations.rows.length} observations to: ${fileName}`);

    // Also create a CSV for easier analysis
    if (observations.rows.length > 0) {
      const csvHeaders = Object.keys(observations.rows[0]).join(',');
      const csvRows = observations.rows.map(row => {
        return Object.values(row).map(v => {
          // Escape quotes and handle special characters
          if (v === null || v === undefined) return '';
          const str = String(v);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',');
      });

      const csv = [csvHeaders, ...csvRows].join('\n');
      const csvFileName = `railway-observations-${observations.rows.length}.csv`;
      fs.writeFileSync(csvFileName, csv);
      console.log(`✅ Also exported to CSV: ${csvFileName}`);
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total observations fetched: ${observations.rows.length}`);
    console.log(`\nBreakdown by status:`);
    const statusBreakdown = {};
    observations.rows.forEach(obs => {
      statusBreakdown[obs.status] = (statusBreakdown[obs.status] || 0) + 1;
    });
    Object.entries(statusBreakdown).forEach(([status, count]) => {
      console.log(`  ${status || 'null'}: ${count}`);
    });

    console.log(`\nBreakdown by region:`);
    const regionBreakdown = {};
    observations.rows.forEach(obs => {
      regionBreakdown[obs.region] = (regionBreakdown[obs.region] || 0) + 1;
    });
    Object.entries(regionBreakdown).sort((a, b) => b[1] - a[1]).forEach(([region, count]) => {
      console.log(`  ${region}: ${count}`);
    });

    console.log(`\nTop teachers by observation count:`);
    const teacherCounts = {};
    observations.rows.forEach(obs => {
      teacherCounts[obs.teacher_id] = (teacherCounts[obs.teacher_id] || 0) + 1;
    });
    Object.entries(teacherCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([teacherId, count]) => {
        console.log(`  ${teacherId}: ${count}`);
      });

    await dbClient.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fetchAllObservations();
