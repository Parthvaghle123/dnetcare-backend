const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected to DB');
  const res = await client.query('DELETE FROM refresh_tokens');
  console.log(`Deleted ${res.rowCount} orphaned refresh tokens.`);
  await client.end();
}

run().catch(console.error);