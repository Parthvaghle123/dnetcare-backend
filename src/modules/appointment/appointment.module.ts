import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';

import { Appointment } from './entities/appointment.model';
import { AppointmentStatusHistory } from './entities/appointment-status-history.model';
import { Patient } from '../patient/entities/patient.model';
import { Branch } from '../organization/entities/branch.model';
import { User } from '../auth/entities/user.model';
import { DoctorSchedule } from '../doctor/entities/doctor-schedule.model';
import { DoctorLeave } from '../doctor/entities/doctor-leave.model';
import { TreatmentPlan } from '../treatment/entities/treatment-plan.model';
import { TreatmentPlanPhase } from '../treatment/entities/treatment-plan-phase.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Appointment,
      AppointmentStatusHistory,
      Patient,
      Branch,
      User,
      DoctorSchedule,
      DoctorLeave,
      TreatmentPlan,
      TreatmentPlanPhase
    ])
  ],
  controllers: [AppointmentController],
  providers: [AppointmentService],
  exports: [AppointmentService, SequelizeModule]
})
export class AppointmentModule {}
