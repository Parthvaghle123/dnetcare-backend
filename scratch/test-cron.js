const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('postgresql://postgres.xohkfxvvullwvnhskigr:%27%23UW4Fw6%27Ba*%2Bjq@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true', {
  dialect: 'postgres',
  dialectOptions: {
    ssl: { rejectUnauthorized: false },
  },
  logging: false,
});

async function run() {
  try {
    await sequelize.authenticate();
    
    // Calculate 1 month ago (like the cron job does)
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    console.log('1. Forcing updated_at to be 2 months ago to simulate inactivity...');
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    
    await sequelize.query(`
      UPDATE "internship_inquiries" 
      SET "updated_at" = :oldDate
      WHERE "status" = 'ACTIVE'
    `, {
      replacements: { oldDate: twoMonthsAgo }
    });

    console.log('2. Running manual update... (Checking for ACTIVE records updated before: ' + oneMonthAgo.toISOString() + ')');

    await sequelize.query(`
      UPDATE "internship_inquiries" 
      SET "status"='DISABLED'
      WHERE "status" = 'ACTIVE' 
      AND "updated_at" < :thresholdDate
    `, {
      replacements: { thresholdDate: oneMonthAgo }
    });

    console.log('3. Update query finished!');
    
    // Check results
    const [disabledRecords] = await sequelize.query(`
      SELECT id, status, updated_at FROM "internship_inquiries"
    `);
    
    console.log('Current Database State:', disabledRecords);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

run();
