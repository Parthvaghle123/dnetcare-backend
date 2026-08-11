import { Injectable, HttpException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { StatusCode } from '../../common/enums/status-code.enum';
import { User, UserRole, UserStatus } from '../auth/entities/user.model';
import { UserBranch } from '../auth/entities/user-branch.model';
import { Branch } from '../organization/entities/branch.model';
import { RefreshToken } from '../auth/entities/refresh-token.model';
import { Role } from '../../common/enums/role.enum';
import { DoctorProfile } from '../doctor/entities/doctor-profile.model';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { UpdateStaffStatusDto } from './dto/update-staff-status.dto';

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(UserBranch) private userBranchModel: typeof UserBranch,
    @InjectModel(RefreshToken) private refreshTokenModel: typeof RefreshToken,
    @InjectModel(DoctorProfile)
    private doctorProfileModel: typeof DoctorProfile,
  ) {}

  async getStaffList(
    reqUser: any,
    filters: {
      branch_id?: string;
      role?: string;
      status?: string;
      is_active?: string;
      is_deleted?: string;
      is_pending?: string;
      search?: string;
      page?: string;
      limit?: string;
    },
  ) {
    try {
      const orgId = reqUser.org_id;
      const branchFilter = filters.branch_id
        ? [filters.branch_id]
        : reqUser.branch_ids;

      const page = parseInt(filters.page || '1', 10);
      const limit = parseInt(filters.limit || '10', 10);
      const offset = (page - 1) * limit;

      const whereClause: any = reqUser.role === 'MAIN_ADMIN' ? {} : {
        organization_id: orgId,
      };

      const doctorProfiles = await this.doctorProfileModel.findAll({
        attributes: ['user_id'],
      });
      const doctorUserIds = doctorProfiles.map((dp) => dp.user_id);

      if (filters.role === Role.DOCTOR) {
        whereClause[Op.and] = whereClause[Op.and] || [];
        whereClause[Op.and].push({
          [Op.or]: [{ role: Role.DOCTOR }, { id: { [Op.in]: doctorUserIds } }],
        });
      } else if (filters.role && filters.role !== Role.OWNER) {
        whereClause.role = filters.role;
      } else {
        // No role filter - get all staff, plus owners who have a doctor profile
        whereClause[Op.and] = whereClause[Op.and] || [];
        whereClause[Op.and].push({
          [Op.or]: [
            { role: { [Op.ne]: Role.OWNER } },
            { id: { [Op.in]: doctorUserIds } },
          ],
        });
      }

      if (filters.is_pending === 'true') {
        whereClause.status = UserStatus.PENDING;
      } else if (filters.status) {
        whereClause.status = filters.status;
      } else {
        whereClause.status = { [Op.ne]: UserStatus.PENDING };
      }

      if (filters.is_deleted !== undefined) {
        whereClause.is_deleted = filters.is_deleted === 'true';
      } else {
        whereClause.is_deleted = false;
      }

      if (filters.is_active !== undefined) {
        whereClause.is_active = filters.is_active === 'true';
      }

      if (filters.search) {
        whereClause[Op.or] = [
          { first_name: { [Op.iLike]: `%${filters.search}%` } },
          { last_name: { [Op.iLike]: `%${filters.search}%` } },
          { email: { [Op.iLike]: `%${filters.search}%` } },
          { phone: { [Op.iLike]: `%${filters.search}%` } },
        ];
      }

      const queryOptions: any = {
        where: whereClause,
        limit,
        offset,
        distinct: true, // Necessary when counting with includes
        order: [['created_at', 'DESC']],
      };

      if (reqUser.role === Role.OWNER && !filters.branch_id) {
        queryOptions.include = [{ model: UserBranch, include: [Branch] }];
      } else {
        queryOptions.include = [
          {
            model: UserBranch,
            where: { branch_id: branchFilter },
            include: [Branch],
          },
        ];
      }

      const { rows, count } =
        await this.userModel.findAndCountAll(queryOptions);

      const totalPages = Math.ceil(count / limit);

      const records = rows.map((user) => ({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role === UserRole.OWNER ? Role.DOCTOR : user.role,
        status: user.status,
        is_active: user.is_active,
        is_deleted: user.is_deleted,
        branches:
          user.user_branches?.map((ub: any) => ({
            id: ub.branch.id,
            name: ub.branch.name,
            color_code: ub.branch.color_code,
            is_primary: ub.is_primary,
          })) || [],
      }));

      return {
        records,
        meta: {
          total_records: count,
          current_page: page,
          total_pages: totalPages,
          limit: limit,
          has_next: page < totalPages,
          has_previous: page > 1,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[getStaffList] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getStaffById(reqUser: any, staffId: string) {
    try {
      const staff = await this.userModel.findOne({
        where: reqUser.role === 'MAIN_ADMIN' ? { id: staffId } : { id: staffId, organization_id: reqUser.org_id },
        include: [{ model: UserBranch, include: [Branch] }],
      });

      if (!staff)
        throw new HttpException('Staff not found.', StatusCode.NOT_FOUND);

      if (reqUser.role === Role.BRANCH_ADMIN) {
        const sharedBranch = staff.user_branches?.some((ub: any) =>
          reqUser.branch_ids.includes(ub.branch_id),
        );
        if (!sharedBranch)
          throw new HttpException(
            'You do not have access to this staff.',
            StatusCode.FORBIDDEN,
          );
      }

      return {
        id: staff.id,
        first_name: staff.first_name,
        last_name: staff.last_name,
        email: staff.email,
        phone: staff.phone,
        role: staff.role,
        status: staff.status,
        is_active: staff.is_active,
        branches:
          staff.user_branches?.map((ub: any) => ({
            id: ub.branch.id,
            name: ub.branch.name,
            color_code: ub.branch.color_code,
            is_primary: ub.is_primary,
          })) || [],
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[getStaffById] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateStaff(reqUser: any, staffId: string, dto: UpdateStaffDto) {
    try {
      const staff = await this.userModel.findOne({
        where: reqUser.role === 'MAIN_ADMIN' ? { id: staffId } : { id: staffId, organization_id: reqUser.org_id },
        include: [{ model: UserBranch }],
      });

      if (!staff)
        throw new HttpException('Staff not found.', StatusCode.NOT_FOUND);

      if (reqUser.role === Role.BRANCH_ADMIN && reqUser.id !== staff.id) {
        if (
          (staff.role as string) === Role.OWNER ||
          (staff.role as string) === Role.BRANCH_ADMIN
        ) {
          throw new HttpException(
            'You do not have permission to modify this staff.',
            StatusCode.FORBIDDEN,
          );
        }
        const sharedBranch = staff.user_branches?.some((ub: any) =>
          reqUser.branch_ids.includes(ub.branch_id),
        );
        if (!sharedBranch)
          throw new HttpException(
            'You do not have access to update this staff.',
            StatusCode.FORBIDDEN,
          );
      }

      if (dto.phone && dto.phone !== staff.phone) {
        const phoneExists = await this.userModel.findOne({
          where: { phone: dto.phone },
        });
        if (phoneExists) {
          throw new HttpException(
            'Phone number is already in use by another account.',
            StatusCode.CONFLICT,
          );
        }
      }

      await staff.update(dto);

      return {
        id: staff.id,
        first_name: staff.first_name,
        last_name: staff.last_name,
        phone: staff.phone,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[updateStaff] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateStaffStatus(
    reqUser: any,
    staffId: string,
    dto: UpdateStaffStatusDto,
  ) {
    try {
      const staff = await this.userModel.findOne({
        where: reqUser.role === 'MAIN_ADMIN' ? { id: staffId } : { id: staffId, organization_id: reqUser.org_id },
        include: [{ model: UserBranch }],
      });

      if (!staff)
        throw new HttpException('Staff not found.', StatusCode.NOT_FOUND);

      if (reqUser.role === Role.BRANCH_ADMIN && reqUser.id !== staff.id) {
        if (
          (staff.role as string) === Role.OWNER ||
          (staff.role as string) === Role.BRANCH_ADMIN
        ) {
          throw new HttpException(
            'You do not have permission to modify this staff.',
            StatusCode.FORBIDDEN,
          );
        }
        const sharedBranch = staff.user_branches?.some((ub: any) =>
          reqUser.branch_ids.includes(ub.branch_id),
        );
        if (!sharedBranch)
          throw new HttpException(
            'You do not have access to update this staff.',
            StatusCode.FORBIDDEN,
          );
      }

      if ((staff.role as string) === Role.OWNER) {
        throw new HttpException(
          'Cannot modify the organization owner status.',
          StatusCode.FORBIDDEN,
        );
      }

      await staff.update({ is_active: dto.is_active, status: dto.status });

      if (!dto.is_active || dto.status === UserStatus.INACTIVE) {
        await this.refreshTokenModel.update(
          { is_revoked: true },
          { where: { user_id: staffId, is_revoked: false } },
        );
      }

      return {
        id: staff.id,
        is_active: staff.is_active,
        status: staff.status,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[updateStaffStatus] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getStaffBranches(reqUser: any, staffId: string) {
    try {
      const staff = await this.userModel.findOne({
        where: reqUser.role === 'MAIN_ADMIN' ? { id: staffId } : { id: staffId, organization_id: reqUser.org_id },
      });

      if (!staff)
        throw new HttpException('Staff not found.', StatusCode.NOT_FOUND);

      const branches = await this.userBranchModel.findAll({
        where: { user_id: staffId },
        include: [{ model: Branch }],
      });

      return branches.map((ub: any) => ({
        id: ub.branch.id,
        name: ub.branch.name,
        color_code: ub.branch.color_code,
        is_primary: ub.is_primary,
      }));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[getStaffBranches] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async removeStaffFromBranch(reqUser: any, staffId: string, branchId: string) {
    try {
      if (
        reqUser.role === Role.BRANCH_ADMIN &&
        !reqUser.branch_ids.includes(branchId)
      ) {
        throw new HttpException(
          'You do not have access to this branch.',
          StatusCode.FORBIDDEN,
        );
      }

      const staff = await this.userModel.findOne({
        where: reqUser.role === 'MAIN_ADMIN' ? { id: staffId } : { id: staffId, organization_id: reqUser.org_id },
      });
      if (!staff) {
        throw new HttpException('Staff not found.', StatusCode.NOT_FOUND);
      }

      if ((staff.role as string) === Role.OWNER) {
        throw new HttpException(
          'Cannot modify the organization owner.',
          StatusCode.FORBIDDEN,
        );
      }
      if (
        reqUser.role === Role.BRANCH_ADMIN &&
        (staff.role as string) === Role.BRANCH_ADMIN
      ) {
        throw new HttpException(
          'You do not have permission to manage branches for this role.',
          StatusCode.FORBIDDEN,
        );
      }

      const deleted = await this.userBranchModel.destroy({
        where: { user_id: staffId, branch_id: branchId },
      });
      if (!deleted) {
        throw new HttpException(
          'Staff is not assigned to this branch.',
          StatusCode.BAD_REQUEST,
        );
      }
      return true;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[removeStaffFromBranch] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async assignStaffToBranch(reqUser: any, staffId: string, branchId: string) {
    try {
      if (
        reqUser.role === Role.BRANCH_ADMIN &&
        !reqUser.branch_ids.includes(branchId)
      ) {
        throw new HttpException(
          'You do not have access to this branch.',
          StatusCode.FORBIDDEN,
        );
      }

      const staff = await this.userModel.findOne({
        where: reqUser.role === 'MAIN_ADMIN' ? { id: staffId } : { id: staffId, organization_id: reqUser.org_id },
      });
      if (!staff) {
        throw new HttpException('Staff not found.', StatusCode.NOT_FOUND);
      }

      if ((staff.role as string) === Role.OWNER) {
        throw new HttpException(
          'Cannot modify the organization owner.',
          StatusCode.FORBIDDEN,
        );
      }
      if (
        reqUser.role === Role.BRANCH_ADMIN &&
        (staff.role as string) === Role.BRANCH_ADMIN
      ) {
        throw new HttpException(
          'You do not have permission to manage branches for this role.',
          StatusCode.FORBIDDEN,
        );
      }

      const existingAssignment = await this.userBranchModel.findOne({
        where: { user_id: staffId, branch_id: branchId },
      });
      if (existingAssignment) {
        throw new HttpException(
          'Staff is already assigned to this branch.',
          StatusCode.BAD_REQUEST,
        );
      }

      await this.userBranchModel.create({
        user_id: staffId,
        branch_id: branchId,
        is_primary: false,
      });

      return true;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[assignStaffToBranch] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteStaff(reqUser: any, staffId: string) {
    try {
      if (reqUser.role !== Role.OWNER && reqUser.role !== 'MAIN_ADMIN') {
        throw new HttpException(
          'Only the clinic owner can delete staff.',
          StatusCode.FORBIDDEN,
        );
      }

      const staff = await this.userModel.findOne({
        where: reqUser.role === 'MAIN_ADMIN' ? { id: staffId } : { id: staffId, organization_id: reqUser.org_id },
      });
      if (!staff) {
        throw new HttpException('Staff not found.', StatusCode.NOT_FOUND);
      }

      if ((staff.role as string) === Role.OWNER) {
        throw new HttpException(
          'Cannot delete the organization owner.',
          StatusCode.FORBIDDEN,
        );
      }

      // Soft delete user via is_deleted
      await staff.update({
        is_deleted: true,
        is_active: false,
        status: UserStatus.INACTIVE,
      });

      // Revoke all active sessions
      await this.refreshTokenModel.update(
        { is_revoked: true },
        { where: { user_id: staffId, is_revoked: false } },
      );

      return true;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[deleteStaff] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
