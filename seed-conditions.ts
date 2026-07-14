import { Sequelize } from 'sequelize-typescript';
import * as dotenv from 'dotenv';
dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_URL as string, {
  dialect: 'postgres',
  logging: false,
});

async function seed() {
  await sequelize.authenticate();
  console.log('Connected to DB');

  const defaults = [
    { name: 'Diabetes' },
    { name: 'Hypertension' },
    { name: 'Asthma' },
    { name: 'Allergy to Penicillin' },
    { name: 'Heart Disease' },
    { name: 'Thyroid Disorder' }
  ];

  for (const condition of defaults) {
    const [results]: any = await sequelize.query(`SELECT id FROM medical_condition_masters WHERE name = '${condition.name}' AND organization_id IS NULL`);
    if (results.length === 0) {
      await sequelize.query(`INSERT INTO medical_condition_masters (id, name, is_active, organization_id, created_at, updated_at) VALUES (gen_random_uuid(), '${condition.name}', true, NULL, NOW(), NOW())`);
      console.log('Created:', condition.name);
    }
  }

  console.log('Seeding completed');
  await sequelize.close();
}

seed().catch(console.error);
