import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { UploadModule } from './modules/upload/upload.module';
import { NotificationModule } from './modules/notification/notification.module';
import { DoctorModule } from './modules/doctor/doctor.module';
import { StaffModule } from './modules/staff/staff.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { PatientModule } from './modules/patient/patient.module';
import { ConsultationModule } from './modules/consultation/consultation.module';
import { PrescriptionModule } from './modules/prescription/prescription.module';
import { TreatmentModule } from './modules/treatment/treatment.module';
import { FinanceModule } from './modules/finance/finance.module';
import { AppointmentModule } from './modules/appointment/appointment.module';
import { BillingModule } from './modules/billing/billing.module';
import { EntitiesModule } from './database/entities.module';
import { InternshipModule } from './modules/internship/internship.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    EntitiesModule,
    AuthModule,
    OrganizationModule,
    UploadModule,
    NotificationModule,
    DoctorModule,
    StaffModule,
    CatalogModule,
    PatientModule,
    ConsultationModule,
    PrescriptionModule,
    TreatmentModule,
    FinanceModule,
    AppointmentModule,
    BillingModule,
    InternshipModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
