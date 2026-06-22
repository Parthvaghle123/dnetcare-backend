import { Injectable, HttpException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { StatusCode } from '../../common/enums/status-code.enum';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { DoctorProfile } from './entities/doctor-profile.model';
import { DoctorSchedule } from './entities/doctor-schedule.model';
import { DoctorLeave } from './entities/doctor-leave.model';
import { User } from '../auth/entities/user.model';
import { UserBranch } from '../auth/entities/user-branch.model';
import { Role } from '../../common/enums/role.enum';
import { CreateDoctorProfileDto } from './dto/create-doctor-profile.dto';
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto';
import { CreateDoctorScheduleDto } from './dto/create-doctor-schedule.dto';
import { UpdateDoctorScheduleDto } from './dto/update-doctor-schedule.dto';
import { CreateDoctorLeaveDto } from './dto/create-doctor-leave.dto';

@Injectable()
export class DoctorService {
  private readonly logger = new Logger(DoctorService.name);

  constructor(
    @InjectModel(DoctorProfile) private profileModel: typeof DoctorProfile,
    @InjectModel(DoctorSchedule) private scheduleModel: typeof DoctorSchedule,
    @InjectModel(DoctorLeave) private leaveModel: typeof DoctorLeave,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(UserBranch) private userBranchModel: typeof UserBranch,
  ) {}

  private async verifyDoctorAccess(reqUser: any, doctorId: string) {
    const doctor = await this.userModel.findOne({
      where: { id: doctorId, organization_id: reqUser.org_id, role: Role.DOCTOR },
      include: [{ model: UserBranch }]
    });

    if (!doctor) {
      throw new HttpException('Doctor not found in your organization.', StatusCode.NOT_FOUND);
    }

    if (reqUser.role === Role.BRANCH_ADMIN) {
      const sharedBranch = doctor.user_branches?.some((ub: any) => reqUser.branch_ids.includes(ub.branch_id));
      if (!sharedBranch) {
        throw new HttpException('You do not have access to this doctor.', StatusCode.FORBIDDEN);
      }
    }
    
    return doctor;
  }

  async getDoctorProfile(user: any, doctorId: string) {
    try {
      const doctorUser = await this.userModel.findOne({
        where: { id: doctorId, organization_id: user.org_id, role: Role.DOCTOR }
      });

      if (!doctorUser) {
        throw new HttpException({ message: 'Doctor not found.', error: ErrorCode.NOT_FOUND }, StatusCode.NOT_FOUND);
      }

      const profile = await this.profileModel.findOne({
        where: { user_id: doctorId }
      });

      if (!profile) {
        throw new HttpException({ message: 'Doctor profile not set up yet.', error: ErrorCode.NOT_FOUND }, StatusCode.NOT_FOUND);
      }

      return {
        user_id: doctorId,
        first_name: doctorUser.first_name,
        last_name: doctorUser.last_name,
        email: doctorUser.email,
        phone: doctorUser.phone,
        registration_number: profile.registration_number,
        specialization: profile.specialization,
        qualification: profile.qualification,
        signature_url: profile.signature_url,
        default_consultation_fee: profile.default_consultation_fee,
        created_at: profile.created_at
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[getDoctorProfile] Error:`, error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  // --- Profile Methods ---

  async createProfile(reqUser: any, doctorId: string, dto: CreateDoctorProfileDto) {
    try {
      await this.verifyDoctorAccess(reqUser, doctorId);

      const existingProfile = await this.profileModel.findOne({ where: { user_id: doctorId } });
      if (existingProfile) {
        throw new HttpException('Profile already exists. Use PUT to update.', StatusCode.CONFLICT);
      }

      const profile = await this.profileModel.create({
        user_id: doctorId,
        ...dto
      });

      return profile;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[createProfile] Error:`, error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async updateProfile(reqUser: any, doctorId: string, dto: UpdateDoctorProfileDto) {
    try {
      await this.verifyDoctorAccess(reqUser, doctorId);

      const profile = await this.profileModel.findOne({ where: { user_id: doctorId } });
      if (!profile) {
        throw new HttpException('Profile not found. Please create it first.', StatusCode.NOT_FOUND);
      }

      await profile.update(dto);

      return profile;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[updateProfile] Error:`, error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  // --- Schedule Methods ---

  async getSchedules(reqUser: any, doctorId: string) {
    try {
      await this.verifyDoctorAccess(reqUser, doctorId);

      const schedules = await this.scheduleModel.findAll({
        where: { doctor_id: doctorId },
        order: [['day_of_week', 'ASC'], ['start_time', 'ASC']]
      });

      return schedules.map(s => ({
        id: s.id,
        branch_id: s.branch_id,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        slot_duration_minutes: s.slot_duration_minutes,
        is_available: s.is_available
      }));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[getSchedules] Error:`, error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async addSchedule(reqUser: any, doctorId: string, dto: CreateDoctorScheduleDto) {
    try {
      await this.verifyDoctorAccess(reqUser, doctorId);

      if (reqUser.role === Role.BRANCH_ADMIN && !reqUser.branch_ids.includes(dto.branch_id)) {
        throw new HttpException('You cannot assign a schedule for a branch you do not manage.', StatusCode.FORBIDDEN);
      }

      const schedules: DoctorSchedule[] = [];
      for (const day of dto.day_of_week) {
        const schedule = await this.scheduleModel.create({
          doctor_id: doctorId,
          branch_id: dto.branch_id,
          day_of_week: day,
          start_time: dto.start_time,
          end_time: dto.end_time,
          slot_duration_minutes: dto.slot_duration_minutes,
          is_available: dto.is_available
        });
        schedules.push(schedule);
      }

      return schedules;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[addSchedule] Error:`, error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async updateSchedule(reqUser: any, doctorId: string, dto: UpdateDoctorScheduleDto) {
    try {
      await this.verifyDoctorAccess(reqUser, doctorId);

      const updatedSchedules: DoctorSchedule[] = [];

      for (const day of dto.day_of_week) {
        let schedule = await this.scheduleModel.findOne({ where: { doctor_id: doctorId, day_of_week: day } });

        if (schedule) {
          // Update existing schedule
          if (reqUser.role === Role.BRANCH_ADMIN) {
            if (!reqUser.branch_ids.includes(schedule.branch_id)) {
               throw new HttpException(`You cannot modify the schedule for ${day}.`, StatusCode.FORBIDDEN);
            }
            if (dto.branch_id && !reqUser.branch_ids.includes(dto.branch_id)) {
               throw new HttpException('You cannot reassign schedule to a branch you do not manage.', StatusCode.FORBIDDEN);
            }
          }

          await schedule.update({
            branch_id: dto.branch_id !== undefined ? dto.branch_id : schedule.branch_id,
            start_time: dto.start_time !== undefined ? dto.start_time : schedule.start_time,
            end_time: dto.end_time !== undefined ? dto.end_time : schedule.end_time,
            slot_duration_minutes: dto.slot_duration_minutes !== undefined ? dto.slot_duration_minutes : schedule.slot_duration_minutes,
            is_available: dto.is_available !== undefined ? dto.is_available : schedule.is_available
          });

          updatedSchedules.push(schedule);
        } else {
          // Upsert: Create new schedule if it doesn't exist
          if (!dto.branch_id || !dto.start_time || !dto.end_time || !dto.slot_duration_minutes) {
             throw new HttpException(`Missing required fields to create a new schedule for ${day}`, StatusCode.BAD_REQUEST);
          }

          if (reqUser.role === Role.BRANCH_ADMIN && !reqUser.branch_ids.includes(dto.branch_id)) {
            throw new HttpException('You cannot assign a schedule for a branch you do not manage.', StatusCode.FORBIDDEN);
          }

          schedule = await this.scheduleModel.create({
            doctor_id: doctorId,
            branch_id: dto.branch_id,
            day_of_week: day,
            start_time: dto.start_time,
            end_time: dto.end_time,
            slot_duration_minutes: dto.slot_duration_minutes,
            is_available: dto.is_available !== undefined ? dto.is_available : true
          });

          updatedSchedules.push(schedule);
        }
      }

      return updatedSchedules;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[updateSchedule] Error:`, error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async removeSchedule(reqUser: any, doctorId: string, scheduleId: string) {
    try {
      await this.verifyDoctorAccess(reqUser, doctorId);

      const schedule = await this.scheduleModel.findOne({ where: { id: scheduleId, doctor_id: doctorId } });
      if (!schedule) throw new HttpException('Schedule not found.', StatusCode.NOT_FOUND);

      if (reqUser.role === Role.BRANCH_ADMIN && !reqUser.branch_ids.includes(schedule.branch_id)) {
        throw new HttpException('You cannot remove this schedule.', StatusCode.FORBIDDEN);
      }

      await schedule.destroy();
      return true;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[removeSchedule] Error:`, error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  // --- Leave Methods ---

  async getLeaves(reqUser: any, doctorId: string) {
    try {
      await this.verifyDoctorAccess(reqUser, doctorId);

      const leaves = await this.leaveModel.findAll({
        where: { doctor_id: doctorId },
        order: [['leave_date', 'ASC']]
      });

      return leaves.map(l => ({
        id: l.id,
        branch_id: l.branch_id,
        leave_date: l.leave_date,
        reason: l.reason,
        notify_patients: l.notify_patients,
        created_at: l.created_at
      }));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[getLeaves] Error:`, error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async addLeave(reqUser: any, doctorId: string, dto: CreateDoctorLeaveDto) {
    try {
      await this.verifyDoctorAccess(reqUser, doctorId);

      if (reqUser.role === Role.BRANCH_ADMIN && !reqUser.branch_ids.includes(dto.branch_id)) {
        throw new HttpException('You cannot log leave for a branch you do not manage.', StatusCode.FORBIDDEN);
      }

      const existingLeave = await this.leaveModel.findOne({
        where: { doctor_id: doctorId, branch_id: dto.branch_id, leave_date: dto.leave_date }
      });

      if (existingLeave) {
        throw new HttpException('Leave already logged for this date and branch.', StatusCode.CONFLICT);
      }

      const leave = await this.leaveModel.create({
        doctor_id: doctorId,
        created_by: reqUser.id,
        ...dto
      });

      if (dto.notify_patients) {
        this.logger.log(`[addLeave] Patient notification requested for leave on ${dto.leave_date}. Enqueueing job...`);
        // TODO: Enqueue BullMQ job here
      }

      return leave;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[addLeave] Error:`, error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async cancelLeave(reqUser: any, doctorId: string, leaveId: string) {
    try {
      await this.verifyDoctorAccess(reqUser, doctorId);

      const leave = await this.leaveModel.findOne({ where: { id: leaveId, doctor_id: doctorId } });
      if (!leave) throw new HttpException('Leave not found.', StatusCode.NOT_FOUND);

      if (reqUser.role === Role.BRANCH_ADMIN && !reqUser.branch_ids.includes(leave.branch_id)) {
        throw new HttpException('You cannot cancel this leave.', StatusCode.FORBIDDEN);
      }

      await leave.destroy();
      return true;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[cancelLeave] Error:`, error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }
}
