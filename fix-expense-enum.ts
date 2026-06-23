import { Sequelize } from 'sequelize-typescript';
import * as dotenv from 'dotenv';
dotenv.config();

async function fixEnum() {
  const sequelize = new Sequelize(process.env.DATABASE_URL as string, {
    dialect: 'postgres',
    dialectOptions: { ssl: { rejectUnauthorized: false } },
    logging: false,
  });

  try {
    await sequelize.authenticate();
    console.log('Connected to DB.');

    const valuesToAdd = ['ONLINE', 'CHEQUE'];

    for (const val of valuesToAdd) {
      try {
        await sequelize.query(`ALTER TYPE enum_expenses_payment_mode ADD VALUE '${val}';`);
        console.log(`Added ${val} to enum_expenses_payment_mode.`);
      } catch (err: any) {
        if (err.message.includes('already exists')) {
          console.log(`Value ${val} already exists in enum_expenses_payment_mode.`);
        } else {
          console.error(`Error adding ${val}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error('Connection error:', err);
  } finally {
    await sequelize.close();
  }
}

fixEnum();
