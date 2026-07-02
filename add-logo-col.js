const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.xohkfxvvullwvnhskigr:%27%23UW4Fw6%27Ba*%2Bjq@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  try {
    await client.query('ALTER TABLE "branches" ADD COLUMN "logo_url" VARCHAR(255);');
    console.log("Column logo_url added successfully.");
  } catch (e) {
    console.error("Error:", e.message);
  }
  await client.end();
}

run();
