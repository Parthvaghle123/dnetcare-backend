import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PatientBranch } from './src/modules/patient/entities/patient-branch.model';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  console.log('Syncing patient_branches table...');
  try {
    // 1. Sync PatientBranch model to create/alter patient_branches table
    await PatientBranch.sync({ alter: true });
    console.log('patient_branches table synced successfully.');

    // 2. Populate patient_branches with existing patients' primary branches
    console.log('Migrating existing patient branches...');
    if (PatientBranch.sequelize) {
      await PatientBranch.sequelize.query(`
        INSERT INTO patient_branches (patient_id, branch_id, created_at, updated_at)
        SELECT id, branch_id, created_at, updated_at FROM patients
        ON CONFLICT (patient_id, branch_id) DO NOTHING;
      `);
      console.log('Existing patient branches migrated successfully.');
    } else {
      console.error('Sequelize instance is undefined on PatientBranch model.');
    }
  } catch (error) {
    console.error('Error in sync/migration script:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
