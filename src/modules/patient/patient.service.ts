import { Injectable, HttpException, Logger } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { StatusCode } from '../../common/enums/status-code.enum';
import { Patient } from './entities/patient.model';
import { Branch } from '../organization/entities/branch.model';
import { User } from '../auth/entities/user.model';
import { MedicalConditionMaster } from './entities/medical-condition-master.model';
import { PatientMedicalCondition } from './entities/patient-medical-condition.model';
import { Consultation } from '../consultation/entities/consultation.model';
import { DentalChartEntry } from '../consultation/entities/dental-chart-entry.model';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { UpdatePatientStatusDto } from './dto/update-patient-status.dto';
import { AddMedicalConditionDto } from './dto/add-medical-condition.dto';
import { CreateMedicalConditionDto } from './dto/create-medical-condition.dto';
import { UpdateMedicalConditionDto } from './dto/update-medical-condition.dto';
import { UpdateMedicalConditionStatusDto } from './dto/update-medical-condition-status.dto';
import { UpdatePatientMedicalConditionDto } from './dto/update-patient-medical-condition.dto';
import { Op } from 'sequelize';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class PatientService {
  private readonly logger = new Logger(PatientService.name);

  constructor(
    @InjectModel(Patient) private patientModel: typeof Patient,
    @InjectModel(Branch) private branchModel: typeof Branch,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(MedicalConditionMaster)
    private conditionMasterModel: typeof MedicalConditionMaster,
    @InjectModel(PatientMedicalCondition)
    private patientConditionModel: typeof PatientMedicalCondition,
    @InjectModel(Consultation) private consultationModel: typeof Consultation,
    @InjectModel(DentalChartEntry)
    private dentalChartEntryModel: typeof DentalChartEntry,
    @InjectConnection() private sequelize: Sequelize,
    private readonly subscriptionService: SubscriptionService,
  ) { }

  async createPatient(reqUser: any, dto: CreatePatientDto) {
    const transaction = await this.sequelize.transaction();
    try {
      const branch = await this.branchModel.findOne({
        where: {
          id: dto.registration_branch_id,
          organization_id: reqUser.org_id,
        },
        transaction,
      });

      if (!branch) {
        throw new HttpException(
          'Invalid branch selected.',
          StatusCode.BAD_REQUEST,
        );
      }

      const duplicateMobile = await this.patientModel.findOne({
        where: { mobile: dto.mobile, organization_id: reqUser.org_id },
        transaction,
      });

      if (duplicateMobile) {
        throw new HttpException(
          'A patient with this mobile number already exists.',
          StatusCode.CONFLICT,
        );
      }

      const count = await this.patientModel.count({
        where: { organization_id: reqUser.org_id },
        transaction,
      });

      // Check plan limits for patient creation
      await this.subscriptionService.checkFeatureLimits(
        reqUser.org_id,
        'max_patients',
        count,
        reqUser.sub,
      );

      const fileNumber = String(count + 1).padStart(6, '0');

      let age: number | null = null;
      if (dto.date_of_birth) {
        age = Math.floor(
          (Date.now() - new Date(dto.date_of_birth).getTime()) / 31557600000,
        );
      } else if (dto.age !== undefined) {
        age = dto.age;
      }

      const patient = await this.patientModel.create(
        {
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
          referred_by: dto.referred_by || null,
          referred_by_id: dto.referred_by_id || null,
          notes: dto.notes || null,
          total_phases: 0,
          is_active: true,
          created_by: reqUser.sub,
        },
        { transaction },
      );

      if (dto.medical_conditions && dto.medical_conditions.length > 0) {
        for (const conditionId of dto.medical_conditions) {
          const condition = await this.conditionMasterModel.findOne({
            where: {
              id: conditionId,
              is_active: true,
              [Op.or]: [
                { organization_id: null },
                { organization_id: reqUser.org_id },
              ],
            },
            transaction,
          });
          if (condition) {
            await this.patientConditionModel.create(
              {
                patient_id: patient.id,
                condition_id: conditionId,
                notes: null,
                recorded_by: reqUser.sub,
              },
              { transaction },
            );
          }
        }
      }

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
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getPatients(
    reqUser: any,
    filters: {
      search?: string;
      branch_id?: string;
      is_active?: string;
      page?: string;
      limit?: string;
    },
  ) {
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
          { file_number: { [Op.iLike]: `%${filters.search}%` } },
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
          has_previous: page > 1,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[getPatients] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
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

      const patientConditions = await this.patientConditionModel.findAll({
        where: { patient_id: id },
        include: [{ model: MedicalConditionMaster, attributes: ['id', 'name'] }],
      });

      const medical_conditions = patientConditions.map((pc: any) => ({
        id: pc.condition_id,
        name: pc.condition?.name || null,
      }));

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
        registration_branch: branch
          ? {
              id: branch.id,
              name: branch.name,
              city: branch.city,
              color_code: branch.color_code,
            }
          : null,
        created_by: user
          ? {
              id: user.id,
              first_name: user.first_name,
              last_name: user.last_name,
            }
          : null,
        medical_conditions,
        created_at: patient.created_at,
        updated_at: patient.updated_at,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[getPatientById] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updatePatient(reqUser: any, id: string, dto: UpdatePatientDto) {
    const transaction = await this.sequelize.transaction();
    try {
      const patient = await this.patientModel.findOne({
        where: { id, organization_id: reqUser.org_id },
        transaction,
      });

      if (!patient) {
        throw new HttpException('Patient not found.', StatusCode.NOT_FOUND);
      }

      if (Object.keys(dto).length === 0) {
        throw new HttpException(
          'Provide at least one field to update.',
          StatusCode.BAD_REQUEST,
        );
      }

      if (dto.mobile && dto.mobile !== patient.mobile) {
        const duplicateMobile = await this.patientModel.findOne({
          where: {
            mobile: dto.mobile,
            organization_id: reqUser.org_id,
            id: { [Op.ne]: id },
          },
          transaction,
        });

        if (duplicateMobile) {
          throw new HttpException(
            'This mobile number belongs to another patient.',
            StatusCode.CONFLICT,
          );
        }
      }

      const updateData: any = {};
      if (dto.first_name !== undefined) updateData.first_name = dto.first_name;
      if (dto.last_name !== undefined) updateData.last_name = dto.last_name;
      if (dto.mobile !== undefined) updateData.mobile = dto.mobile;
      if (dto.gender !== undefined) updateData.gender = dto.gender;
      if (dto.registration_branch_id !== undefined)
        updateData.branch_id = dto.registration_branch_id;
      if (dto.address !== undefined) updateData.address = dto.address;
      if (dto.city !== undefined) updateData.city = dto.city;
      if (dto.notes !== undefined) updateData.notes = dto.notes;
      if (dto.referred_by !== undefined) updateData.referred_by = dto.referred_by;
      if (dto.referred_by_id !== undefined) updateData.referred_by_id = dto.referred_by_id;

      if (dto.date_of_birth !== undefined) {
        updateData.date_of_birth = dto.date_of_birth;
        updateData.age = Math.floor(
          (Date.now() - new Date(dto.date_of_birth).getTime()) / 31557600000,
        );
      } else if (dto.age !== undefined) {
        updateData.age = dto.age;
      }

      await this.patientModel.update(updateData, { where: { id }, transaction });

      // Save medical conditions if provided in payload
      if (dto.medical_conditions !== undefined) {
        // Delete existing ones first
        await this.patientConditionModel.destroy({
          where: { patient_id: id },
          transaction,
        });

        // Insert new ones
        if (dto.medical_conditions && dto.medical_conditions.length > 0) {
          for (const conditionId of dto.medical_conditions) {
            const condition = await this.conditionMasterModel.findOne({
              where: {
                id: conditionId,
                is_active: true,
                [Op.or]: [
                  { organization_id: null },
                  { organization_id: reqUser.org_id },
                ],
              },
              transaction,
            });
            if (condition) {
              await this.patientConditionModel.create(
                {
                  patient_id: patient.id,
                  condition_id: conditionId,
                  notes: null,
                  recorded_by: reqUser.sub,
                },
                { transaction },
              );
            }
          }
        }
      }

      await transaction.commit();
      return await this.getPatientById(reqUser, id);
    } catch (error) {
      await transaction.rollback();
      if (error instanceof HttpException) throw error;
      this.logger.error(`[updatePatient] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updatePatientStatus(
    reqUser: any,
    id: string,
    dto: UpdatePatientStatusDto,
  ) {
    try {
      const patient = await this.patientModel.findOne({
        where: { id, organization_id: reqUser.org_id },
      });

      if (!patient) {
        throw new HttpException('Patient not found.', StatusCode.NOT_FOUND);
      }

      await patient.update({ is_active: dto.is_active });

      return {
        id: patient.id,
        file_number: patient.file_number,
        first_name: patient.first_name,
        last_name: patient.last_name,
        is_active: patient.is_active,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[updatePatientStatus] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getPatientMedicalConditions(reqUser: any, patientId: string) {
    try {
      const patient = await this.patientModel.findOne({
        where: { id: patientId, organization_id: reqUser.org_id },
      });

      if (!patient) {
        throw new HttpException('Patient not found.', StatusCode.NOT_FOUND);
      }

      const conditions = await this.patientConditionModel.findAll({
        where: { patient_id: patientId },
        include: [
          { model: MedicalConditionMaster, attributes: ['id', 'name'] },
          { model: User, attributes: ['id', 'first_name', 'last_name'] },
        ],
        order: [['created_at', 'DESC']],
      });

      return conditions.map((pc: any) => ({
        id: pc.id,
        condition_id: pc.condition_id,
        condition_name: pc.condition?.name || null,
        notes: pc.notes,
        recorded_by: pc.recorded_by_relation
          ? {
            id: pc.recorded_by_relation.id,
            first_name: pc.recorded_by_relation.first_name,
            last_name: pc.recorded_by_relation.last_name,
          }
          : null,
        created_at: pc.created_at,
      }));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[getPatientMedicalConditions] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async addPatientMedicalCondition(
    reqUser: any,
    patientId: string,
    dto: AddMedicalConditionDto,
  ) {
    try {
      const patient = await this.patientModel.findOne({
        where: { id: patientId, organization_id: reqUser.org_id },
      });

      if (!patient) {
        throw new HttpException('Patient not found.', StatusCode.NOT_FOUND);
      }

      const condition = await this.conditionMasterModel.findOne({
        where: {
          id: dto.condition_id,
          is_active: true,
          [Op.or]: [
            { organization_id: null },
            { organization_id: reqUser.org_id },
          ],
        },
      });

      if (!condition) {
        throw new HttpException(
          'Medical condition not found or not available for your organization.',
          StatusCode.NOT_FOUND,
        );
      }

      const existing = await this.patientConditionModel.findOne({
        where: { patient_id: patientId, condition_id: dto.condition_id },
      });

      if (existing) {
        throw new HttpException(
          'This condition is already assigned to the patient.',
          StatusCode.CONFLICT,
        );
      }

      const record = await this.patientConditionModel.create({
        patient_id: patientId,
        condition_id: dto.condition_id,
        notes: dto.notes || null,
        recorded_by: reqUser.sub,
      });

      return {
        id: record.id,
        condition_id: record.condition_id,
        condition_name: condition.name,
        notes: record.notes,
        created_at: record.created_at,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[addPatientMedicalCondition] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updatePatientMedicalCondition(
    reqUser: any,
    patientId: string,
    conditionId: string,
    dto: UpdatePatientMedicalConditionDto,
  ) {
    try {
      const patient = await this.patientModel.findOne({
        where: { id: patientId, organization_id: reqUser.org_id },
      });

      if (!patient) {
        throw new HttpException('Patient not found.', StatusCode.NOT_FOUND);
      }

      const record = await this.patientConditionModel.findOne({
        where: {
          patient_id: patientId,
          [Op.or]: [{ id: conditionId }, { condition_id: conditionId }],
        },
      });

      if (!record) {
        throw new HttpException(
          'Medical condition record not found for this patient.',
          StatusCode.NOT_FOUND,
        );
      }

      await record.update({
        notes: dto.notes !== undefined ? dto.notes : record.notes,
      });

      return {
        id: record.id,
        condition_id: record.condition_id,
        notes: record.notes,
        updated_at: record.updated_at,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[updatePatientMedicalCondition] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async removePatientMedicalCondition(
    reqUser: any,
    patientId: string,
    conditionId: string,
  ) {
    try {
      const patient = await this.patientModel.findOne({
        where: { id: patientId, organization_id: reqUser.org_id },
      });

      if (!patient) {
        throw new HttpException('Patient not found.', StatusCode.NOT_FOUND);
      }

      const deleted = await this.patientConditionModel.destroy({
        where: {
          patient_id: patientId,
          [Op.or]: [{ id: conditionId }, { condition_id: conditionId }],
        },
      });

      if (!deleted) {
        throw new HttpException(
          'Medical condition record not found for this patient.',
          StatusCode.NOT_FOUND,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[removePatientMedicalCondition] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getMedicalConditions(reqUser: any) {
    try {
      const conditions = await this.conditionMasterModel.findAll({
        where: {
          is_active: true,
          [Op.or]: [
            { organization_id: null },
            { organization_id: reqUser.org_id },
          ],
        },
        order: [['name', 'ASC']],
      });

      return conditions.map((c) => ({
        id: c.id,
        name: c.name,
        is_system: c.organization_id === null,
        is_active: c.is_active,
      }));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[getMedicalConditions] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createMedicalCondition(reqUser: any, dto: CreateMedicalConditionDto) {
    try {
      const duplicate = await this.conditionMasterModel.findOne({
        where: {
          name: { [Op.iLike]: dto.name.trim() },
          [Op.or]: [
            { organization_id: null },
            { organization_id: reqUser.org_id },
          ],
        },
      });

      if (duplicate) {
        throw new HttpException(
          'A condition with this name already exists.',
          StatusCode.CONFLICT,
        );
      }

      const condition = await this.conditionMasterModel.create({
        name: dto.name.trim(),
        organization_id: reqUser.org_id,
        is_active: true,
      });

      return {
        id: condition.id,
        name: condition.name,
        is_system: false,
        is_active: condition.is_active,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[createMedicalCondition] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateMedicalCondition(
    reqUser: any,
    id: string,
    dto: UpdateMedicalConditionDto,
  ) {
    try {
      const condition = await this.conditionMasterModel.findOne({
        where: { id, organization_id: reqUser.org_id },
      });

      if (!condition) {
        throw new HttpException(
          'Medical condition not found or you do not have permission to edit it.',
          StatusCode.NOT_FOUND,
        );
      }

      if (condition.organization_id === null) {
        throw new HttpException(
          'Cannot edit system default medical conditions.',
          StatusCode.FORBIDDEN,
        );
      }

      const duplicate = await this.conditionMasterModel.findOne({
        where: {
          name: { [Op.iLike]: dto.name.trim() },
          id: { [Op.ne]: id },
          [Op.or]: [
            { organization_id: null },
            { organization_id: reqUser.org_id },
          ],
        },
      });

      if (duplicate) {
        throw new HttpException(
          'A condition with this name already exists.',
          StatusCode.CONFLICT,
        );
      }

      await condition.update({ name: dto.name.trim() });

      return {
        id: condition.id,
        name: condition.name,
        is_system: false,
        is_active: condition.is_active,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[updateMedicalCondition] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateMedicalConditionStatus(
    reqUser: any,
    id: string,
    dto: UpdateMedicalConditionStatusDto,
  ) {
    try {
      const condition = await this.conditionMasterModel.findOne({
        where: { id, organization_id: reqUser.org_id },
      });

      if (!condition) {
        throw new HttpException(
          'Medical condition not found or you do not have permission to edit it.',
          StatusCode.NOT_FOUND,
        );
      }

      if (condition.organization_id === null) {
        throw new HttpException(
          'Cannot edit system default medical conditions.',
          StatusCode.FORBIDDEN,
        );
      }

      await condition.update({ is_active: dto.is_active });

      return {
        id: condition.id,
        name: condition.name,
        is_system: false,
        is_active: condition.is_active,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[updateMedicalConditionStatus] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteMedicalCondition(reqUser: any, id: string) {
    try {
      const condition = await this.conditionMasterModel.findOne({
        where: { id, organization_id: reqUser.org_id },
      });

      if (!condition) {
        throw new HttpException(
          'Medical condition not found or you do not have permission to delete it.',
          StatusCode.NOT_FOUND,
        );
      }

      if (condition.organization_id === null) {
        throw new HttpException(
          'Cannot delete system default medical conditions.',
          StatusCode.FORBIDDEN,
        );
      }

      const inUse = await this.patientConditionModel.count({
        where: { condition_id: id },
      });

      if (inUse > 0) {
        throw new HttpException(
          'Cannot delete this condition as it is used by patients.',
          StatusCode.CONFLICT,
        );
      }

      await condition.destroy();

      return true;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[deleteMedicalCondition] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getToothHistory(reqUser: any, patientId: string, tooth: string) {
    try {
      const patient = await this.patientModel.findOne({
        where: { id: patientId, organization_id: reqUser.org_id },
      });

      if (!patient) {
        throw new HttpException('Patient not found.', StatusCode.NOT_FOUND);
      }

      const history = await this.dentalChartEntryModel.findAll({
        where: { patient_id: patientId, tooth_number: tooth },
        order: [['created_at', 'DESC']],
        include: [
          {
            model: this.consultationModel,
            attributes: ['id', 'consultation_date', 'doctor_id'],
            include: [
              {
                model: this.userModel,
                as: 'doctor', // the alias in Consultation model is 'doctor' (BelongsTo(() => User))
                attributes: ['id', 'first_name', 'last_name'],
              },
            ],
          },
        ],
      });

      return history.map((entry: any) => ({
        id: entry.id,
        tooth_number: entry.tooth_number,
        condition: entry.condition,
        notes: entry.notes,
        consultation: entry.consultation
          ? {
            id: entry.consultation.id,
            consultation_date: entry.consultation.consultation_date,
            doctor: entry.consultation.doctor
              ? {
                id: entry.consultation.doctor.id,
                first_name: entry.consultation.doctor.first_name,
                last_name: entry.consultation.doctor.last_name,
              }
              : null,
          }
          : null,
        created_at: entry.created_at,
        updated_at: entry.updated_at,
      }));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[getToothHistory] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
