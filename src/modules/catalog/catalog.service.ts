import { Injectable, HttpException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { StatusCode } from '../../common/enums/status-code.enum';
import { Role } from '../../common/enums/role.enum';
import { ProcedureCatalog } from './entities/procedure-catalog.model';
import { CreateCatalogDto } from './dto/create-catalog.dto';
import { UpdateCatalogDto } from './dto/update-catalog.dto';
import { UpdateCatalogStatusDto } from './dto/update-catalog-status.dto';
import { Op } from 'sequelize';

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    @InjectModel(ProcedureCatalog) private catalogModel: typeof ProcedureCatalog,
  ) {}

  async getCatalog(reqUser: any, filters: { search?: string, is_active?: string, is_deleted?: string, page?: string, limit?: string }) {
    try {
      const page = parseInt(filters.page || '1', 10);
      const limit = parseInt(filters.limit || '10', 10);
      const offset = (page - 1) * limit;

      const whereClause: any = { organization_id: reqUser.org_id };

      if (filters.is_deleted !== undefined) {
        whereClause.is_deleted = filters.is_deleted === 'true';
      } else {
        whereClause.is_deleted = false;
      }

      if (filters.is_active !== undefined) {
        whereClause.is_active = filters.is_active === 'true';
      }

      if (filters.search) {
        whereClause.name = { [Op.iLike]: `%${filters.search}%` };
      }

      const { rows, count } = await this.catalogModel.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['created_at', 'ASC']],
      });

      const totalPages = Math.ceil(count / limit);

      const records = rows.map((item) => ({
        id: item.id,
        name: item.name,
        default_cost: item.default_cost,
        duration_minutes: item.duration_minutes,
        is_active: item.is_active,
        is_deleted: item.is_deleted,
        created_at: item.created_at,
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
      this.logger.error(`[getCatalog] Error:`, error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async createCatalog(reqUser: any, dto: CreateCatalogDto) {
    try {
      if (reqUser.role !== Role.OWNER && reqUser.role !== Role.BRANCH_ADMIN) {
        throw new HttpException('Only the clinic owner or branch admin can add procedures.', StatusCode.FORBIDDEN);
      }

      const existingProcedure = await this.catalogModel.findOne({
        where: {
          organization_id: reqUser.org_id,
          name: { [Op.iLike]: dto.name }
        },
      });

      if (existingProcedure) {
        if (existingProcedure.is_deleted) {
          await existingProcedure.update({
            name: dto.name,
            is_deleted: false,
            is_active: true,
            default_cost: dto.default_cost,
            duration_minutes: dto.duration_minutes ?? 30,
          });
          return {
            id: existingProcedure.id,
            name: existingProcedure.name,
            default_cost: existingProcedure.default_cost,
            duration_minutes: existingProcedure.duration_minutes,
            is_active: existingProcedure.is_active,
            created_at: existingProcedure.created_at,
          };
        } else {
          throw new HttpException('A procedure with this name already exists.', StatusCode.CONFLICT);
        }
      }

      const procedure = await this.catalogModel.create({
        organization_id: reqUser.org_id,
        name: dto.name,
        default_cost: dto.default_cost,
        duration_minutes: dto.duration_minutes ?? 30,
        is_active: true,
      });

      return {
        id: procedure.id,
        name: procedure.name,
        default_cost: procedure.default_cost,
        duration_minutes: procedure.duration_minutes,
        is_active: procedure.is_active,
        created_at: procedure.created_at,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[createCatalog] Error:`, error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async updateCatalog(reqUser: any, id: string, dto: UpdateCatalogDto) {
    try {
      if (reqUser.role !== Role.OWNER && reqUser.role !== Role.BRANCH_ADMIN) {
        throw new HttpException('Only the clinic owner or branch admin can update procedures.', StatusCode.FORBIDDEN);
      }

      const procedure = await this.catalogModel.findOne({
        where: { id, organization_id: reqUser.org_id },
      });

      if (!procedure) {
        throw new HttpException('Procedure not found.', StatusCode.NOT_FOUND);
      }

      if (dto.name && dto.name.toLowerCase() !== procedure.name.toLowerCase()) {
        const existingProcedure = await this.catalogModel.findOne({
          where: {
            organization_id: reqUser.org_id,
            name: { [Op.iLike]: dto.name },
            id: { [Op.ne]: id },
            is_deleted: false
          },
        });

        if (existingProcedure) {
          throw new HttpException('A procedure with this name already exists.', StatusCode.CONFLICT);
        }
      }

      await procedure.update({
        name: dto.name ?? procedure.name,
        default_cost: dto.default_cost ?? procedure.default_cost,
        duration_minutes: dto.duration_minutes ?? procedure.duration_minutes,
      });

      return {
        id: procedure.id,
        name: procedure.name,
        default_cost: procedure.default_cost,
        duration_minutes: procedure.duration_minutes,
        is_active: procedure.is_active,
        updated_at: procedure.updated_at,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[updateCatalog] Error:`, error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async updateCatalogStatus(reqUser: any, id: string, dto: UpdateCatalogStatusDto) {
    try {
      if (reqUser.role !== Role.OWNER && reqUser.role !== Role.BRANCH_ADMIN) {
        throw new HttpException('Only the clinic owner or branch admin can update procedure status.', StatusCode.FORBIDDEN);
      }

      const procedure = await this.catalogModel.findOne({
        where: { id, organization_id: reqUser.org_id },
      });

      if (!procedure) {
        throw new HttpException('Procedure not found.', StatusCode.NOT_FOUND);
      }

      await procedure.update({ is_active: dto.is_active });

      return {
        id: procedure.id,
        is_active: procedure.is_active,
        updated_at: procedure.updated_at,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[updateCatalogStatus] Error:`, error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteCatalog(reqUser: any, id: string) {
    try {
      if (reqUser.role !== Role.OWNER && reqUser.role !== Role.BRANCH_ADMIN) {
        throw new HttpException('Only the clinic owner or branch admin can delete procedures.', StatusCode.FORBIDDEN);
      }

      const procedure = await this.catalogModel.findOne({
        where: { id, organization_id: reqUser.org_id },
      });

      if (!procedure) {
        throw new HttpException('Procedure not found.', StatusCode.NOT_FOUND);
      }

      await procedure.destroy();

      return true;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[deleteCatalog] Error:`, error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }
}
