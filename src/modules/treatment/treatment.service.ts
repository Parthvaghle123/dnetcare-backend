import { Injectable, HttpException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { StatusCode } from '../../common/enums/status-code.enum';
import { ErrorCode } from '../../common/enums/error-code.enum';

import { TreatmentPlan, TreatmentPlanStatus } from './entities/treatment-plan.model';
import { TreatmentPlanPhase, TreatmentPlanPhaseStatus } from './entities/treatment-plan-phase.model';
import { Patient } from '../patient/entities/patient.model';
import { Branch } from '../organization/entities/branch.model';
import { Consultation } from '../consultation/entities/consultation.model';
import { ProcedureCatalog } from '../catalog/entities/procedure-catalog.model';
import { User } from '../auth/entities/user.model';
import { Invoice } from '../billing/entities/invoice.model';

import { CreateTreatmentPlanDto } from './dto/create-treatment-plan.dto';
import { CreatePhaseDto } from './dto/create-phase.dto';

@Injectable()
export class TreatmentService {
  private readonly logger = new Logger(TreatmentService.name);

  constructor(
    @InjectModel(TreatmentPlan) private treatmentPlanModel: typeof TreatmentPlan,
    @InjectModel(TreatmentPlanPhase) private phaseModel: typeof TreatmentPlanPhase,
    @InjectModel(Patient) private patientModel: typeof Patient,
    @InjectModel(Branch) private branchModel: typeof Branch,
    @InjectModel(Consultation) private consultationModel: typeof Consultation,
    @InjectModel(ProcedureCatalog) private procedureModel: typeof ProcedureCatalog,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(Invoice) private invoiceModel: typeof Invoice,
    private sequelize: Sequelize,
  ) {}

  async createTreatmentPlan(user: any, dto: CreateTreatmentPlanDto) {
    const transaction = await this.sequelize.transaction();
    try {
      const patient = await this.patientModel.findOne({
        where: { id: dto.patient_id, organization_id: user.org_id },
        transaction,
      });
      if (!patient) throw new HttpException({ message: 'Patient not found.', error: ErrorCode.NOT_FOUND }, StatusCode.NOT_FOUND);

      const branch = await this.branchModel.findOne({
        where: { id: dto.branch_id, organization_id: user.org_id },
        transaction,
      });
      if (!branch) throw new HttpException({ message: 'Invalid branch.', error: ErrorCode.BAD_REQUEST }, StatusCode.BAD_REQUEST);

      const consultation = await this.consultationModel.findOne({
        where: { id: dto.consultation_id, organization_id: user.org_id, patient_id: dto.patient_id },
        transaction,
      });
      if (!consultation) throw new HttpException({ message: 'Invalid consultation.', error: ErrorCode.BAD_REQUEST }, StatusCode.BAD_REQUEST);

      if (!dto.phases || dto.phases.length === 0) {
        throw new HttpException({ message: 'At least one phase is required.', error: ErrorCode.BAD_REQUEST }, StatusCode.BAD_REQUEST);
      }

      for (let i = 0; i < dto.phases.length; i++) {
        const phase = dto.phases[i];
        if (phase.procedure_id) {
          const procedure = await this.procedureModel.findOne({
            where: { id: phase.procedure_id, organization_id: user.org_id, is_active: true },
            transaction,
          });
          if (!procedure) throw new HttpException({ message: `Invalid procedure selected in phase ${i}.`, error: ErrorCode.BAD_REQUEST }, StatusCode.BAD_REQUEST);
        }
      }

      let totalCost = 0;
      for (const phase of dto.phases) {
        const qty = phase.quantity || 1;
        const phaseCost = phase.cost * qty;
        const phaseDiscount = phase.discount || 0;
        totalCost += (phaseCost - phaseDiscount);
      }

      const planDiscount = dto.discount || 0;
      const finalCost = totalCost - planDiscount;

      if (finalCost < 0) {
        throw new HttpException({ message: 'Discount cannot exceed total cost.', error: ErrorCode.BAD_REQUEST }, StatusCode.BAD_REQUEST);
      }

      const total_phases = dto.total_phases ?? dto.phases.length;

      const plan = await this.treatmentPlanModel.create({
        organization_id: user.org_id,
        branch_id: dto.branch_id,
        patient_id: dto.patient_id,
        consultation_id: dto.consultation_id,
        created_by: user.sub,
        title: dto.title,
        notes: dto.notes || null,
        total_cost: totalCost,
        discount: planDiscount,
        final_cost: finalCost,
        total_phases: total_phases,
        status: TreatmentPlanStatus.ACTIVE,
      }, { transaction });

      for (let i = 0; i < dto.phases.length; i++) {
        const phase = dto.phases[i];
        await this.phaseModel.create({
          treatment_plan_id: plan.id,
          phase_number: i + 1,
          title: phase.title,
          procedure_id: phase.procedure_id || null,
          tooth_numbers: phase.tooth_numbers || null,
          quantity: phase.quantity || 1,
          cost: phase.cost,
          discount: phase.discount || 0,
          doctor_notes: phase.doctor_notes || null,
          status: TreatmentPlanPhaseStatus.PENDING,
          appointment_id: null,
          completed_at: null,
          completed_by: null,
        }, { transaction });
      }

      await transaction.commit();

      const createdPlan = await this.treatmentPlanModel.findOne({
        where: { id: plan.id },
      });
      const createdPhases = await this.phaseModel.findAll({
        where: { treatment_plan_id: plan.id },
        order: [['phase_number', 'ASC']],
      });

      return {
        id: createdPlan!.id,
        title: createdPlan!.title,
        notes: createdPlan!.notes,
        total_cost: createdPlan!.total_cost,
        discount: createdPlan!.discount,
        final_cost: createdPlan!.final_cost,
        total_phases: createdPlan!.total_phases,
        status: createdPlan!.status,
        patient_id: createdPlan!.patient_id,
        branch_id: createdPlan!.branch_id,
        consultation_id: createdPlan!.consultation_id,
        created_by: createdPlan!.created_by,
        phases: createdPhases.map(p => ({
          id: p.id,
          phase_number: p.phase_number,
          title: p.title,
          procedure_id: p.procedure_id,
          tooth_numbers: p.tooth_numbers,
          quantity: p.quantity,
          cost: p.cost,
          discount: p.discount,
          doctor_notes: p.doctor_notes,
          status: p.status,
          appointment_id: p.appointment_id,
          completed_at: p.completed_at,
          completed_by: p.completed_by,
          created_at: p.created_at,
        })),
        created_at: createdPlan!.created_at,
      };
    } catch (error) {
      await transaction.rollback();
      if (error instanceof HttpException) throw error;
      this.logger.error('[createTreatmentPlan] Error:', error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getTreatmentPlanById(user: any, id: string) {
    try {
      const plan = await this.treatmentPlanModel.findOne({
        where: { id, organization_id: user.org_id },
      });
      if (!plan) throw new HttpException({ message: 'Treatment plan not found.', error: ErrorCode.NOT_FOUND }, StatusCode.NOT_FOUND);

      const patient = await this.patientModel.findOne({
        where: { id: plan.patient_id },
        attributes: ['id', 'file_number', 'first_name', 'last_name', 'mobile', 'age'],
      });

      const branch = await this.branchModel.findOne({
        where: { id: plan.branch_id },
        attributes: ['id', 'name', 'city', 'color_code'],
      });

      const created_by = await this.userModel.findOne({
        where: { id: plan.created_by },
        attributes: ['id', 'first_name', 'last_name'],
      });

      const phasesData = await this.phaseModel.findAll({
        where: { treatment_plan_id: id },
        order: [['phase_number', 'ASC']],
      });

      const phases: any[] = [];
      for (const p of phasesData) {
        let procedure_name: string | null = null;
        if (p.procedure_id) {
          const proc = await this.procedureModel.findOne({ where: { id: p.procedure_id } });
          if (proc) procedure_name = proc.name;
        }

        let completed_by_user: any = null;
        if (p.completed_by) {
          const cuser = await this.userModel.findOne({ where: { id: p.completed_by }, attributes: ['id', 'first_name', 'last_name'] });
          if (cuser) completed_by_user = cuser;
        }

        phases.push({
          id: p.id,
          phase_number: p.phase_number,
          title: p.title,
          procedure_id: p.procedure_id,
          procedure_name,
          tooth_numbers: p.tooth_numbers,
          quantity: p.quantity,
          cost: p.cost,
          discount: p.discount,
          doctor_notes: p.doctor_notes,
          status: p.status,
          appointment_id: p.appointment_id,
          completed_at: p.completed_at,
          completed_by: completed_by_user,
          created_at: p.created_at,
          updated_at: p.updated_at,
        });
      }

      const invoices = await this.invoiceModel.findAll({
        where: { treatment_plan_id: id },
      });

      let paid_so_far = 0;
      let total_billed = 0;

      for (const inv of invoices) {
        if (inv.status !== 'CANCELLED') {
          paid_so_far += Number(inv.paid_amount || 0);
          total_billed += Number(inv.total || 0);
        }
      }

      const remaining = Number(plan.final_cost) - paid_so_far;

      return {
        id: plan.id,
        title: plan.title,
        notes: plan.notes,
        total_cost: plan.total_cost,
        discount: plan.discount,
        final_cost: plan.final_cost,
        total_phases: plan.total_phases,
        status: plan.status,
        payment_summary: {
          final_cost: plan.final_cost,
          paid_so_far,
          remaining,
        },
        patient,
        branch,
        created_by,
        phases,
        created_at: plan.created_at,
        updated_at: plan.updated_at,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('[getTreatmentPlanById] Error:', error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async addPhase(user: any, planId: string, dto: CreatePhaseDto) {
    try {
      const plan = await this.treatmentPlanModel.findOne({
        where: { id: planId, organization_id: user.org_id },
      });
      if (!plan) throw new HttpException({ message: 'Treatment plan not found.', error: ErrorCode.NOT_FOUND }, StatusCode.NOT_FOUND);

      if (plan.status !== TreatmentPlanStatus.ACTIVE) {
        throw new HttpException({ message: 'Cannot add phases to a plan that is not active.', error: ErrorCode.BAD_REQUEST }, StatusCode.BAD_REQUEST);
      }

      if (dto.procedure_id) {
        const procedure = await this.procedureModel.findOne({
          where: { id: dto.procedure_id, organization_id: user.org_id, is_active: true },
        });
        if (!procedure) throw new HttpException({ message: 'Invalid procedure selected.', error: ErrorCode.BAD_REQUEST }, StatusCode.BAD_REQUEST);
      }

      const maxPhase = await this.phaseModel.max('phase_number', {
        where: { treatment_plan_id: planId },
      });

      const new_phase_number = (maxPhase as number || 0) + 1;

      const phase = await this.phaseModel.create({
        treatment_plan_id: planId,
        phase_number: new_phase_number,
        title: dto.title,
        procedure_id: dto.procedure_id || null,
        tooth_numbers: dto.tooth_numbers || null,
        quantity: dto.quantity || 1,
        cost: dto.cost,
        discount: dto.discount || 0,
        doctor_notes: dto.doctor_notes || null,
        status: TreatmentPlanPhaseStatus.PENDING,
      });

      await this.treatmentPlanModel.increment('total_phases', {
        by: 1,
        where: { id: planId }
      });

      return {
        id: phase.id,
        phase_number: phase.phase_number,
        title: phase.title,
        procedure_id: phase.procedure_id,
        tooth_numbers: phase.tooth_numbers,
        quantity: phase.quantity,
        cost: phase.cost,
        discount: phase.discount,
        doctor_notes: phase.doctor_notes,
        status: phase.status,
        created_at: phase.created_at,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('[addPhase] Error:', error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async completePhase(user: any, planId: string, phaseId: string) {
    try {
      const plan = await this.treatmentPlanModel.findOne({
        where: { id: planId, organization_id: user.org_id },
      });
      if (!plan) throw new HttpException({ message: 'Treatment plan not found.', error: ErrorCode.NOT_FOUND }, StatusCode.NOT_FOUND);

      if (plan.status === TreatmentPlanStatus.CANCELLED) {
        throw new HttpException({ message: 'Cannot modify a cancelled treatment plan.', error: ErrorCode.BAD_REQUEST }, StatusCode.BAD_REQUEST);
      }

      const phase = await this.phaseModel.findOne({
        where: { id: phaseId, treatment_plan_id: planId },
      });
      if (!phase) throw new HttpException({ message: 'Phase not found.', error: ErrorCode.NOT_FOUND }, StatusCode.NOT_FOUND);

      if (phase.status === TreatmentPlanPhaseStatus.COMPLETED) {
        throw new HttpException({ message: 'This phase is already completed.', error: ErrorCode.BAD_REQUEST }, StatusCode.BAD_REQUEST);
      }
      if (phase.status === TreatmentPlanPhaseStatus.SKIPPED) {
        throw new HttpException({ message: 'Cannot complete a skipped phase.', error: ErrorCode.BAD_REQUEST }, StatusCode.BAD_REQUEST);
      }

      await phase.update({
        status: TreatmentPlanPhaseStatus.COMPLETED,
        completed_at: new Date(),
        completed_by: user.sub,
      });

      const allPhases = await this.phaseModel.findAll({
        where: { treatment_plan_id: planId },
      });

      const allDone = allPhases.every(p => p.status === TreatmentPlanPhaseStatus.COMPLETED || p.status === TreatmentPlanPhaseStatus.SKIPPED);

      if (allDone) {
        await plan.update({ status: TreatmentPlanStatus.COMPLETED });
      }

      const completedUser = await this.userModel.findOne({
        where: { id: user.sub },
        attributes: ['id', 'first_name', 'last_name'],
      });

      return {
        phase_id: phase.id,
        phase_number: phase.phase_number,
        title: phase.title,
        status: phase.status,
        completed_at: phase.completed_at,
        completed_by: completedUser,
        plan_status: allDone ? TreatmentPlanStatus.COMPLETED : plan.status,
        allDone
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('[completePhase] Error:', error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }
  async listTreatmentPlans(user: any, query: any) {
    try {
      const { patient_id, branch_id, status, page = 1, limit = 10 } = query;
      const offset = (Number(page) - 1) * Number(limit);

      const whereClause: any = { organization_id: user.org_id };

      if (patient_id) whereClause.patient_id = patient_id;
      if (branch_id) whereClause.branch_id = branch_id;
      if (status) whereClause.status = status;

      const { rows, count } = await this.treatmentPlanModel.findAndCountAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
        limit: Number(limit),
        offset: Number(offset),
        include: [
          { model: this.patientModel, attributes: ['id', 'file_number', 'first_name', 'last_name'] },
          { model: this.branchModel, attributes: ['id', 'name', 'color_code'] }
        ]
      });

      const items = await Promise.all(rows.map(async (row: any) => {
        const total_phases = await this.phaseModel.count({
          where: { treatment_plan_id: row.id }
        });
        const completed_phases = await this.phaseModel.count({
          where: { treatment_plan_id: row.id, status: TreatmentPlanPhaseStatus.COMPLETED }
        });

        const percentage = total_phases === 0 ? 0 : Math.round((completed_phases / total_phases) * 100);

        return {
          id: row.id,
          title: row.title,
          total_cost: row.total_cost,
          discount: row.discount,
          final_cost: row.final_cost,
          status: row.status,
          notes: row.notes,
          patient: row.patient,
          branch: row.branch,
          progress: {
            total_phases,
            completed_phases,
            percentage
          },
          created_at: row.created_at
        };
      }));

      return {
        items,
        meta: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          total_pages: Math.ceil(count / Number(limit))
        }
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[listTreatmentPlans] Error:`, error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }
}
