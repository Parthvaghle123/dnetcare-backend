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
    console.log('Connection has been established successfully.');

    const queries = [
      `CREATE TABLE IF NOT EXISTS "internship_experiences" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "inquiry_id" UUID NOT NULL REFERENCES "internship_inquiries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "company_name" VARCHAR(255) NOT NULL,
        "role" VARCHAR(255) NOT NULL,
        "start_date" VARCHAR(255) NOT NULL,
        "end_date" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );`,
      `ALTER TABLE "internship_inquiries" DROP COLUMN IF EXISTS "experience";`
    ];

    for (const q of queries) {
      await sequelize.query(q);
      console.log(`Executed query successfully`);
    }

    console.log('Experience table created and old column dropped successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
}

run();
