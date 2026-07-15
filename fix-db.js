const { Sequelize } = require('sequelize');
require('dotenv').config();

async function run() {
  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false
  });

  try {
    await sequelize.authenticate();
    console.log('Connected.');
    
    await sequelize.query('ALTER TABLE branches ADD COLUMN IF NOT EXISTS start_time TIME;');
    await sequelize.query('ALTER TABLE branches ADD COLUMN IF NOT EXISTS end_time TIME;');
    console.log('Added start_time and end_time to branches.');

    await sequelize.query('ALTER TABLE medicine_masters ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0;');
    console.log('Added stock_quantity to medicine_masters.');

    await sequelize.query('ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS treatment_plan_phase_id UUID;');
    console.log('Added treatment_plan_phase_id to prescriptions.');
    
  } catch(e) {
    console.error('Error:', e);
  } finally {
    await sequelize.close();
  }
}
run();
