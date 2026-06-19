import { Injectable, HttpException, Logger } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { StatusCode } from '../../common/enums/status-code.enum';
import { Patient } from './entities/patient.model';
import { Branch } from '../organization/entities/branch.model';
import { User } from '../auth/entities/user.model';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { Op } from 'sequelize';

@Injectable()
export class PatientService {
  private readonly logger = new Logger(PatientService.name);

  constructor(
    @InjectModel(Patient) private patientModel: typeof Patient,
    @InjectModel(Branch) private branchModel: typeof Branch,
    @InjectModel(User) private userModel: typeof User,
    @InjectConnection() private sequelize: Sequelize,
  ) {}

  async createPatient(reqUser: any, dto: CreatePatientDto) {
    const transaction = await this.sequelize.transaction();
    try {
      const branch = await this.branchModel.findOne({
        where: { id: dto.registration_branch_id, organization_id: reqUser.org_id },
        transaction,
      });

      if (!branch) {
        throw new HttpException('Invalid branch selected.', StatusCode.BAD_REQUEST);
      }

      const duplicateMobile = await this.patientModel.findOne({
        where: { mobile: dto.mobile, organization_id: reqUser.org_id },
        transaction,
      });

      if (duplicateMobile) {
        throw new HttpException('A patient with this mobile number already exists.', StatusCode.CONFLICT);
      }

      const count = await this.patientModel.count({
        where: { organization_id: reqUser.org_id },
        transaction,
      });

      const fileNumber = String(count + 1).padStart(6, '0');

      let age: number | null = null;
      if (dto.date_of_birth) {
        age = Math.floor((Date.now() - new Date(dto.date_of_birth).getTime()) / 31557600000);
      } else if (dto.age !== undefined) {
        age = dto.age;
      }

      const patient = await this.patientModel.create({
        organization_id: reqUser.org_id,
        branch_id: dto.registration_branch_id,
        file_number: fileNumber,
        first_name: dto.first_name,
        last_name: dto.last_name,
        mobile: dto.mobile,
        date_of_birth: dto.date_of_birth || null,
        age: age,
        gender: dto.gender,
        address: dto.address || null,
        city: dto.city || null,
        notes: dto.notes || null,
        total_phases: 0,
        is_active: true,
        created_by: reqUser.sub,
      }, { transaction });

      await transaction.commit();

      return {
        id: patient.id,
        file_number: patient.file_number,
        first_name: patient.first_name,
        last_name: patient.last_name,
        mobile: patient.mobile,
        gender: patient.gender,
        date_of_birth: patient.date_of_birth,
        age: patient.age,
        address: patient.address,
        city: patient.city,
        notes: patient.notes,
        registration_branch_id: patient.branch_id,
        is_active: patient.is_active,
        created_at: patient.created_at,
      };
    } catch (error) {
      await transaction.rollback();
      if (error instanceof HttpException) throw error;
      this.logger.error(`[createPatient] Error:`, error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getPatients(reqUser: any, filters: { search?: string, branch_id?: string, is_active?: string, page?: string, limit?: string }) {
    try {
      const page = parseInt(filters.page || '1', 10);
      const limit = parseInt(filters.limit || '10', 10);
      const offset = (page - 1) * limit;

      const whereClause: any = { organization_id: reqUser.org_id };

      if (filters.is_active !== undefined) {
        whereClause.is_active = filters.is_active === 'true';
      } else {
        whereClause.is_active = true;
      }

      if (filters.branch_id) {
        whereClause.branch_id = filters.branch_id;
      }

      if (filters.search) {
        whereClause[Op.or] = [
          { first_name: { [Op.iLike]: `%${filters.search}%` } },
          { last_name: { [Op.iLike]: `%${filters.search}%` } },
          { mobile: { [Op.iLike]: `%${filters.search}%` } },
          { file_number: { [Op.iLike]: `%${filters.search}%` } }
        ];
      }

      const { rows, count } = await this.patientModel.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      const totalPages = Math.ceil(count / limit);

      const records = rows.map((patient) => ({
        id: patient.id,
        file_number: patient.file_number,
        first_name: patient.first_name,
        last_name: patient.last_name,
        mobile: patient.mobile,
        gender: patient.gender,
        age: patient.age,
        city: patient.city,
        is_active: patient.is_active,
        created_at: patient.created_at,
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
      this.logger.error(`[getPatients] Error:`, error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getPatientById(reqUser: any, id: string) {
    try {
      const patient = await this.patientModel.findOne({
        where: { id, organization_id: reqUser.org_id },
      });

      if (!patient) {
        throw new HttpException('Patient not found.', StatusCode.NOT_FOUND);
      }

      const branch = await this.branchModel.findByPk(patient.branch_id);
      const user = await this.userModel.findByPk(patient.created_by);

      return {
        id: patient.id,
        file_number: patient.file_number,
        first_name: patient.first_name,
        last_name: patient.last_name,
        mobile: patient.mobile,
        gender: patient.gender,
        date_of_birth: patient.date_of_birth,
        age: patient.age,
        address: patient.address,
        city: patient.city,
        notes: patient.notes,
        is_active: patient.is_active,
        registration_branch: branch ? {
          id: branch.id,
          name: branch.name,
          city: branch.city,
          color_code: branch.color_code,
        } : null,
        created_by: user ? {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
        } : null,
        created_at: patient.created_at,
        updated_at: patient.updated_at,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[getPatientById] Error:`, error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async updatePatient(reqUser: any, id: string, dto: UpdatePatientDto) {
    try {
      const patient = await this.patientModel.findOne({
        where: { id, organization_id: reqUser.org_id },
      });

      if (!patient) {
        throw new HttpException('Patient not found.', StatusCode.NOT_FOUND);
      }

      if (Object.keys(dto).length === 0) {
        throw new HttpException('Provide at least one field to update.', StatusCode.BAD_REQUEST);
      }

      if (dto.mobile && dto.mobile !== patient.mobile) {
        const duplicateMobile = await this.patientModel.findOne({
          where: { mobile: dto.mobile, organization_id: reqUser.org_id, id: { [Op.ne]: id } },
        });

        if (duplicateMobile) {
          throw new HttpException('This mobile number belongs to another patient.', StatusCode.CONFLICT);
        }
      }

      const updateData: any = {};
      if (dto.first_name !== undefined) updateData.first_name = dto.first_name;
      if (dto.last_name !== undefined) updateData.last_name = dto.last_name;
      if (dto.mobile !== undefined) updateData.mobile = dto.mobile;
      if (dto.gender !== undefined) updateData.gender = dto.gender;
      if (dto.registration_branch_id !== undefined) updateData.branch_id = dto.registration_branch_id;
      if (dto.address !== undefined) updateData.address = dto.address;
      if (dto.city !== undefined) updateData.city = dto.city;
      if (dto.notes !== undefined) updateData.notes = dto.notes;

      if (dto.date_of_birth !== undefined) {
        updateData.date_of_birth = dto.date_of_birth;
        updateData.age = Math.floor((Date.now() - new Date(dto.date_of_birth).getTime()) / 31557600000);
      } else if (dto.age !== undefined) {
        updateData.age = dto.age;
      }

      await this.patientModel.update(updateData, { where: { id } });

      return await this.getPatientById(reqUser, id);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[updatePatient] Error:`, error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }
}
