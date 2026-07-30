const { Client } = require('pg');

const DATABASE_URL = "postgresql://postgres.xohkfxvvullwvnhskigr:%27%23UW4Fw6%27Ba*%2Bjq@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres";

const plans = [
  { name: 'Pro Plan', type: 'SOFTWARE', price_monthly: 1999, max_branches: 1, max_patients: null, max_appointments: null },
  { name: 'Ultra Pro Plan', type: 'SOFTWARE', price_monthly: 3999, max_branches: 3, max_patients: null, max_appointments: null },
  { name: 'Digital Presence', type: 'MARKETING', price_monthly: 1999, max_branches: 1, max_patients: null, max_appointments: null },
  { name: 'Growth Plan', type: 'MARKETING', price_monthly: 4999, max_branches: 1, max_patients: null, max_appointments: null },
  { name: 'Practice Growth Bundle', type: 'BUNDLE', price_monthly: 8999, max_branches: 1, max_patients: null, max_appointments: null },
  { name: 'Premium Growth', type: 'BUNDLE', price_monthly: 16999, max_branches: 999, max_patients: null, max_appointments: null },
];

async function seed() {
  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    console.log('Connected to database');
    
    for (const plan of plans) {
      const res = await client.query(
        'INSERT INTO plans (id, name, type, price_monthly, max_branches, max_patients, max_appointments, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id',
        [plan.name, plan.type, plan.price_monthly, plan.max_branches, plan.max_patients, plan.max_appointments]
      );
      console.log(`Created ${plan.name} with ID: ${res.rows[0].id}`);
    }
    
    console.log('Seeding completed');
  } catch (err) {
    console.error('Error seeding plans:', err);
  } finally {
    await client.end();
  }
}

seed();
