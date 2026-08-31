import { Injectable, HttpException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Op } from 'sequelize';
import { StatusCode } from '../../common/enums/status-code.enum';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { Role } from '../../common/enums/role.enum';

import { Appointment, AppointmentStatus } from './entities/appointment.model';
import { Patient } from '../patient/entities/patient.model';
import { Branch } from '../organization/entities/branch.model';
import { User } from '../auth/entities/user.model';
import { TreatmentPlan } from '../treatment/entities/treatment-plan.model';
import { TreatmentPlanPhase } from '../treatment/entities/treatment-plan-phase.model';
import { DoctorSchedule } from '../doctor/entities/doctor-schedule.model';
import { DoctorLeave } from '../doctor/entities/doctor-leave.model';
import { TreatmentService } from '../treatment/treatment.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { AppointmentStatusHistory } from './entities/appointment-status-history.model';

import { CreateAppointmentDto } from './dto/create-appointment.dto';
import {
  UpdateAppointmentStatusDto,
  UpdateAppointmentStatusEnum,
} from './dto/update-appointment-status.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class AppointmentService {
  private readonly logger = new Logger(AppointmentService.name);

  constructor(
    @InjectModel(Appointment) private appointmentModel: typeof Appointment,
    @InjectModel(Patient) private patientModel: typeof Patient,
    @InjectModel(Branch) private branchModel: typeof Branch,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(TreatmentPlan)
    private treatmentPlanModel: typeof TreatmentPlan,
    @InjectModel(TreatmentPlanPhase)
    private phaseModel: typeof TreatmentPlanPhase,
    @InjectModel(DoctorSchedule)
    private doctorScheduleModel: typeof DoctorSchedule,
    @InjectModel(DoctorLeave) private doctorLeaveModel: typeof DoctorLeave,
    private treatmentService: TreatmentService,
    private sequelize: Sequelize,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  private getFormatDate(val: any): string {
    if (!val) return '';
    if (val instanceof Date) {
      const year = val.getFullYear();
      const month = String(val.getMonth() + 1).padStart(2, '0');
      const day = String(val.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    if (typeof val === 'string' && val.length >= 10)
      return val.substring(0, 10);
    return String(val);
  }

  private generateSlots(
    startTime: string,
    endTime: string,
    interval: number,
  ): string[] {
    const startParts = startTime.split(':');
    const endParts = endTime.split(':');
    let current = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    const end = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

    const slots: string[] = [];
    while (current < end) {
      const hours = Math.floor(current / 60);
      const minutes = current % 60;
      slots.push(
        String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0'),
      );
      current += interval;
    }
    return slots;
  }

  async getAvailableSlots(user: any, query: any) {
    try {
      const { doctor_id, branch_id, date, date_from, date_to } = query;
      const startDateStr = date_from || date;
      const endDateStr = date_to || date;

      if (!doctor_id || !branch_id || !startDateStr || !endDateStr) {
        throw new HttpException(
          {
            message: 'Missing required parameters.',
            error: ErrorCode.BAD_REQUEST,
          },
          StatusCode.BAD_REQUEST,
        );
      }

      const doctor = await this.userModel.findOne({
        where: {
          id: doctor_id,
          organization_id: user.org_id,
          role: { [Op.in]: [Role.DOCTOR, Role.OWNER, Role.BRANCH_ADMIN] },
        },
      });
      if (!doctor)
        throw new HttpException(
          { message: 'Doctor not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );

      const branch = await this.branchModel.findOne({
        where: { id: branch_id, organization_id: user.org_id },
      });
      if (!branch)
        throw new HttpException(
          { message: 'Invalid branch.', error: ErrorCode.BAD_REQUEST },
          StatusCode.BAD_REQUEST,
        );

      const start = new Date(`${startDateStr}T00:00:00.000Z`);
      const end = new Date(`${endDateStr}T00:00:00.000Z`);

      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        throw new HttpException(
          { message: 'Invalid date range.', error: ErrorCode.BAD_REQUEST },
          StatusCode.BAD_REQUEST,
        );
      }

      const leaves = await this.doctorLeaveModel.findAll({
        where: {
          doctor_id,
          branch_id,
          [Op.or]: [
            { start_date: { [Op.between]: [startDateStr, endDateStr] } },
            { end_date: { [Op.between]: [startDateStr, endDateStr] } },
            {
              start_date: { [Op.lte]: startDateStr },
              end_date: { [Op.gte]: endDateStr },
            },
          ],
        },
      });

      const schedules = await this.doctorScheduleModel.findAll({
        where: { doctor_id, branch_id, is_available: true },
      });
      const scheduleMap = new Map<string, any[]>();
      schedules.forEach((s: any) => {
        if (!scheduleMap.has(s.day_of_week)) scheduleMap.set(s.day_of_week, []);
        scheduleMap.get(s.day_of_week)!.push(s);
      });

      const appointments = await this.appointmentModel.findAll({
        where: {
          doctor_id,
          branch_id,
          scheduled_at: {
            [Op.between]: [
              new Date(`${startDateStr}T00:00:00.000Z`),
              new Date(`${endDateStr}T23:59:59.999Z`),
            ],
          },
          status: {
            [Op.notIn]: [
              AppointmentStatus.CANCELLED,
              AppointmentStatus.RESCHEDULED,
              AppointmentStatus.NO_SHOW,
            ],
          },
        },
      });

      const appointmentMap = new Map<
        string,
        { start: number; end: number }[]
      >();
      appointments.forEach((a: any) => {
        const dateObj = new Date(a.scheduled_at);
        const dStr = dateObj.toISOString().split('T')[0];
        const tStr = dateObj.toISOString().split('T')[1].slice(0, 5);
        const [h, m] = tStr.split(':').map(Number);
        const startMin = h * 60 + m;
        const endMin = startMin + (a.duration_minutes || 15);

        if (!appointmentMap.has(dStr)) appointmentMap.set(dStr, []);
        appointmentMap.get(dStr)!.push({ start: startMin, end: endMin });
      });

      const results: any[] = [];
      const currentDate = new Date(start);

      while (currentDate <= end) {
        const currentStr = currentDate.toISOString().split('T')[0];
        const dayNames = [
          'SUNDAY',
          'MONDAY',
          'TUESDAY',
          'WEDNESDAY',
          'THURSDAY',
          'FRIDAY',
          'SATURDAY',
        ];
        const dayOfWeek = dayNames[currentDate.getDay()];

        const overlappingLeave = leaves.find(
          (l: any) =>
            currentStr >= this.getFormatDate(l.start_date) &&
            currentStr <= this.getFormatDate(l.end_date),
        );

        let excludeEvening = false;
        let isFullLeave = false;

        if (overlappingLeave) {
          if (
            overlappingLeave.is_half_day &&
            currentStr === this.getFormatDate(overlappingLeave.start_date)
          ) {
            excludeEvening = true;
          } else {
            isFullLeave = true;
          }
        }

        if (isFullLeave) {
          results.push({
            date: currentStr,
            available: false,
            reason: 'Doctor is on leave',
            slots: [],
          });
        } else if (
          !scheduleMap.has(dayOfWeek) ||
          scheduleMap.get(dayOfWeek)!.length === 0
        ) {
          results.push({
            date: currentStr,
            available: false,
            reason: 'No schedule',
            slots: [],
          });
        } else {
          const daySchedules = scheduleMap.get(dayOfWeek)!;
          const shiftSlotsMap = new Map<
            string,
            { time: string; available: boolean }[]
          >();
          let allSlots: string[] = [];
          let totalAvailableSlots = 0;
          const requestedDuration = parseInt(query.duration_minutes) || 15;
          const bookedIntervals = appointmentMap.get(currentStr) || [];

          daySchedules.forEach((sch: any) => {
            if (excludeEvening && sch.shift === 'EVENING') return;

            let [endH, endM] = sch.end_time.split(':').map(Number);
            if (sch.shift === 'EVENING' && endH < 12) endH += 12;
            const shiftEndMin = endH * 60 + endM;

            const shiftSlots = this.generateSlots(
              sch.start_time,
              sch.end_time,
              15,
            ); // Generate every 15 mins
            allSlots = allSlots.concat(shiftSlots);

            const availableForShift: { time: string; available: boolean }[] =
              [];

            shiftSlots.forEach((slot) => {
              let [h, m] = slot.split(':').map(Number);
              if (sch.shift === 'EVENING' && h < 12) h += 12;

              const slotStart = h * 60 + m;
              const visualSlotEnd = slotStart + 15;

              if (visualSlotEnd > shiftEndMin) return;

              let overlap = false;
              for (const booked of bookedIntervals) {
                if (slotStart < booked.end && visualSlotEnd > booked.start) {
                  overlap = true;
                  break;
                }
              }

              availableForShift.push({ time: slot, available: !overlap });
            });

            if (!shiftSlotsMap.has(sch.shift)) {
              shiftSlotsMap.set(sch.shift, []);
            }
            shiftSlotsMap.get(sch.shift)!.push(...availableForShift);
          });

          allSlots = [...new Set(allSlots)].sort();

          const formattedSlots: {
            shift: string;
            slots: { time: string; available: boolean }[];
          }[] = [];
          shiftSlotsMap.forEach((slots, shift) => {
            const uniqueSlotsMap = new Map<string, boolean>();
            slots.forEach((s) => {
              if (uniqueSlotsMap.has(s.time)) {
                uniqueSlotsMap.set(
                  s.time,
                  uniqueSlotsMap.get(s.time) || s.available,
                );
              } else {
                uniqueSlotsMap.set(s.time, s.available);
              }
            });

            const uniqueSorted = Array.from(uniqueSlotsMap.entries())
              .map(([time, available]) => ({ time, available }))
              .sort((a, b) => a.time.localeCompare(b.time));

            formattedSlots.push({ shift, slots: uniqueSorted });
            totalAvailableSlots += uniqueSorted.filter(
              (s) => s.available,
            ).length;
          });

          results.push({
            date: currentStr,
            available: totalAvailableSlots > 0,
            slot_duration_minutes: requestedDuration,
            total_slots: allSlots.length,
            booked_slots: allSlots.length - totalAvailableSlots,
            available_slots: totalAvailableSlots,
            slots: formattedSlots,
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return results;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('[getAvailableSlots] Error:', error);
      throw new HttpException(
        'Something went wrong.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTodaySchedule(user: any, query: any) {
    try {
      const { branch_id, date } = query;
      const today = date ? new Date(`${date}T00:00:00.000Z`) : new Date();
      const today_start = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate(),
          0,
          0,
          0,
        ),
      );
      const today_end = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate(),
          23,
          59,
          59,
        ),
      );

      const whereClause: any = {
        organization_id: user.org_id,
        scheduled_at: { [Op.between]: [today_start, today_end] },
      };

      if (branch_id) {
        whereClause.branch_id = branch_id;
      }
      if (user.role === Role.DOCTOR) {
        whereClause.doctor_id = user.sub;
      } else if (user.role === Role.RECEPTIONIST && !branch_id) {
        whereClause.branch_id = { [Op.in]: user.branch_ids };
      }

      const appointments = await this.appointmentModel.findAll({
        where: whereClause,
        include: [
          {
            model: this.patientModel,
            attributes: [
              'id',
              'file_number',
              'first_name',
              'last_name',
              'mobile',
            ],
          },
          {
            model: this.userModel,
            as: 'doctor',
            attributes: ['id', 'first_name', 'last_name'],
          },
          { model: this.branchModel, attributes: ['id', 'name', 'color_code'] },
          {
            model: this.phaseModel,
            as: 'plan_phase',
            attributes: ['id', 'title', 'doctor_notes'],
          },
          {
            model: this.userModel,
            as: 'created_by_relation',
            attributes: ['id', 'first_name', 'last_name', 'role'],
          },
        ],
        order: [['scheduled_at', 'ASC']],
      });

      const result: any = {};
      let total_appointments = 0;

      for (const apt of appointments) {
        const key = apt.doctor_id;
        if (!result[key]) {
          result[key] = {
            doctor: apt.doctor,
            total: 0,
            completed: 0,
            appointments: [],
          };
        }
        result[key].total++;
        total_appointments++;
        if (apt.status === AppointmentStatus.COMPLETED) {
          result[key].completed++;
        }
        result[key].appointments.push({
          id: apt.id,
          scheduled_at: apt.scheduled_at,
          duration_minutes: apt.duration_minutes,
          status: apt.status,
          notes_for_doctor: apt.notes_for_doctor,
          cancellation_reason: apt.cancellation_reason,
          rescheduled_from_id: apt.rescheduled_from_id,
          patient: apt.patient,
          branch: apt.branch,
          treatment_phase: apt.plan_phase || null,
          created_by: apt.created_by_relation || null,
        });
      }

      return {
        date: today.toISOString(),
        total_appointments,
        by_doctor: Object.values(result),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('[getTodaySchedule] Error:', error);
      throw new HttpException(
        'Something went wrong.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createAppointment(user: any, dto: CreateAppointmentDto) {
    const transaction = await this.sequelize.transaction();
    try {
      const patient = await this.patientModel.findOne({
        where: { id: dto.patient_id, organization_id: user.org_id },
        transaction,
      });
      if (!patient)
        throw new HttpException(
          { message: 'Patient not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );

      // Check plan limits for appointment creation
      const count = await this.appointmentModel.count({
        where: { organization_id: user.org_id },
        transaction,
      });
      await this.subscriptionService.checkFeatureLimits(
        user.org_id,
        'max_appointments',
        count,
        user.sub,
      );

      const branch = await this.branchModel.findOne({
        where: { id: dto.branch_id, organization_id: user.org_id },
        transaction,
      });
      if (!branch)
        throw new HttpException(
          { message: 'Invalid branch.', error: ErrorCode.BAD_REQUEST },
          StatusCode.BAD_REQUEST,
        );

      const doctor = await this.userModel.findOne({
        where: { id: dto.doctor_id, organization_id: user.org_id },
        transaction,
      });
      if (!doctor)
        throw new HttpException(
          { message: 'Invalid doctor.', error: ErrorCode.BAD_REQUEST },
          StatusCode.BAD_REQUEST,
        );

      const scheduledAt = new Date(dto.scheduled_at);
      if (isNaN(scheduledAt.getTime()))
        throw new HttpException(
          {
            message: 'Invalid scheduled_at datetime.',
            error: ErrorCode.BAD_REQUEST,
          },
          StatusCode.BAD_REQUEST,
        );
      if (scheduledAt < new Date())
        throw new HttpException(
          {
            message: 'Cannot book appointment in the past.',
            error: ErrorCode.BAD_REQUEST,
          },
          StatusCode.BAD_REQUEST,
        );

      const dateStr = scheduledAt.toISOString().split('T')[0];
      const timeStr = scheduledAt.toISOString().split('T')[1].slice(0, 5);
      const dayNames = [
        'SUNDAY',
        'MONDAY',
        'TUESDAY',
        'WEDNESDAY',
        'THURSDAY',
        'FRIDAY',
        'SATURDAY',
      ];
      const dayOfWeek = dayNames[scheduledAt.getUTCDay()];

      const leave = await this.doctorLeaveModel.findOne({
        where: {
          doctor_id: dto.doctor_id,
          start_date: { [Op.lte]: dateStr },
          end_date: { [Op.gte]: dateStr },
        },
        transaction,
      });

      if (leave) {
        if (
          leave.is_half_day &&
          this.getFormatDate(leave.start_date) === dateStr
        ) {
          const [s_h, s_m] = timeStr.split(':').map(Number);
          if (s_h * 60 + s_m >= 720) {
            throw new HttpException(
              {
                message: 'Doctor is on half-day leave (evening) on this date.',
                error: ErrorCode.BAD_REQUEST,
              },
              StatusCode.BAD_REQUEST,
            );
          }
        } else {
          throw new HttpException(
            {
              message: 'Doctor is on leave on this date.',
              error: ErrorCode.BAD_REQUEST,
            },
            StatusCode.BAD_REQUEST,
          );
        }
      }

      const schedules = await this.doctorScheduleModel.findAll({
        where: {
          doctor_id: dto.doctor_id,
          branch_id: dto.branch_id,
          day_of_week: dayOfWeek,
          is_available: true,
        },
        transaction,
      });
      if (!schedules || schedules.length === 0)
        throw new HttpException(
          {
            message: 'Doctor has no schedule on this day at this branch.',
            error: ErrorCode.BAD_REQUEST,
          },
          StatusCode.BAD_REQUEST,
        );

      let finalDuration = dto.duration_minutes || 15;

      if (dto.treatment_plan_phase_id) {
        const phase = await this.phaseModel.findOne({
          where: {
            id: dto.treatment_plan_phase_id,
            treatment_plan_id: dto.treatment_plan_id,
          },
          transaction,
        });
        if (!phase)
          throw new HttpException(
            {
              message: 'Invalid treatment plan phase.',
              error: ErrorCode.BAD_REQUEST,
            },
            StatusCode.BAD_REQUEST,
          );
        if (phase.status === 'COMPLETED')
          throw new HttpException(
            {
              message: 'This phase is already completed.',
              error: ErrorCode.BAD_REQUEST,
            },
            StatusCode.BAD_REQUEST,
          );

        if (!dto.duration_minutes && phase.procedure_id) {
          const procedure =
            (await this.sequelize.models.ProcedureCatalog.findOne({
              where: { id: phase.procedure_id },
              transaction,
            })) as any;
          if (procedure && procedure.duration_minutes) {
            finalDuration = procedure.duration_minutes;
          }
        }
      }

      const [hours, minutes] = timeStr.split(':').map(Number);
      const slotMinutes = hours * 60 + minutes;

      let isWithinSchedule = false;
      for (const schedule of schedules) {
        let [startH, startM] = schedule.start_time.split(':').map(Number);
        let [endH, endM] = schedule.end_time.split(':').map(Number);

        if (schedule.shift === 'EVENING') {
          if (startH < 12) startH += 12;
          if (endH < 12) endH += 12;
        }

        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        if (
          slotMinutes >= startMinutes &&
          slotMinutes + finalDuration <= endMinutes
        ) {
          isWithinSchedule = true;
          break;
        }
      }

      if (!isWithinSchedule) {
        throw new HttpException(
          {
            message:
              'Selected time and duration exceeds doctor schedule hours.',
            error: ErrorCode.BAD_REQUEST,
          },
          StatusCode.BAD_REQUEST,
        );
      }

      const dayStart = new Date(scheduledAt);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(scheduledAt);
      dayEnd.setUTCHours(23, 59, 59, 999);

      const existingAppointments = await this.appointmentModel.findAll({
        where: {
          doctor_id: dto.doctor_id,
          scheduled_at: { [Op.between]: [dayStart, dayEnd] },
          status: {
            [Op.notIn]: [
              AppointmentStatus.CANCELLED,
              AppointmentStatus.RESCHEDULED,
              AppointmentStatus.NO_SHOW,
            ],
          },
        },
        transaction,
      });

      const newStartMin =
        scheduledAt.getUTCHours() * 60 + scheduledAt.getUTCMinutes();
      const newEndMin = newStartMin + finalDuration;

      for (const apt of existingAppointments) {
        const aptDate = new Date(apt.scheduled_at);
        const aptStartMin =
          aptDate.getUTCHours() * 60 + aptDate.getUTCMinutes();
        const aptEndMin = aptStartMin + (apt.duration_minutes || 15);

        if (newStartMin < aptEndMin && newEndMin > aptStartMin) {
          throw new HttpException(
            {
              message: 'This time slot overlaps with an existing appointment.',
              error: ErrorCode.CONFLICT,
            },
            StatusCode.CONFLICT,
          );
        }
      }

      const appointment = await this.appointmentModel.create(
        {
          organization_id: user.org_id,
          branch_id: dto.branch_id,
          patient_id: dto.patient_id,
          doctor_id: dto.doctor_id,
          scheduled_at: scheduledAt,
          duration_minutes: finalDuration,
          treatment_plan_id: dto.treatment_plan_id || null,
          plan_phase_id: dto.treatment_plan_phase_id || null,
          notes_for_doctor: dto.notes_for_doctor || null,
          status: AppointmentStatus.SCHEDULED,
          created_by: user.sub,
        },
        { transaction },
      );

      if (dto.treatment_plan_phase_id) {
        await this.phaseModel.update(
          { status: 'SCHEDULED', appointment_id: appointment.id },
          { where: { id: dto.treatment_plan_phase_id }, transaction },
        );
      }

      await transaction.commit();

      return {
        id: appointment.id,
        scheduled_at: appointment.scheduled_at,
        duration_minutes: appointment.duration_minutes,
        status: appointment.status,
        notes_for_doctor: appointment.notes_for_doctor,
        patient_id: appointment.patient_id,
        doctor_id: appointment.doctor_id,
        branch_id: appointment.branch_id,
        treatment_plan_id: appointment.treatment_plan_id,
        treatment_plan_phase_id: appointment.plan_phase_id,
        created_at: appointment.created_at,
      };
    } catch (error) {
      await transaction.rollback();
      if (error instanceof HttpException) throw error;
      this.logger.error('[createAppointment] Error:', error);
      throw new HttpException(
        'Something went wrong.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAppointments(user: any, query: any) {
    try {
      const {
        patient_id,
        doctor_id,
        branch_id,
        status,
        date_from,
        date_to,
        page = 1,
        limit = 20,
      } = query;
      const offset = (Number(page) - 1) * Number(limit);

      const whereClause: any = { organization_id: user.org_id };

      if (user.role === Role.DOCTOR) {
        whereClause.doctor_id = user.sub;
      } else if (doctor_id) {
        whereClause.doctor_id = doctor_id;
      }

      if (patient_id) whereClause.patient_id = patient_id;
      if (branch_id) whereClause.branch_id = branch_id;
      if (status) whereClause.status = status;

      if (date_from && date_to) {
        whereClause.scheduled_at = {
          [Op.between]: [
            new Date(`${date_from}T00:00:00.000Z`),
            new Date(`${date_to}T23:59:59.999Z`),
          ],
        };
      } else if (date_from) {
        whereClause.scheduled_at = {
          [Op.gte]: new Date(`${date_from}T00:00:00.000Z`),
        };
      } else if (date_to) {
        whereClause.scheduled_at = {
          [Op.lte]: new Date(`${date_to}T23:59:59.999Z`),
        };
      }

      const { rows, count } = await this.appointmentModel.findAndCountAll({
        where: whereClause,
        order: [['scheduled_at', 'ASC']],
        limit: Number(limit),
        offset: Number(offset),
        include: [
          {
            model: this.patientModel,
            attributes: [
              'id',
              'file_number',
              'first_name',
              'last_name',
              'mobile',
            ],
          },
          {
            model: this.userModel,
            as: 'doctor',
            attributes: ['id', 'first_name', 'last_name'],
          },
          { model: this.branchModel, attributes: ['id', 'name', 'color_code'] },
          { model: this.treatmentPlanModel, attributes: ['id', 'title'] },
          { model: this.phaseModel, attributes: ['id', 'title'] },
          {
            model: this.userModel,
            as: 'created_by_relation',
            attributes: ['id', 'first_name', 'last_name', 'role'],
          },
        ],
      });

      const data = rows.map((r: any) => ({
        id: r.id,
        scheduled_at: r.scheduled_at,
        duration_minutes: r.duration_minutes,
        status: r.status,
        notes_for_doctor: r.notes_for_doctor,
        cancellation_reason: r.cancellation_reason,
        patient: r.patient,
        doctor: r.doctor,
        branch: r.branch,
        treatment_plan_id: r.treatment_plan_id,
        treatment_plan_phase_id: r.plan_phase_id,
        treatment_plan: r.treatment_plan,
        treatment_phase: r.plan_phase,
        created_by: r.created_by_relation || null,
        created_at: r.created_at,
      }));

      return {
        data,
        meta: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          total_pages: Math.ceil(count / Number(limit)),
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('[getAppointments] Error:', error);
      throw new HttpException(
        'Something went wrong.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAppointmentById(user: any, id: string) {
    try {
      const appointment = await this.appointmentModel.findOne({
        where: { id, organization_id: user.org_id },
      });
      if (!appointment)
        throw new HttpException(
          { message: 'Appointment not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );

      const patient = await this.patientModel.findOne({
        where: { id: appointment.patient_id },
        attributes: [
          'id',
          'file_number',
          'first_name',
          'last_name',
          'mobile',
          'gender',
          'age',
        ],
      });

      const doctor = await this.userModel.findOne({
        where: { id: appointment.doctor_id },
        attributes: ['id', 'first_name', 'last_name'],
      });

      const branch = await this.branchModel.findOne({
        where: { id: appointment.branch_id },
        attributes: ['id', 'name', 'city', 'color_code'],
      });

      let plan: any = null;
      if (appointment.treatment_plan_id) {
        plan = await this.treatmentPlanModel.findOne({
          where: { id: appointment.treatment_plan_id },
          attributes: ['id', 'title', 'final_cost', 'status'],
        });
      }

      let phase: any = null;
      if (appointment.plan_phase_id) {
        phase = await this.phaseModel.findOne({
          where: { id: appointment.plan_phase_id },
          attributes: ['id', 'phase_number', 'title', 'doctor_notes', 'status'],
        });
      }

      let rescheduled_from: any = null;
      if (appointment.rescheduled_from_id) {
        rescheduled_from = await this.appointmentModel.findOne({
          where: { id: appointment.rescheduled_from_id },
          attributes: ['id', 'scheduled_at', 'status'],
        });
      }

      let created_by: any = null;
      if (appointment.created_by) {
        created_by = await this.userModel.findOne({
          where: { id: appointment.created_by },
          attributes: ['id', 'first_name', 'last_name', 'role'],
        });
      }

      return {
        id: appointment.id,
        scheduled_at: appointment.scheduled_at,
        duration_minutes: appointment.duration_minutes,
        status: appointment.status,
        notes_for_doctor: appointment.notes_for_doctor,
        cancellation_reason: appointment.cancellation_reason,
        reminder_sent_at: appointment.reminder_sent_at,
        patient,
        doctor,
        branch,
        treatment_plan: plan,
        treatment_phase: phase,
        rescheduled_from,
        created_by,
        created_at: appointment.created_at,
        updated_at: appointment.updated_at,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('[getAppointmentById] Error:', error);
      throw new HttpException(
        'Something went wrong.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateAppointmentStatus(
    user: any,
    id: string,
    dto: UpdateAppointmentStatusDto,
  ) {
    try {
      const appointment = await this.appointmentModel.findOne({
        where: { id, organization_id: user.org_id },
      });
      if (!appointment)
        throw new HttpException(
          { message: 'Appointment not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );

      const terminalStatuses = [
        AppointmentStatus.COMPLETED,
        AppointmentStatus.NO_SHOW,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.RESCHEDULED,
      ];
      if (terminalStatuses.includes(appointment.status)) {
        throw new HttpException(
          {
            message: `Cannot change status of a ${appointment.status} appointment.`,
            error: ErrorCode.BAD_REQUEST,
          },
          StatusCode.BAD_REQUEST,
        );
      }

      const validFlows: Record<string, string[]> = {
        SCHEDULED: ['CONFIRMED', 'IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
        CONFIRMED: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
        IN_PROGRESS: ['COMPLETED'],
      };

      if (
        !validFlows[appointment.status] ||
        !validFlows[appointment.status].includes(dto.status)
      ) {
        throw new HttpException(
          {
            message: `Invalid status transition from ${appointment.status} to ${dto.status}.`,
            error: ErrorCode.BAD_REQUEST,
          },
          StatusCode.BAD_REQUEST,
        );
      }

      if (
        dto.status === UpdateAppointmentStatusEnum.CANCELLED &&
        !dto.cancellation_reason
      ) {
        throw new HttpException(
          {
            message: 'Cancellation reason is required.',
            error: ErrorCode.BAD_REQUEST,
          },
          StatusCode.BAD_REQUEST,
        );
      }

      const updateData: any = { status: dto.status };
      if (dto.status === UpdateAppointmentStatusEnum.CANCELLED) {
        updateData.cancellation_reason = dto.cancellation_reason;
      }

      await appointment.update(updateData);

      if (
        dto.status === UpdateAppointmentStatusEnum.CANCELLED ||
        dto.status === UpdateAppointmentStatusEnum.NO_SHOW
      ) {
        if (appointment.plan_phase_id) {
          await this.phaseModel.update(
            { status: 'PENDING', appointment_id: null },
            { where: { id: appointment.plan_phase_id } },
          );
        }
      }

      if (
        dto.status === UpdateAppointmentStatusEnum.COMPLETED &&
        appointment.plan_phase_id
      ) {
        await this.phaseModel.update(
          {
            status: 'COMPLETED',
            completed_at: new Date(),
            completed_by: user.sub,
          },
          { where: { id: appointment.plan_phase_id } },
        );
        const allPhases = await this.phaseModel.findAll({
          where: { treatment_plan_id: appointment.treatment_plan_id },
        });
        const allDone = allPhases.every(
          (p: any) => p.status === 'COMPLETED' || p.status === 'SKIPPED',
        );
        if (allDone && appointment.treatment_plan_id) {
          await this.treatmentPlanModel.update(
            { status: 'COMPLETED' },
            { where: { id: appointment.treatment_plan_id } },
          );
        }

        if (appointment.treatment_plan_id) {
          const plan = await this.treatmentPlanModel.findByPk(
            appointment.treatment_plan_id,
          );
          if (plan) {
            if (plan.status === 'COMPLETED' && plan.consultation_id) {
              const Consultation = this.sequelize.models.Consultation;
              if (Consultation) {
                await Consultation.update(
                  { is_completed: true },
                  { where: { id: plan.consultation_id } },
                );
              }
            }

            const Invoice = this.sequelize.models.Invoice;
            if (Invoice) {
              await Invoice.update(
                { invoice_date: new Date().toISOString().split('T')[0] },
                { where: { treatment_plan_id: plan.id } },
              );
            }
            await this.treatmentService.syncMasterInvoice(
              user,
              plan,
              undefined,
            );
          }
        }
      }



      let msg = 'Status updated.';
      if (dto.status === UpdateAppointmentStatusEnum.CONFIRMED)
        msg = 'Appointment confirmed.';
      else if (dto.status === UpdateAppointmentStatusEnum.IN_PROGRESS)
        msg = 'Appointment started.';
      else if (dto.status === UpdateAppointmentStatusEnum.COMPLETED)
        msg = 'Appointment completed.';
      else if (dto.status === UpdateAppointmentStatusEnum.NO_SHOW)
        msg = 'Patient marked as no-show.';
      else if (dto.status === UpdateAppointmentStatusEnum.CANCELLED)
        msg = 'Appointment cancelled.';

      return {
        data: {
          id: appointment.id,
          status: dto.status,
          cancellation_reason: dto.cancellation_reason || null,
          updated_at: appointment.updated_at,
        },
        message: msg,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('[updateAppointmentStatus] Error:', error);
      throw new HttpException(
        'Something went wrong.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async rescheduleAppointment(
    user: any,
    id: string,
    dto: RescheduleAppointmentDto,
  ) {
    const transaction = await this.sequelize.transaction();
    try {
      const appointment = await this.appointmentModel.findOne({
        where: { id, organization_id: user.org_id },
        transaction,
      });
      if (!appointment)
        throw new HttpException(
          { message: 'Appointment not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );

      const terminalStatuses = [
        AppointmentStatus.COMPLETED,
        AppointmentStatus.NO_SHOW,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.RESCHEDULED,
      ];
      if (terminalStatuses.includes(appointment.status)) {
        throw new HttpException(
          {
            message: `Cannot reschedule a ${appointment.status} appointment.`,
            error: ErrorCode.BAD_REQUEST,
          },
          StatusCode.BAD_REQUEST,
        );
      }

      const newScheduledAt = new Date(dto.scheduled_at);
      if (isNaN(newScheduledAt.getTime()))
        throw new HttpException(
          { message: 'Invalid datetime.', error: ErrorCode.BAD_REQUEST },
          StatusCode.BAD_REQUEST,
        );
      if (newScheduledAt < new Date())
        throw new HttpException(
          {
            message: 'Cannot reschedule to a past time.',
            error: ErrorCode.BAD_REQUEST,
          },
          StatusCode.BAD_REQUEST,
        );

      const dateStr = newScheduledAt.toISOString().split('T')[0];
      const dayNames = [
        'SUNDAY',
        'MONDAY',
        'TUESDAY',
        'WEDNESDAY',
        'THURSDAY',
        'FRIDAY',
        'SATURDAY',
      ];
      const dayOfWeek = dayNames[newScheduledAt.getDay()];

      const leave = await this.doctorLeaveModel.findOne({
        where: {
          doctor_id: appointment.doctor_id,
          start_date: { [Op.lte]: dateStr },
          end_date: { [Op.gte]: dateStr },
        },
        transaction,
      });

      if (leave) {
        const timeStr = newScheduledAt.toISOString().split('T')[1].slice(0, 5);
        if (
          leave.is_half_day &&
          this.getFormatDate(leave.start_date) === dateStr
        ) {
          const [s_h, s_m] = timeStr.split(':').map(Number);
          if (s_h * 60 + s_m >= 720) {
            throw new HttpException(
              {
                message:
                  'Doctor is on half-day leave (evening) on the selected date.',
                error: ErrorCode.BAD_REQUEST,
              },
              StatusCode.BAD_REQUEST,
            );
          }
        } else {
          throw new HttpException(
            {
              message: 'Doctor is on leave on the selected date.',
              error: ErrorCode.BAD_REQUEST,
            },
            StatusCode.BAD_REQUEST,
          );
        }
      }

      const schedules = await this.doctorScheduleModel.findAll({
        where: {
          doctor_id: appointment.doctor_id,
          branch_id: appointment.branch_id,
          day_of_week: dayOfWeek,
          is_available: true,
        },
        transaction,
      });
      if (!schedules || schedules.length === 0)
        throw new HttpException(
          {
            message: 'Doctor has no schedule on the selected day.',
            error: ErrorCode.BAD_REQUEST,
          },
          StatusCode.BAD_REQUEST,
        );

      const timeStr = newScheduledAt.toISOString().split('T')[1].slice(0, 5);
      const [hours, minutes] = timeStr.split(':').map(Number);
      const slotMinutes = hours * 60 + minutes;

      let isWithinSchedule = false;
      for (const schedule of schedules) {
        let [startH, startM] = schedule.start_time.split(':').map(Number);
        let [endH, endM] = schedule.end_time.split(':').map(Number);

        if (schedule.shift === 'EVENING') {
          if (startH < 12) startH += 12;
          if (endH < 12) endH += 12;
        }

        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        if (slotMinutes >= startMinutes && slotMinutes < endMinutes) {
          isWithinSchedule = true;
          break;
        }
      }

      if (!isWithinSchedule) {
        throw new HttpException(
          {
            message: 'Selected time is outside doctor schedule hours.',
            error: ErrorCode.BAD_REQUEST,
          },
          StatusCode.BAD_REQUEST,
        );
      }

      const existing = await this.appointmentModel.findOne({
        where: {
          doctor_id: appointment.doctor_id,
          scheduled_at: newScheduledAt,
          id: { [Op.ne]: id },
          status: {
            [Op.notIn]: [
              AppointmentStatus.CANCELLED,
              AppointmentStatus.RESCHEDULED,
              AppointmentStatus.NO_SHOW,
            ],
          },
        },
        transaction,
      });
      if (existing)
        throw new HttpException(
          {
            message: 'This time slot is already booked.',
            error: ErrorCode.CONFLICT,
          },
          StatusCode.CONFLICT,
        );

      await appointment.update(
        { status: AppointmentStatus.RESCHEDULED },
        { transaction },
      );

      const newAppointment = await this.appointmentModel.create(
        {
          organization_id: appointment.organization_id,
          branch_id: appointment.branch_id,
          patient_id: appointment.patient_id,
          doctor_id: appointment.doctor_id,
          scheduled_at: newScheduledAt,
          duration_minutes:
            dto.duration_minutes || appointment.duration_minutes,
          treatment_plan_id: appointment.treatment_plan_id,
          plan_phase_id: appointment.plan_phase_id,
          notes_for_doctor:
            dto.notes_for_doctor || appointment.notes_for_doctor,
          status: AppointmentStatus.SCHEDULED,
          rescheduled_from_id: id,
          created_by: user.sub,
        },
        { transaction },
      );

      if (appointment.plan_phase_id) {
        await this.phaseModel.update(
          { appointment_id: newAppointment.id, status: 'SCHEDULED' },
          { where: { id: appointment.plan_phase_id }, transaction },
        );
      }

      await transaction.commit();

      return {
        old_appointment_id: id,
        old_status: 'RESCHEDULED',
        new_appointment: {
          id: newAppointment.id,
          scheduled_at: newScheduledAt,
          status: 'SCHEDULED',
          rescheduled_from_id: id,
        },
      };
    } catch (error) {
      await transaction.rollback();
      if (error instanceof HttpException) throw error;
      this.logger.error('[rescheduleAppointment] Error:', error);
      throw new HttpException(
        'Something went wrong.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateAppointment(user: any, id: string, dto: UpdateAppointmentDto) {
    const transaction = await this.sequelize.transaction();
    try {
      const appointment = await this.appointmentModel.findOne({
        where: { id, organization_id: user.org_id },
        transaction,
      });

      if (!appointment) {
        throw new HttpException(
          { message: 'Appointment not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );
      }

      // Check if branch_id is changing
      let branchId = appointment.branch_id;
      if (dto.branch_id && dto.branch_id !== appointment.branch_id) {
        const branch = await this.branchModel.findOne({
          where: { id: dto.branch_id, organization_id: user.org_id },
          transaction,
        });
        if (!branch) {
          throw new HttpException(
            { message: 'Invalid branch.', error: ErrorCode.BAD_REQUEST },
            StatusCode.BAD_REQUEST,
          );
        }
        branchId = dto.branch_id;
      }

      // Check if doctor_id is changing
      let doctorId = appointment.doctor_id;
      if (dto.doctor_id && dto.doctor_id !== appointment.doctor_id) {
        const doctor = await this.userModel.findOne({
          where: { id: dto.doctor_id, organization_id: user.org_id },
          transaction,
        });
        if (!doctor) {
          throw new HttpException(
            { message: 'Invalid doctor.', error: ErrorCode.BAD_REQUEST },
            StatusCode.BAD_REQUEST,
          );
        }
        doctorId = dto.doctor_id;
      }

      // Validate scheduled_at
      let scheduledAt = appointment.scheduled_at;
      if (dto.scheduled_at) {
        scheduledAt = new Date(dto.scheduled_at);
        if (isNaN(scheduledAt.getTime())) {
          throw new HttpException(
            {
              message: 'Invalid scheduled_at datetime.',
              error: ErrorCode.BAD_REQUEST,
            },
            StatusCode.BAD_REQUEST,
          );
        }
      }

      let finalDuration = dto.duration_minutes !== undefined ? dto.duration_minutes : appointment.duration_minutes;

      // Handle treatment plan phase linking
      let planId = appointment.treatment_plan_id;
      let phaseId = appointment.plan_phase_id;

      if (dto.treatment_plan_id !== undefined) {
        planId = dto.treatment_plan_id;
      }
      if (dto.treatment_plan_phase_id !== undefined) {
        phaseId = dto.treatment_plan_phase_id;
      }

      // If phase is changing, unlink old phase and link new phase
      if (phaseId !== appointment.plan_phase_id) {
        // Unlink old phase
        if (appointment.plan_phase_id) {
          await this.phaseModel.update(
            { status: 'ACTIVE', appointment_id: null },
            { where: { id: appointment.plan_phase_id }, transaction },
          );
        }

        // Link new phase
        if (phaseId) {
          const phase = await this.phaseModel.findOne({
            where: {
              id: phaseId,
              treatment_plan_id: planId,
            },
            transaction,
          });
          if (!phase) {
            throw new HttpException(
              {
                message: 'Invalid treatment plan phase.',
                error: ErrorCode.BAD_REQUEST,
              },
              StatusCode.BAD_REQUEST,
            );
          }
          await this.phaseModel.update(
            { status: 'SCHEDULED', appointment_id: id },
            { where: { id: phaseId }, transaction },
          );

          if (!dto.duration_minutes && phase.procedure_id) {
            const procedure =
              (await this.sequelize.models.ProcedureCatalog.findOne({
                where: { id: phase.procedure_id },
                transaction,
              })) as any;
            if (procedure && procedure.duration_minutes) {
              finalDuration = procedure.duration_minutes;
            }
          }
        }
      }

      // Check doctor schedule and leaves if date or doctor or branch changed
      if (dto.scheduled_at || dto.doctor_id || dto.branch_id || dto.duration_minutes !== undefined) {
        const dateStr = scheduledAt.toISOString().split('T')[0];
        const timeStr = scheduledAt.toISOString().split('T')[1].slice(0, 5);
        const dayNames = [
          'SUNDAY',
          'MONDAY',
          'TUESDAY',
          'WEDNESDAY',
          'THURSDAY',
          'FRIDAY',
          'SATURDAY',
        ];
        const dayOfWeek = dayNames[scheduledAt.getUTCDay()];

        const leave = await this.doctorLeaveModel.findOne({
          where: {
            doctor_id: doctorId,
            start_date: { [Op.lte]: dateStr },
            end_date: { [Op.gte]: dateStr },
          },
          transaction,
        });

        if (leave) {
          if (
            leave.is_half_day &&
            this.getFormatDate(leave.start_date) === dateStr
          ) {
            const [s_h, s_m] = timeStr.split(':').map(Number);
            if (s_h * 60 + s_m >= 720) {
              throw new HttpException(
                {
                  message: 'Doctor is on half-day leave (evening) on this date.',
                  error: ErrorCode.BAD_REQUEST,
                },
                StatusCode.BAD_REQUEST,
              );
            }
          } else {
            throw new HttpException(
              {
                message: 'Doctor is on leave on this date.',
                error: ErrorCode.BAD_REQUEST,
              },
              StatusCode.BAD_REQUEST,
            );
          }
        }

        const schedules = await this.doctorScheduleModel.findAll({
          where: {
            doctor_id: doctorId,
            branch_id: branchId,
            day_of_week: dayOfWeek,
            is_available: true,
          },
          transaction,
        });
        if (!schedules || schedules.length === 0) {
          throw new HttpException(
            {
              message: 'Doctor has no schedule on this day at this branch.',
              error: ErrorCode.BAD_REQUEST,
            },
            StatusCode.BAD_REQUEST,
          );
        }

        const [hours, minutes] = timeStr.split(':').map(Number);
        const slotMinutes = hours * 60 + minutes;

        let isWithinSchedule = false;
        for (const schedule of schedules) {
          let [startH, startM] = schedule.start_time.split(':').map(Number);
          let [endH, endM] = schedule.end_time.split(':').map(Number);

          if (schedule.shift === 'EVENING') {
            if (startH < 12) startH += 12;
            if (endH < 12) endH += 12;
          }

          const startMinutes = startH * 60 + startM;
          const endMinutes = endH * 60 + endM;

          if (
            slotMinutes >= startMinutes &&
            slotMinutes + finalDuration <= endMinutes
          ) {
            isWithinSchedule = true;
            break;
          }
        }

        if (!isWithinSchedule) {
          throw new HttpException(
            {
              message:
                'Selected time and duration exceeds doctor schedule hours.',
              error: ErrorCode.BAD_REQUEST,
            },
            StatusCode.BAD_REQUEST,
          );
        }

        // Overlap Check (excluding current appointment id)
        const dayStart = new Date(scheduledAt);
        dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(scheduledAt);
        dayEnd.setUTCHours(23, 59, 59, 999);

        const existingAppointments = await this.appointmentModel.findAll({
          where: {
            id: { [Op.ne]: id },
            doctor_id: doctorId,
            scheduled_at: { [Op.between]: [dayStart, dayEnd] },
            status: {
              [Op.notIn]: [
                AppointmentStatus.CANCELLED,
                AppointmentStatus.RESCHEDULED,
                AppointmentStatus.NO_SHOW,
              ],
            },
          },
          transaction,
        });

        const newStartMin =
          scheduledAt.getUTCHours() * 60 + scheduledAt.getUTCMinutes();
        const newEndMin = newStartMin + finalDuration;

        for (const apt of existingAppointments) {
          const aptDate = new Date(apt.scheduled_at);
          const aptStartMin =
            aptDate.getUTCHours() * 60 + aptDate.getUTCMinutes();
          const aptEndMin = aptStartMin + (apt.duration_minutes || 15);

          if (newStartMin < aptEndMin && newEndMin > aptStartMin) {
            throw new HttpException(
              {
                message: 'This time slot overlaps with an existing appointment.',
                error: ErrorCode.CONFLICT,
              },
              StatusCode.CONFLICT,
            );
          }
        }
      }

      await appointment.update(
        {
          branch_id: branchId,
          doctor_id: doctorId,
          scheduled_at: scheduledAt,
          duration_minutes: finalDuration,
          treatment_plan_id: planId,
          plan_phase_id: phaseId,
          notes_for_doctor: dto.notes_for_doctor !== undefined ? dto.notes_for_doctor : appointment.notes_for_doctor,
        },
        { transaction },
      );

      await transaction.commit();

      return {
        message: 'Appointment updated successfully.',
        data: {
          id: appointment.id,
          scheduled_at: appointment.scheduled_at,
          duration_minutes: appointment.duration_minutes,
          status: appointment.status,
          notes_for_doctor: appointment.notes_for_doctor,
          patient_id: appointment.patient_id,
          doctor_id: appointment.doctor_id,
          branch_id: appointment.branch_id,
          treatment_plan_id: appointment.treatment_plan_id,
          treatment_plan_phase_id: appointment.plan_phase_id,
        }
      };
    } catch (error) {
      await transaction.rollback();
      if (error instanceof HttpException) throw error;
      this.logger.error('[updateAppointment] Error:', error);
      throw new HttpException(
        'Something went wrong.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteAppointment(user: any, id: string) {
    const transaction = await this.sequelize.transaction();
    try {
      const appointment = await this.appointmentModel.findOne({
        where: { id, organization_id: user.org_id },
        transaction,
      });

      if (!appointment) {
        throw new HttpException(
          { message: 'Appointment not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );
      }

      // 1. Delete associated AppointmentStatusHistory
      await AppointmentStatusHistory.destroy({
        where: { appointment_id: id },
        transaction,
      });

      // 2. Nullify appointment_id in TreatmentPlanPhases
      await this.phaseModel.update(
        { appointment_id: null },
        { where: { appointment_id: id }, transaction },
      );

      // 3. Nullify appointment_id in Consultations
      await this.sequelize.models.Consultation.update(
        { appointment_id: null },
        { where: { appointment_id: id }, transaction },
      );

      // 5. Delete the appointment itself
      await appointment.destroy({ transaction });

      await transaction.commit();
      return { message: 'Appointment deleted successfully.' };
    } catch (error) {
      await transaction.rollback();
      if (error instanceof HttpException) throw error;
      this.logger.error(`[deleteAppointment] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
