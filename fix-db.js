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
    await sequelize.query('ALTER TABLE prescriptions ALTER COLUMN consultation_id DROP NOT NULL;');
    console.log('Added treatment_plan_phase_id and made consultation_id nullable in prescriptions.');

    await sequelize.query('ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(255);');
    await sequelize.query('ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255);');
    await sequelize.query('ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_signature VARCHAR(255);');
    console.log('Added Razorpay columns to payments.');
    
  } catch(e) {
    console.error('Error:', e);
  } finally {
    await sequelize.close();
  }
}
run();
