const { Sequelize } = require('sequelize');
require('dotenv').config();

async function run() {
  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        rejectUnauthorized: false,
      },
    }
  });

  try {
    await sequelize.authenticate();
    console.log('Connected to DB.');
    
    // Add stats_section column if not exists
    await sequelize.query(`ALTER TABLE website_configs ADD COLUMN IF NOT EXISTS stats_section JSONB NOT NULL DEFAULT '{}'::jsonb;`);
    
    console.log('Added stats_section column to website_configs.');
    
  } catch(e) {
    console.error('Error:', e);
  } finally {
    await sequelize.close();
  }
}
run();
