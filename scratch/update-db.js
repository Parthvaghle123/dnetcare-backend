const { Client } = require('pg');

const run = async () => {
  const client = new Client({
    connectionString: "postgresql://postgres.xohkfxvvullwvnhskigr:%27%23UW4Fw6%27Ba*%2Bjq@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to database.");

    // Alter table doctor_leaves
    await client.query(`
      ALTER TABLE doctor_leaves 
      ADD COLUMN IF NOT EXISTS start_date DATE,
      ADD COLUMN IF NOT EXISTS end_date DATE,
      ADD COLUMN IF NOT EXISTS total_days FLOAT;
    `);
    
    // Copy leave_date data to start_date and end_date if needed before dropping
    await client.query(`
      UPDATE doctor_leaves SET start_date = leave_date, end_date = leave_date, total_days = 1 WHERE start_date IS NULL;
    `);

    // Now drop leave_date and enforce NOT NULL constraints
    await client.query(`
      ALTER TABLE doctor_leaves 
      DROP COLUMN IF EXISTS leave_date,
      ALTER COLUMN start_date SET NOT NULL,
      ALTER COLUMN end_date SET NOT NULL,
      ALTER COLUMN total_days SET NOT NULL;
    `);

    console.log("Table 'doctor_leaves' updated successfully.");
  } catch (error) {
    console.error("Error updating database:", error);
  } finally {
    await client.end();
  }
};

run();
