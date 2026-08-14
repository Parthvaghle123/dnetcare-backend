import { Injectable, HttpException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { StatusCode } from '../../common/enums/status-code.enum';
import { ErrorCode } from '../../common/enums/error-code.enum';

import {
  TreatmentPlan,
  TreatmentPlanStatus,
} from './entities/treatment-plan.model';
import {
  TreatmentPlanPhase,
  TreatmentPlanPhaseStatus,
} from './entities/treatment-plan-phase.model';
import { Patient } from '../patient/entities/patient.model';
import { Branch } from '../organization/entities/branch.model';
import { Consultation } from '../consultation/entities/consultation.model';
import { ProcedureCatalog } from '../catalog/entities/procedure-catalog.model';
import { User } from '../auth/entities/user.model';
import { Invoice, InvoiceStatus } from '../billing/entities/invoice.model';
import { InvoiceLineItem } from '../billing/entities/invoice-line-item.model';
import { DoctorProfile } from '../doctor/entities/doctor-profile.model';
import { Appointment } from '../appointment/entities/appointment.model';
import { Prescription } from '../prescription/entities/prescription.model';
import { Op } from 'sequelize';

import { CreateTreatmentPlanDto } from './dto/create-treatment-plan.dto';
import { CreatePhaseDto } from './dto/create-phase.dto';
import { UpdateTreatmentPlanDto } from './dto/update-treatment-plan.dto';
import { UpdateTreatmentPlanStatusDto } from './dto/update-treatment-plan-status.dto';
import { UpdatePhaseDto } from './dto/update-phase.dto';

@Injectable()
export class TreatmentService {
  private readonly logger = new Logger(TreatmentService.name);

  constructor(
    @InjectModel(TreatmentPlan)
    private treatmentPlanModel: typeof TreatmentPlan,
    @InjectModel(TreatmentPlanPhase)
    private phaseModel: typeof TreatmentPlanPhase,
    @InjectModel(Patient) private patientModel: typeof Patient,
    @InjectModel(Branch) private branchModel: typeof Branch,
    @InjectModel(Consultation) private consultationModel: typeof Consultation,
    @InjectModel(ProcedureCatalog)
    private procedureModel: typeof ProcedureCatalog,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(Invoice) private invoiceModel: typeof Invoice,
    @InjectModel(InvoiceLineItem)
    private invoiceLineItemModel: typeof InvoiceLineItem,
    @InjectModel(DoctorProfile)
    private doctorProfileModel: typeof DoctorProfile,
    private sequelize: Sequelize,
  ) {}

  async createTreatmentPlan(user: any, dto: CreateTreatmentPlanDto) {
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

      const branch = await this.branchModel.findOne({
        where: { id: dto.branch_id, organization_id: user.org_id },
        transaction,
      });
      if (!branch)
        throw new HttpException(
          { message: 'Invalid branch.', error: ErrorCode.BAD_REQUEST },
          StatusCode.BAD_REQUEST,
        );

      const consultation = await this.consultationModel.findOne({
        where: {
          id: dto.consultation_id,
          organization_id: user.org_id,
          patient_id: dto.patient_id,
        },
        transaction,
      });
      if (!consultation)
        throw new HttpException(
          { message: 'Invalid consultation.', error: ErrorCode.BAD_REQUEST },
          StatusCode.BAD_REQUEST,
        );

      if (!dto.phases || dto.phases.length === 0) {
        throw new HttpException(
          {
            message: 'At least one phase is required.',
            error: ErrorCode.BAD_REQUEST,
          },
          StatusCode.BAD_REQUEST,
        );
      }

      for (let i = 0; i < dto.phases.length; i++) {
        const phase = dto.phases[i];
        if (phase.procedure_id) {
          const procedure = await this.procedureModel.findOne({
            where: {
              id: phase.procedure_id,
              organization_id: user.org_id,
              is_active: true,
            },
            transaction,
          });
          if (!procedure)
            throw new HttpException(
              {
                message: `Invalid procedure selected in phase ${i}.`,
                error: ErrorCode.BAD_REQUEST,
              },
              StatusCode.BAD_REQUEST,
            );

          if (phase.cost === undefined) {
            phase.cost = Number(procedure.default_cost);
          }
        } else if (phase.cost === undefined) {
          phase.cost = 0;
        }
      }

      let totalCost = 0;
      for (const phase of dto.phases) {
        const qty = phase.quantity || 1;
        const phaseCost = (phase.cost || 0) * qty;
        const phaseDiscount = phase.discount || 0;
        totalCost += phaseCost - phaseDiscount;
      }

      const planDiscount = dto.discount || 0;
      const finalCost = totalCost - planDiscount;

      if (finalCost < 0) {
        throw new HttpException(
          {
            message: 'Discount cannot exceed total cost.',
            error: ErrorCode.BAD_REQUEST,
          },
          StatusCode.BAD_REQUEST,
        );
      }

      const total_phases = dto.total_phases ?? dto.phases.length;

      const plan = await this.treatmentPlanModel.create(
        {
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
        },
        { transaction },
      );

      for (let i = 0; i < dto.phases.length; i++) {
        const phase = dto.phases[i];
        await this.phaseModel.create(
          {
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
          },
          { transaction },
        );
      }

      await this.syncMasterInvoice(user, plan, transaction);

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
        phases: createdPhases.map((p) => ({
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
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTreatmentPlanById(user: any, id: string) {
    try {
      const plan = await this.treatmentPlanModel.findOne({
        where: { id, organization_id: user.org_id },
      });
      if (!plan)
        throw new HttpException(
          { message: 'Treatment plan not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );

      const patient = await this.patientModel.findOne({
        where: { id: plan.patient_id },
        attributes: [
          'id',
          'file_number',
          'first_name',
          'last_name',
          'mobile',
          'age',
        ],
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
          const proc = await this.procedureModel.findOne({
            where: { id: p.procedure_id },
          });
          if (proc) procedure_name = proc.name;
        }

        let completed_by_user: any = null;
        if (p.completed_by) {
          const cuser = await this.userModel.findOne({
            where: { id: p.completed_by },
            attributes: ['id', 'first_name', 'last_name'],
          });
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
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async addPhase(user: any, planId: string, dto: CreatePhaseDto) {
    const transaction = await this.sequelize.transaction();
    try {
      const plan = await this.treatmentPlanModel.findOne({
        where: { id: planId, organization_id: user.org_id },
        transaction,
      });
      if (!plan)
        throw new HttpException(
          { message: 'Treatment plan not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );

      if (plan.status !== TreatmentPlanStatus.ACTIVE) {
        throw new HttpException(
          {
            message: 'Cannot add phases to a plan that is not active.',
            error: ErrorCode.BAD_REQUEST,
          },
          StatusCode.BAD_REQUEST,
        );
      }

      if (dto.procedure_id) {
        const procedure = await this.procedureModel.findOne({
          where: {
            id: dto.procedure_id,
            organization_id: user.org_id,
            is_active: true,
          },
          transaction,
        });
        if (!procedure)
          throw new HttpException(
            {
              message: 'Invalid procedure selected.',
              error: ErrorCode.BAD_REQUEST,
            },
            StatusCode.BAD_REQUEST,
          );

        if (dto.cost === undefined) {
          dto.cost = Number(procedure.default_cost);
        }
      } else if (dto.cost === undefined) {
        dto.cost = 0;
      }

      const maxPhase = await this.phaseModel.max('phase_number', {
        where: { treatment_plan_id: planId },
        transaction,
      });

      const new_phase_number = ((maxPhase as number) || 0) + 1;

      const phase = await this.phaseModel.create(
        {
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
        },
        { transaction },
      );

      const allPhases = await this.phaseModel.findAll({
        where: { treatment_plan_id: planId },
        transaction,
      });

      let totalCost = 0;
      for (const p of allPhases) {
        const qty = p.quantity || 1;
        const phaseCost = Number(p.cost) * qty;
        const phaseDiscount = Number(p.discount) || 0;
        totalCost += phaseCost - phaseDiscount;
      }

      const finalCost = totalCost - Number(plan.discount || 0);

      await plan.update(
        {
          total_phases: allPhases.length,
          total_cost: totalCost,
          final_cost: finalCost < 0 ? 0 : finalCost,
        },
        { transaction },
      );

      await this.syncMasterInvoice(user, plan, transaction);
      await transaction.commit();

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
      await transaction.rollback();
      if (error instanceof HttpException) throw error;
      this.logger.error('[addPhase] Error:', error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async completePhase(user: any, planId: string, phaseId: string) {
    try {
      const plan = await this.treatmentPlanModel.findOne({
        where: { id: planId, organization_id: user.org_id },
      });
      if (!plan)
        throw new HttpException(
          { message: 'Treatment plan not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );

      if (plan.status === TreatmentPlanStatus.CANCELLED) {
        throw new HttpException(
          {
            message: 'Cannot modify a cancelled treatment plan.',
            error: ErrorCode.BAD_REQUEST,
          },
          StatusCode.BAD_REQUEST,
        );
      }

      const phase = await this.phaseModel.findOne({
        where: { id: phaseId, treatment_plan_id: planId },
      });
      if (!phase)
        throw new HttpException(
          { message: 'Phase not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );

      if (phase.status === TreatmentPlanPhaseStatus.COMPLETED) {
        throw new HttpException(
          {
            message: 'This phase is already completed.',
            error: ErrorCode.BAD_REQUEST,
          },
          StatusCode.BAD_REQUEST,
        );
      }
      if (phase.status === TreatmentPlanPhaseStatus.SKIPPED) {
        throw new HttpException(
          {
            message: 'Cannot complete a skipped phase.',
            error: ErrorCode.BAD_REQUEST,
          },
          StatusCode.BAD_REQUEST,
        );
      }

      await phase.update({
        status: TreatmentPlanPhaseStatus.COMPLETED,
        completed_at: new Date(),
        completed_by: user.sub,
      });

      const allPhases = await this.phaseModel.findAll({
        where: { treatment_plan_id: planId },
      });

      const allDone = allPhases.every(
        (p) =>
          p.status === TreatmentPlanPhaseStatus.COMPLETED ||
          p.status === TreatmentPlanPhaseStatus.SKIPPED,
      );

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
        allDone,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('[completePhase] Error:', error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async syncMasterInvoice(user: any, plan: any, transaction: any) {
    try {
      const phases = await this.phaseModel.findAll({
        where: { treatment_plan_id: plan.id },
        transaction,
        order: [['phase_number', 'ASC']],
      });

      let invoice = await this.invoiceModel.findOne({
        where: { treatment_plan_id: plan.id },
        transaction,
      });

      let docFee = 0;
      const targetDoctorId = plan.created_by;
      if (targetDoctorId) {
        const doctorProfile = await this.doctorProfileModel.findOne({
          where: { user_id: targetDoctorId },
          transaction,
        });
        if (doctorProfile && doctorProfile.default_consultation_fee) {
          docFee = Number(doctorProfile.default_consultation_fee);
        }
      }
      const consultationFee = docFee;

      let procedure_amount = 0;
      phases.forEach((p) => {
        const qty = p.quantity || 1;
        const cost = Number(p.cost) * qty - Number(p.discount || 0);
        procedure_amount += cost;
      });

      const subtotal = consultationFee + procedure_amount;
      const invoiceDiscount = Number(plan.discount || 0);
      const taxableAmount = subtotal - invoiceDiscount;
      const gstPercentage = invoice ? Number(invoice.gst_percentage || 0) : 0;
      const gstAmount = (taxableAmount * gstPercentage) / 100;
      const total = taxableAmount + gstAmount;

      if (!invoice) {
        const year = new Date().getFullYear();
        const count = await this.invoiceModel.count({
          where: {
            organization_id: user.org_id,
            invoice_number: { [Op.like]: `INV-${year}-%` },
          },
          transaction,
        });

        const sequence = count + 1;
        const invoiceNumber = `INV-${year}-${String(sequence).padStart(5, '0')}`;

        invoice = await this.invoiceModel.create(
          {
            organization_id: user.org_id,
            branch_id: plan.branch_id,
            patient_id: plan.patient_id,
            consultation_id: plan.consultation_id || null,
            treatment_plan_id: plan.id,
            invoice_number: invoiceNumber,
            invoice_date: new Date().toISOString().split('T')[0],
            consultation_fee: consultationFee,
            other_amount: 0,
            procedure_amount: procedure_amount,
            subtotal: subtotal,
            discount: invoiceDiscount,
            gst_percentage: gstPercentage,
            gst_amount: gstAmount,
            total: total,
            paid_amount: 0,
            pending_amount: total,
            status: InvoiceStatus.ISSUED,
            created_by: user.sub || user.id,
          },
          { transaction },
        );
      } else {
        const paid = Number(invoice.paid_amount || 0);
        let pending = total - paid;
        if (pending < 0) pending = 0;

        await invoice.update(
          {
            consultation_fee: consultationFee,
            procedure_amount,
            subtotal,
            discount: invoiceDiscount,
            total,
            pending_amount: pending,
          },
          { transaction },
        );

        await this.invoiceLineItemModel.destroy({
          where: { invoice_id: invoice.id },
          transaction,
        });
      }

      const lineItems = phases.map((p) => ({
        invoice_id: invoice.id,
        description: p.title
          ? `${p.title} - Phase ${p.phase_number}`
          : `Phase ${p.phase_number}`,
        procedure_id: p.procedure_id || null,
        plan_phase_id: p.id,
        tooth_numbers: p.tooth_numbers || null,
        quantity: p.quantity || 1,
        unit_cost: p.cost,
        discount: p.discount,
        subtotal: Number(p.cost) * (p.quantity || 1) - Number(p.discount || 0),
      }));

      if (lineItems.length > 0) {
        await this.invoiceLineItemModel.bulkCreate(lineItems, { transaction });
      }
    } catch (error) {
      this.logger.error(`[syncMasterInvoice] Error:`, error);
      throw error;
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
          {
            model: this.patientModel,
            attributes: ['id', 'file_number', 'first_name', 'last_name'],
          },
          { model: this.branchModel, attributes: ['id', 'name', 'color_code'] },
        ],
      });

      const items = await Promise.all(
        rows.map(async (row: any) => {
          const phasesData = await this.phaseModel.findAll({
            where: { treatment_plan_id: row.id },
            order: [['phase_number', 'ASC']],
          });
          const total_phases = phasesData.length;
          const completed_phases = phasesData.filter(
            (p) => p.status === TreatmentPlanPhaseStatus.COMPLETED,
          ).length;

          const percentage =
            total_phases === 0
              ? 0
              : Math.round((completed_phases / total_phases) * 100);

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
              percentage,
            },
            phases: phasesData.map((p) => ({
              id: p.id,
              phase_number: p.phase_number,
              title: p.title,
              status: p.status,
            })),
            created_at: row.created_at,
          };
        }),
      );

      return {
        items,
        meta: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          total_pages: Math.ceil(count / Number(limit)),
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[listTreatmentPlans] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateTreatmentPlan(
    user: any,
    id: string,
    dto: UpdateTreatmentPlanDto,
  ) {
    const transaction = await this.sequelize.transaction();
    try {
      const plan = await this.treatmentPlanModel.findOne({
        where: { id, organization_id: user.org_id },
        transaction,
      });
      if (!plan)
        throw new HttpException(
          { message: 'Treatment plan not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );

      let finalCost = plan.final_cost;
      if (dto.discount !== undefined) {
        finalCost = Number(plan.total_cost) - Number(dto.discount);
        if (finalCost < 0) {
          throw new HttpException(
            {
              message: 'Discount cannot exceed total cost.',
              error: ErrorCode.BAD_REQUEST,
            },
            StatusCode.BAD_REQUEST,
          );
        }
      }

      await plan.update(
        {
          title: dto.title ?? plan.title,
          notes: dto.notes ?? plan.notes,
          discount: dto.discount ?? plan.discount,
          final_cost: finalCost,
        },
        { transaction },
      );

      await this.syncMasterInvoice(user, plan, transaction);
      await transaction.commit();

      return {
        id: plan.id,
        title: plan.title,
        notes: plan.notes,
        total_cost: plan.total_cost,
        discount: plan.discount,
        final_cost: plan.final_cost,
      };
    } catch (error) {
      await transaction.rollback();
      if (error instanceof HttpException) throw error;
      this.logger.error('[updateTreatmentPlan] Error:', error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateTreatmentPlanStatus(
    user: any,
    id: string,
    dto: UpdateTreatmentPlanStatusDto,
  ) {
    try {
      const plan = await this.treatmentPlanModel.findOne({
        where: { id, organization_id: user.org_id },
      });
      if (!plan)
        throw new HttpException(
          { message: 'Treatment plan not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );

      await plan.update({ status: dto.status });

      return {
        id: plan.id,
        status: plan.status,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('[updateTreatmentPlanStatus] Error:', error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async listPhases(user: any, planId: string) {
    try {
      const plan = await this.treatmentPlanModel.findOne({
        where: { id: planId, organization_id: user.org_id },
      });
      if (!plan)
        throw new HttpException(
          { message: 'Treatment plan not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );

      const phasesData = await this.phaseModel.findAll({
        where: { treatment_plan_id: planId },
        order: [['phase_number', 'ASC']],
      });

      return phasesData.map((p) => ({
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
      }));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('[listPhases] Error:', error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updatePhase(
    user: any,
    planId: string,
    phaseId: string,
    dto: UpdatePhaseDto,
  ) {
    const transaction = await this.sequelize.transaction();
    try {
      const plan = await this.treatmentPlanModel.findOne({
        where: { id: planId, organization_id: user.org_id },
        transaction,
      });
      if (!plan)
        throw new HttpException(
          { message: 'Treatment plan not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );

      const phase = await this.phaseModel.findOne({
        where: { id: phaseId, treatment_plan_id: planId },
        transaction,
      });
      if (!phase)
        throw new HttpException(
          { message: 'Phase not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );

      if (dto.procedure_id) {
        const procedure = await this.procedureModel.findOne({
          where: {
            id: dto.procedure_id,
            organization_id: user.org_id,
            is_active: true,
          },
          transaction,
        });
        if (!procedure)
          throw new HttpException(
            {
              message: 'Invalid procedure selected.',
              error: ErrorCode.BAD_REQUEST,
            },
            StatusCode.BAD_REQUEST,
          );

        if (dto.cost === undefined) {
          dto.cost = Number(procedure.default_cost);
        }
      }

      await phase.update(
        {
          title: dto.title ?? phase.title,
          procedure_id: dto.procedure_id ?? phase.procedure_id,
          tooth_numbers: dto.tooth_numbers ?? phase.tooth_numbers,
          quantity: dto.quantity ?? phase.quantity,
          cost: dto.cost ?? phase.cost,
          discount: dto.discount ?? phase.discount,
          doctor_notes: dto.doctor_notes ?? phase.doctor_notes,
        },
        { transaction },
      );

      // Recalculate plan total_cost
      const allPhases = await this.phaseModel.findAll({
        where: { treatment_plan_id: planId },
        transaction,
      });

      let totalCost = 0;
      for (const p of allPhases) {
        const qty = p.quantity || 1;
        const phaseCost = Number(p.cost) * qty;
        const phaseDiscount = Number(p.discount) || 0;
        totalCost += phaseCost - phaseDiscount;
      }

      const finalCost = totalCost - Number(plan.discount || 0);

      if (finalCost < 0) {
        throw new HttpException(
          {
            message: 'Plan discount exceeds total cost.',
            error: ErrorCode.BAD_REQUEST,
          },
          StatusCode.BAD_REQUEST,
        );
      }

      await plan.update(
        {
          total_cost: totalCost,
          final_cost: finalCost,
        },
        { transaction },
      );

      await this.syncMasterInvoice(user, plan, transaction);

      await transaction.commit();

      return {
        id: phase.id,
        title: phase.title,
        cost: phase.cost,
        discount: phase.discount,
        quantity: phase.quantity,
        total_cost: totalCost,
        final_cost: finalCost,
      };
    } catch (error) {
      await transaction.rollback();
      if (error instanceof HttpException) throw error;
      this.logger.error('[updatePhase] Error:', error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async removePhase(user: any, planId: string, phaseId: string) {
    const transaction = await this.sequelize.transaction();
    try {
      const plan = await this.treatmentPlanModel.findOne({
        where: { id: planId, organization_id: user.org_id },
        transaction,
      });
      if (!plan)
        throw new HttpException(
          { message: 'Treatment plan not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );

      const phase = await this.phaseModel.findOne({
        where: { id: phaseId, treatment_plan_id: planId },
        transaction,
      });
      if (!phase)
        throw new HttpException(
          { message: 'Phase not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );

      if (phase.status === TreatmentPlanPhaseStatus.COMPLETED) {
        throw new HttpException(
          {
            message: 'Cannot remove a completed phase.',
            error: ErrorCode.BAD_REQUEST,
          },
          StatusCode.BAD_REQUEST,
        );
      }

      await phase.destroy({ transaction });

      // Recalculate plan costs and total_phases
      const allPhases = await this.phaseModel.findAll({
        where: { treatment_plan_id: planId },
        order: [['phase_number', 'ASC']],
        transaction,
      });

      let totalCost = 0;
      for (let i = 0; i < allPhases.length; i++) {
        const p = allPhases[i];
        if (p.phase_number !== i + 1) {
          await p.update({ phase_number: i + 1 }, { transaction });
        }

        const qty = p.quantity || 1;
        const phaseCost = Number(p.cost) * qty;
        const phaseDiscount = Number(p.discount) || 0;
        totalCost += phaseCost - phaseDiscount;
      }

      const finalCost = totalCost - Number(plan.discount || 0);

      await plan.update(
        {
          total_phases: allPhases.length,
          total_cost: totalCost,
          final_cost: finalCost < 0 ? 0 : finalCost,
        },
        { transaction },
      );

      await this.syncMasterInvoice(user, plan, transaction);

      await transaction.commit();

      return {
        total_phases: allPhases.length,
        total_cost: totalCost,
        final_cost: finalCost < 0 ? 0 : finalCost,
      };
    } catch (error) {
      await transaction.rollback();
      if (error instanceof HttpException) throw error;
      this.logger.error('[removePhase] Error:', error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteTreatmentPlan(user: any, id: string) {
    const transaction = await this.sequelize.transaction();
    try {
      const plan = await this.treatmentPlanModel.findOne({
        where: { id, organization_id: user.org_id },
        transaction,
      });

      if (!plan) {
        throw new HttpException(
          { message: 'Treatment plan not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );
      }

      // Find all phases for this treatment plan
      const phases = await this.phaseModel.findAll({
        where: { treatment_plan_id: id },
        transaction,
      });

      const phaseIds = phases.map(p => p.id);

      if (phaseIds.length > 0) {
        // Nullify plan_phase_id in InvoiceLineItems
        await this.invoiceLineItemModel.update(
          { plan_phase_id: null },
          { where: { plan_phase_id: { [Op.in]: phaseIds } }, transaction }
        );

        // Nullify plan_phase_id in Appointments
        await Appointment.update(
          { plan_phase_id: null },
          { where: { plan_phase_id: { [Op.in]: phaseIds } }, transaction }
        );

        // Nullify treatment_plan_phase_id in Prescriptions
        await Prescription.update(
          { treatment_plan_phase_id: null },
          { where: { treatment_plan_phase_id: { [Op.in]: phaseIds } }, transaction }
        );

        // Delete all phases
        await this.phaseModel.destroy({
          where: { treatment_plan_id: id },
          transaction,
        });
      }

      // Nullify treatment_plan_id in Invoices
      await this.invoiceModel.update(
        { treatment_plan_id: null },
        { where: { treatment_plan_id: id, organization_id: user.org_id }, transaction }
      );

      // Nullify treatment_plan_id in Appointments
      await Appointment.update(
        { treatment_plan_id: null },
        { where: { treatment_plan_id: id }, transaction }
      );

      // Delete the treatment plan itself
      await plan.destroy({ transaction });

      await transaction.commit();
      return { message: 'Treatment plan deleted successfully.' };
    } catch (error) {
      await transaction.rollback();
      if (error instanceof HttpException) throw error;
      this.logger.error(`[deleteTreatmentPlan] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
