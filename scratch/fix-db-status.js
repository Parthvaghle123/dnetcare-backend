const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('postgresql://postgres.xohkfxvvullwvnhskigr:%27%23UW4Fw6%27Ba*%2Bjq@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true', {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      rejectUnauthorized: false,
    },
  },
  logging: console.log,
});

async function run() {
  try {
    await sequelize.authenticate();
    const queries = [
      'ALTER TABLE "internship_inquiries" ADD COLUMN IF NOT EXISTS "status" VARCHAR(255) DEFAULT \'ACTIVE\';'
    ];

    for (const q of queries) {
      await sequelize.query(q);
      console.log(`Executed: ${q}`);
    }

    console.log('Status column added successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
}

run();
