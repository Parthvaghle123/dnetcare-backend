const { Client } = require('pg');

const run = async () => {
  const client = new Client({
    connectionString: "postgresql://postgres.xohkfxvvullwvnhskigr:%27%23UW4Fw6%27Ba*%2Bjq@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Check what columns are missing or if we just need to add start_date, end_date and total_days
    const result = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='doctor_leaves';
    `);
    console.log(result.rows.map(r => r.column_name).join(', '));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.end();
  }
};

run();
