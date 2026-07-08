import { Injectable, HttpException, Logger } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { StatusCode } from '../../common/enums/status-code.enum';
import { Role } from '../../common/enums/role.enum';
import { Organization } from './entities/organization.model';
import { Branch } from './entities/branch.model';
import { UserBranch } from '../auth/entities/user-branch.model';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchStatusDto } from './dto/branch-status.dto';
import { Op } from 'sequelize';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    @InjectModel(Organization) private orgModel: typeof Organization,
    @InjectModel(Branch) private branchModel: typeof Branch,
    @InjectModel(UserBranch) private userBranchModel: typeof UserBranch,
    @InjectConnection() private sequelize: Sequelize,
  ) {}

  async getMyOrganization(reqUser: any) {
    try {
      const orgId = reqUser.org_id;
      const org = await this.orgModel.findByPk(orgId);

      if (!org) {
        throw new HttpException('Organization not found.', StatusCode.NOT_FOUND);
      }

      return {
        id: org.id,
        name: org.name,
        phone: org.phone,
        logo_url: org.logo_url,
        is_active: org.is_active,
        created_at: org.created_at,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[getMyOrganization] Error:`, error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async updateMyOrganization(reqUser: any, dto: UpdateOrganizationDto) {
    try {
      if (reqUser.role !== Role.OWNER) {
        throw new HttpException('Only the clinic owner can update organization details.', StatusCode.FORBIDDEN);
      }

      if (dto.name === undefined && dto.phone === undefined && dto.logo_url === undefined) {
        throw new HttpException('Provide at least one field to update.', StatusCode.BAD_REQUEST);
      }

      const orgId = reqUser.org_id;
      const org = await this.orgModel.findByPk(orgId);

      if (!org) {
        throw new HttpException('Organization not found.', StatusCode.NOT_FOUND);
      }

      const updateData: any = {};
      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.phone !== undefined) updateData.phone = dto.phone;
      if (dto.logo_url !== undefined) updateData.logo_url = dto.logo_url;

      await this.orgModel.update(updateData, { where: { id: org.id } });
      
      const updatedOrg = await this.orgModel.findByPk(org.id);

      return {
        id: updatedOrg!.id,
        name: updatedOrg!.name,
        phone: updatedOrg!.phone,
        logo_url: updatedOrg!.logo_url,
        is_active: updatedOrg!.is_active,
        created_at: updatedOrg!.created_at,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[updateMyOrganization] Error:`, error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getBranches(reqUser: any, filters: { is_active?: string, city?: string, state?: string, search?: string, page?: string, limit?: string }) {
    try {
      const page = parseInt(filters.page || '1', 10);
      const limit = parseInt(filters.limit || '10', 10);
      const offset = (page - 1) * limit;

      const whereClause: any = { organization_id: reqUser.org_id };

      if (filters.is_active !== undefined) {
        whereClause.is_active = filters.is_active === 'true';
      }

      if (filters.city) {
        whereClause.city = { [Op.iLike]: `%${filters.city}%` };
      }

      if (filters.state) {
        whereClause.state = { [Op.iLike]: `%${filters.state}%` };
      }

      if (filters.search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${filters.search}%` } },
          { city: { [Op.iLike]: `%${filters.search}%` } },
          { state: { [Op.iLike]: `%${filters.search}%` } },
          { phone: { [Op.iLike]: `%${filters.search}%` } },
          { address: { [Op.iLike]: `%${filters.search}%` } }
        ];
      }

      if (reqUser.role === Role.DOCTOR || reqUser.role === Role.RECEPTIONIST) {
        whereClause.id = { [Op.in]: reqUser.branch_ids };
      }

      const { rows, count } = await this.branchModel.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['created_at', 'ASC']],
      });

      const totalPages = Math.ceil(count / limit);

      const records = rows.map((branch) => ({
        id: branch.id,
        name: branch.name,
        city: branch.city,
        state: branch.state,
        address: branch.address,
        phone: branch.phone,
        whatsapp_number: branch.whatsapp_number,
        color_code: branch.color_code,
        logo_url: branch.logo_url,
        is_active: branch.is_active,
        created_at: branch.created_at,
      }));

      return {
        records,
        meta: {
          total_records: count,
          current_page: page,
          total_pages: totalPages,
          limit: limit,
          has_next: page < totalPages,
          has_previous: page > 1
        }
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[getBranches] Error:`, error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async createBranch(reqUser: any, dto: CreateBranchDto) {
    try {
      if (reqUser.role !== Role.OWNER) {
        throw new HttpException('Only the clinic owner can create new branches.', StatusCode.FORBIDDEN);
      }

      const existingBranch = await this.branchModel.findOne({
        where: { organization_id: reqUser.org_id, name: dto.name },
      });

      if (existingBranch) {
        throw new HttpException('A branch with this name already exists in your clinic.', StatusCode.CONFLICT);
      }

      const branch = await this.branchModel.create({
        organization_id: reqUser.org_id,
        name: dto.name,
        city: dto.city,
        phone: dto.phone,
        address: dto.address || null,
        state: dto.state || null,
        whatsapp_number: dto.whatsapp_number || null,
        color_code: dto.color_code,
        logo_url: dto.logo_url || null,
        is_active: true,
      });

      return {
        id: branch.id,
        name: branch.name,
        city: branch.city,
        state: branch.state,
        address: branch.address,
        phone: branch.phone,
        whatsapp_number: branch.whatsapp_number,
        color_code: branch.color_code,
        logo_url: branch.logo_url,
        is_active: branch.is_active,
        created_at: branch.created_at,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[createBranch] Error:`, error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getBranchById(reqUser: any, id: string) {
    try {
      const branch = await this.branchModel.findOne({
        where: { id, organization_id: reqUser.org_id },
      });

      if (!branch) {
        throw new HttpException('Branch not found.', StatusCode.NOT_FOUND);
      }

      if (reqUser.role === Role.DOCTOR || reqUser.role === Role.RECEPTIONIST) {
        if (!reqUser.branch_ids.includes(id)) {
          throw new HttpException('You do not have access to this branch.', StatusCode.FORBIDDEN);
        }
      }

      return {
        id: branch.id,
        name: branch.name,
        city: branch.city,
        state: branch.state,
        address: branch.address,
        phone: branch.phone,
        whatsapp_number: branch.whatsapp_number,
        color_code: branch.color_code,
        logo_url: branch.logo_url,
        is_active: branch.is_active,
        created_at: branch.created_at,
        updated_at: branch.updated_at,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[getBranchById] Error:`, error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async updateBranch(reqUser: any, id: string, dto: UpdateBranchDto) {
    try {
      if (reqUser.role !== Role.OWNER) {
        throw new HttpException('Only the clinic owner can update branch details.', StatusCode.FORBIDDEN);
      }

      if (
        dto.name === undefined &&
        dto.city === undefined &&
        dto.phone === undefined &&
        dto.address === undefined &&
        dto.state === undefined &&
        dto.whatsapp_number === undefined &&
        dto.color_code === undefined &&
        dto.logo_url === undefined
      ) {
        throw new HttpException('Provide at least one field to update.', StatusCode.BAD_REQUEST);
      }

      const branch = await this.branchModel.findOne({
        where: { id, organization_id: reqUser.org_id },
      });

      if (!branch) {
        throw new HttpException('Branch not found.', StatusCode.NOT_FOUND);
      }

      if (dto.name !== undefined && dto.name !== branch.name) {
        const existingBranch = await this.branchModel.findOne({
          where: {
            organization_id: reqUser.org_id,
            name: dto.name,
            id: { [Op.ne]: id },
          },
        });

        if (existingBranch) {
          throw new HttpException('Another branch with this name already exists.', StatusCode.CONFLICT);
        }
      }

      const updateData: any = {};
      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.city !== undefined) updateData.city = dto.city;
      if (dto.phone !== undefined) updateData.phone = dto.phone;
      if (dto.address !== undefined) updateData.address = dto.address;
      if (dto.state !== undefined) updateData.state = dto.state;
      if (dto.whatsapp_number !== undefined) updateData.whatsapp_number = dto.whatsapp_number;
      if (dto.color_code !== undefined) updateData.color_code = dto.color_code;
      if (dto.logo_url !== undefined) updateData.logo_url = dto.logo_url;

      await this.branchModel.update(updateData, { where: { id } });

      const updatedBranch = await this.branchModel.findByPk(id);

      return {
        id: updatedBranch!.id,
        name: updatedBranch!.name,
        city: updatedBranch!.city,
        state: updatedBranch!.state,
        address: updatedBranch!.address,
        phone: updatedBranch!.phone,
        whatsapp_number: updatedBranch!.whatsapp_number,
        color_code: updatedBranch!.color_code,
        logo_url: updatedBranch!.logo_url,
        is_active: updatedBranch!.is_active,
        created_at: updatedBranch!.created_at,
        updated_at: updatedBranch!.updated_at,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[updateBranch] Error:`, error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async updateBranchStatus(reqUser: any, id: string, dto: BranchStatusDto) {
    try {
      if (reqUser.role !== Role.OWNER) {
        throw new HttpException('Only the clinic owner can change branch status.', StatusCode.FORBIDDEN);
      }

      const branch = await this.branchModel.findOne({
        where: { id, organization_id: reqUser.org_id },
      });

      if (!branch) {
        throw new HttpException('Branch not found.', StatusCode.NOT_FOUND);
      }

      if (branch.is_active === dto.is_active) {
        throw new HttpException(`Branch is already ${dto.is_active ? 'active' : 'inactive'}.`, StatusCode.BAD_REQUEST);
      }

      await this.branchModel.update({ is_active: dto.is_active }, { where: { id } });

      return {
        id: branch.id,
        name: branch.name,
        is_active: dto.is_active,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[updateBranchStatus] Error:`, error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteBranch(reqUser: any, id: string) {
    const transaction = await this.sequelize.transaction();
    try {
      if (reqUser.role !== Role.OWNER) {
        throw new HttpException('Only the clinic owner can delete a branch.', StatusCode.FORBIDDEN);
      }

      const branch = await this.branchModel.findOne({
        where: { id, organization_id: reqUser.org_id },
      });

      if (!branch) {
        throw new HttpException('Branch not found.', StatusCode.NOT_FOUND);
      }

      // Check if it's the last remaining branch
      const totalBranches = await this.branchModel.count({
        where: { organization_id: reqUser.org_id },
      });

      if (totalBranches <= 1) {
        throw new HttpException('Cannot delete the last remaining branch of the organization.', StatusCode.BAD_REQUEST);
      }

      // Delete user branch assignments first
      await this.userBranchModel.destroy({ where: { branch_id: id }, transaction });

      // Then delete the branch
      await this.branchModel.destroy({ where: { id }, transaction });

      await transaction.commit();
      return true;
    } catch (error: any) {
      await transaction.rollback();
      if (error.name === 'SequelizeForeignKeyConstraintError') {
        throw new HttpException('Cannot delete this branch because it contains active patients, appointments, or billing records. Please deactivate it instead.', StatusCode.CONFLICT);
      }
      if (error instanceof HttpException) throw error;
      this.logger.error(`[deleteBranch] Error:`, error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }
}
