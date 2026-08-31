import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Injectable, HttpException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { StatusCode } from '../../common/enums/status-code.enum';
import { ErrorCode } from '../../common/enums/error-code.enum';

import { Consultation } from './entities/consultation.model';
import { DentalChartEntry } from './entities/dental-chart-entry.model';
import { ConsultationDocument } from './entities/consultation-document.model';
import { Patient } from '../patient/entities/patient.model';
import { Branch } from '../organization/entities/branch.model';
import { User } from '../auth/entities/user.model';
import { Role } from '../../common/enums/role.enum';

import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import { BulkDentalChartDto } from './dto/dental-chart.dto';
import { BulkConsultationDocumentDto } from './dto/consultation-document.dto';
import { UploadService } from '../upload/upload.service';
import { TreatmentPlan } from '../treatment/entities/treatment-plan.model';
import { TreatmentPlanPhase } from '../treatment/entities/treatment-plan-phase.model';
import { Invoice } from '../billing/entities/invoice.model';
import { InvoiceLineItem } from '../billing/entities/invoice-line-item.model';
import { Payment } from '../billing/entities/payment.model';
import { Appointment } from '../appointment/entities/appointment.model';
import { AppointmentStatusHistory } from '../appointment/entities/appointment-status-history.model';
import { Prescription } from '../prescription/entities/prescription.model';
import { PrescriptionMedicine } from '../prescription/entities/prescription-medicine.model';

@Injectable()
export class ConsultationService {
  private readonly logger = new Logger(ConsultationService.name);

  constructor(
    @InjectModel(Consultation) private consultationModel: typeof Consultation,
    @InjectModel(DentalChartEntry)
    private dentalChartEntryModel: typeof DentalChartEntry,
    @InjectModel(ConsultationDocument)
    private consultationDocModel: typeof ConsultationDocument,
    @InjectModel(Patient) private patientModel: typeof Patient,
    @InjectModel(Branch) private branchModel: typeof Branch,
    @InjectModel(User) private userModel: typeof User,
    private uploadService: UploadService,
    private sequelize: Sequelize,
  ) {}

  async createConsultation(user: any, dto: CreateConsultationDto) {
    try {
      const patient = await this.patientModel.findOne({
        where: { id: dto.patient_id, organization_id: user.org_id },
      });
      if (!patient) {
        throw new HttpException(
          { message: 'Patient not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );
      }

      const branch = await this.branchModel.findOne({
        where: { id: dto.branch_id, organization_id: user.org_id },
      });
      if (!branch) {
        throw new HttpException(
          { message: 'Invalid branch.', error: ErrorCode.BAD_REQUEST },
          StatusCode.BAD_REQUEST,
        );
      }

      const doctor = await this.userModel.findOne({
        where: {
          id: dto.doctor_id,
          organization_id: user.org_id,
          role: { [Op.in]: [Role.DOCTOR, Role.OWNER, Role.BRANCH_ADMIN] },
        },
      });
      if (!doctor) {
        throw new HttpException(
          { message: 'Invalid doctor selected.', error: ErrorCode.BAD_REQUEST },
          StatusCode.BAD_REQUEST,
        );
      }

      let linkedAppointmentId = dto.appointment_id || null;
      if (!linkedAppointmentId) {
        const sequelize = this.consultationModel.sequelize;
        if (sequelize) {
          const Appointment = sequelize.models.Appointment;
          if (Appointment) {
            let activeApt = await Appointment.findOne({
              where: {
                patient_id: dto.patient_id,
                branch_id: dto.branch_id,
                doctor_id: dto.doctor_id,
                status: { [Op.in]: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
              },
              order: [['scheduled_at', 'ASC']],
            });

            if (!activeApt) {
              activeApt = await Appointment.findOne({
                where: {
                  patient_id: dto.patient_id,
                  status: {
                    [Op.in]: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'],
                  },
                },
                order: [['scheduled_at', 'ASC']],
              });
            }

            if (activeApt) {
              linkedAppointmentId = (activeApt as any).id;
            }
          }
        }
      }

      const consultation = await this.consultationModel.create({
        organization_id: user.org_id,
        branch_id: dto.branch_id,
        patient_id: dto.patient_id,
        doctor_id: dto.doctor_id,
        appointment_id: linkedAppointmentId,
        consultation_date: dto.consultation_date,
        dental_chart_type: dto.dental_chart_type || 'ADULT',
        chief_complaint: dto.chief_complaint || null,
        clinical_findings: dto.clinical_findings || null,
        diagnosis: dto.diagnosis || null,
        advice: dto.advice || null,
        notes_upper: dto.notes_upper || null,
        notes_lower: dto.notes_lower || null,
        follow_up_date: dto.follow_up_date || null,
        is_completed: false,
      });

      return consultation;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[createConsultation] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getConsultationById(user: any, id: string) {
    try {
      const consultation = await this.consultationModel.findOne({
        where: { id, organization_id: user.org_id },
      });

      if (!consultation) {
        throw new HttpException(
          { message: 'Consultation not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );
      }

      const patient = await this.patientModel.findOne({
        where: { id: consultation.patient_id },
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
        where: { id: consultation.doctor_id },
        attributes: ['id', 'first_name', 'last_name', 'role'],
      });

      const branch = await this.branchModel.findOne({
        where: { id: consultation.branch_id },
        attributes: ['id', 'name', 'city', 'color_code'],
      });

      const dental_chart = await this.dentalChartEntryModel.findAll({
        where: { consultation_id: id },
        order: [['created_at', 'ASC']],
        attributes: [
          'id',
          'tooth_number',
          'condition',
          'notes',
          'color',
          'created_at',
        ],
      });

      const documents = await this.consultationDocModel.findAll({
        where: { consultation_id: id },
        order: [['created_at', 'ASC']],
        attributes: ['id', 'file_url', 'file_name', 'file_type', 'created_at'],
      });

      return {
        id: consultation.id,
        consultation_date: consultation.consultation_date,
        dental_chart_type: consultation.dental_chart_type,
        chief_complaint: consultation.chief_complaint,
        clinical_findings: consultation.clinical_findings,
        diagnosis: consultation.diagnosis,
        advice: consultation.advice,
        notes_upper: consultation.notes_upper,
        notes_lower: consultation.notes_lower,
        follow_up_date: consultation.follow_up_date,
        is_completed: consultation.is_completed,
        patient,
        doctor,
        created_by: doctor,
        branch,
        dental_chart,
        documents,
        created_at: consultation.created_at,
        updated_at: consultation.updated_at,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[getConsultationById] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateConsultation(user: any, id: string, dto: UpdateConsultationDto) {
    try {
      const consultation = await this.consultationModel.findOne({
        where: { id, organization_id: user.org_id },
      });

      if (!consultation) {
        throw new HttpException(
          { message: 'Consultation not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );
      }

      if (consultation.is_completed) {
        throw new HttpException(
          {
            message: 'Cannot edit a completed consultation.',
            error: ErrorCode.BAD_REQUEST,
          },
          StatusCode.BAD_REQUEST,
        );
      }

      if (Object.keys(dto).length === 0) {
        throw new HttpException(
          {
            message: 'Provide at least one field to update.',
            error: ErrorCode.BAD_REQUEST,
          },
          StatusCode.BAD_REQUEST,
        );
      }

      const updateData: any = {};
      const allowedFields = [
        'chief_complaint',
        'clinical_findings',
        'diagnosis',
        'advice',
        'notes_upper',
        'notes_lower',
        'follow_up_date',
        'dental_chart_type',
        'consultation_date',
        'is_completed',
      ];

      for (const field of allowedFields) {
        if (dto[field as keyof UpdateConsultationDto] !== undefined) {
          updateData[field] = dto[field as keyof UpdateConsultationDto];
        }
      }

      await consultation.update(updateData);

      // Return the updated data using the existing getConsultationById
      return await this.getConsultationById(user, id);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[updateConsultation] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async addDentalChartEntry(user: any, id: string, dto: BulkDentalChartDto) {
    try {
      const consultation = await this.consultationModel.findOne({
        where: { id, organization_id: user.org_id },
      });

      if (!consultation) {
        throw new HttpException(
          { message: 'Consultation not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );
      }

      if (consultation.is_completed) {
        throw new HttpException(
          {
            message: 'Cannot modify chart of a completed consultation.',
            error: ErrorCode.BAD_REQUEST,
          },
          StatusCode.BAD_REQUEST,
        );
      }

      const results: any[] = [];

      for (const item of dto.entries) {
        let entry = await this.dentalChartEntryModel.findOne({
          where: {
            consultation_id: id,
            tooth_number: item.tooth_number,
            condition: item.condition,
          },
        });

        if (entry) {
          await entry.update({
            notes: item.notes || null,
            color: item.color || null,
          });
        } else {
          entry = await this.dentalChartEntryModel.create({
            consultation_id: id,
            patient_id: consultation.patient_id,
            tooth_number: item.tooth_number,
            condition: item.condition,
            notes: item.notes || null,
            color: item.color || null,
          });
        }

        results.push({
          id: entry.id,
          tooth_number: entry.tooth_number,
          condition: entry.condition,
          notes: entry.notes,
          color: entry.color,
          created_at: entry.created_at,
          updated_at: entry.updated_at,
        });
      }

      return results;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[addDentalChartEntry] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async addDocument(user: any, id: string, dto: BulkConsultationDocumentDto) {
    try {
      const consultation = await this.consultationModel.findOne({
        where: { id, organization_id: user.org_id },
      });

      if (!consultation) {
        throw new HttpException(
          { message: 'Consultation not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );
      }

      const validTypes = ['XRAY', 'INTRAORAL_PHOTO', 'LAB_REPORT', 'OTHER'];
      const results: any[] = [];

      for (const item of dto.documents) {
        if (!validTypes.includes(item.file_type)) {
          throw new HttpException(
            {
              message: `Invalid file type: ${item.file_type}`,
              error: ErrorCode.BAD_REQUEST,
            },
            StatusCode.BAD_REQUEST,
          );
        }

        const document = await this.consultationDocModel.create({
          organization_id: user.org_id,
          consultation_id: id,
          patient_id: consultation.patient_id,
          file_url: item.file_url,
          file_key: item.file_key,
          file_name: item.file_name,
          file_type: item.file_type,
          uploaded_by: user.sub,
        });

        results.push({
          id: document.id,
          file_url: document.file_url,
          file_name: document.file_name,
          file_type: document.file_type,
          uploaded_by: document.uploaded_by,
          created_at: document.created_at,
        });
      }

      return results;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[addDocument] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async listConsultations(user: any, query: any) {
    try {
      const {
        patient_id,
        branch_id,
        doctor_id,
        date_from,
        date_to,
        is_completed,
        page = 1,
        limit = 10,
      } = query;
      const offset = (Number(page) - 1) * Number(limit);

      const whereClause: any = { organization_id: user.org_id };

      if (patient_id) whereClause.patient_id = patient_id;
      if (branch_id) whereClause.branch_id = branch_id;
      if (doctor_id) whereClause.doctor_id = doctor_id;

      if (is_completed !== undefined) {
        whereClause.is_completed =
          is_completed === 'true' || is_completed === true;
      }

      if (date_from && date_to) {
        whereClause.consultation_date = { [Op.between]: [date_from, date_to] };
      } else if (date_from) {
        whereClause.consultation_date = { [Op.gte]: date_from };
      } else if (date_to) {
        whereClause.consultation_date = { [Op.lte]: date_to };
      }

      const { rows, count } = await this.consultationModel.findAndCountAll({
        where: whereClause,
        order: [['consultation_date', 'DESC']],
        limit: Number(limit),
        offset: Number(offset),
        include: [
          {
            model: this.patientModel,
            attributes: ['id', 'file_number', 'first_name', 'last_name'],
          },
          {
            model: this.userModel,
            attributes: ['id', 'first_name', 'last_name'],
          },
          { model: this.branchModel, attributes: ['id', 'name', 'color_code'] },
        ],
      });

      const items = rows.map((row: any) => ({
        id: row.id,
        consultation_date: row.consultation_date,
        chief_complaint: row.chief_complaint,
        diagnosis: row.diagnosis,
        dental_chart_type: row.dental_chart_type,
        is_completed: row.is_completed,
        follow_up_date: row.follow_up_date,
        patient: row.patient,
        doctor: row.doctor,
        branch: row.branch,
        created_at: row.created_at,
      }));

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
      this.logger.error(`[listConsultations] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async completeConsultation(user: any, id: string) {
    try {
      const consultation = await this.consultationModel.findOne({
        where: { id, organization_id: user.org_id },
      });

      if (!consultation) {
        throw new HttpException(
          { message: 'Consultation not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );
      }

      if (consultation.is_completed) {
        throw new HttpException(
          {
            message: 'Consultation is already completed.',
            error: ErrorCode.BAD_REQUEST,
          },
          StatusCode.BAD_REQUEST,
        );
      }

      await consultation.update({ is_completed: true });

      return {
        id: consultation.id,
        is_completed: true,
        updated_at: consultation.updated_at,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[completeConsultation] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getConsultationDocuments(id: string, user: any) {
    try {
      const consultation = await this.consultationModel.findOne({
        where: { id, organization_id: user.org_id },
      });

      if (!consultation) {
        throw new HttpException(
          { message: 'Consultation not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );
      }

      const documents = await this.consultationDocModel.findAll({
        where: { consultation_id: id },
        order: [['created_at', 'ASC']],
        include: [
          {
            model: this.userModel,
            as: 'uploaded_by_relation',
            attributes: ['id', 'first_name', 'last_name'],
          },
        ],
      });

      return documents.map((doc: any) => {
        const u = doc.getDataValue('uploaded_by_relation');
        return {
          id: doc.id,
          file_url: doc.file_url,
          file_name: doc.file_name,
          file_type: doc.file_type,
          uploaded_by: u
            ? {
                id: u.id,
                first_name: u.first_name,
                last_name: u.last_name,
              }
            : null,
          created_at: doc.created_at,
        };
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[getConsultationDocuments] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getDentalChartEntries(user: any, consultationId: string) {
    try {
      const consultation = await this.consultationModel.findOne({
        where: { id: consultationId, organization_id: user.org_id },
      });

      if (!consultation) {
        throw new HttpException(
          { message: 'Consultation not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );
      }

      const entries = await this.dentalChartEntryModel.findAll({
        where: { consultation_id: consultationId },
        order: [['created_at', 'ASC']],
        attributes: [
          'id',
          'tooth_number',
          'condition',
          'notes',
          'color',
          'created_at',
          'updated_at',
        ],
      });

      return entries;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[getDentalChartEntries] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async removeDentalChartEntry(
    user: any,
    consultationId: string,
    entryId: string,
  ) {
    try {
      const consultation = await this.consultationModel.findOne({
        where: { id: consultationId, organization_id: user.org_id },
      });

      if (!consultation) {
        throw new HttpException(
          { message: 'Consultation not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );
      }

      if (consultation.is_completed) {
        throw new HttpException(
          {
            message: 'Cannot modify chart of a completed consultation.',
            error: ErrorCode.BAD_REQUEST,
          },
          StatusCode.BAD_REQUEST,
        );
      }

      const deleted = await this.dentalChartEntryModel.destroy({
        where: { id: entryId, consultation_id: consultationId },
      });

      if (!deleted) {
        throw new HttpException(
          { message: 'Chart entry not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[removeDentalChartEntry] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteConsultationDocument(
    user: any,
    consultationId: string,
    documentId: string,
  ) {
    try {
      const consultation = await this.consultationModel.findOne({
        where: { id: consultationId, organization_id: user.org_id },
      });

      if (!consultation) {
        throw new HttpException(
          { message: 'Consultation not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );
      }

      if (consultation.is_completed) {
        throw new HttpException(
          {
            message: 'Cannot delete documents of a completed consultation.',
            error: ErrorCode.BAD_REQUEST,
          },
          StatusCode.BAD_REQUEST,
        );
      }

      const document = await this.consultationDocModel.findOne({
        where: { id: documentId, consultation_id: consultationId },
      });

      if (!document) {
        throw new HttpException(
          { message: 'Document not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );
      }

      // Delete from Cloudinary
      if (document.file_key) {
        try {
          await this.uploadService.deleteFile(document.file_key);
        } catch (uploadError) {
          this.logger.warn(
            `[deleteConsultationDocument] Failed to delete file from Cloudinary: ${document.file_key}`,
            uploadError,
          );
          // Proceed to delete DB record even if Cloudinary deletion fails (e.g., file already deleted from cloud)
        }
      }

      await document.destroy();

      return true;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[deleteConsultationDocument] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteConsultation(user: any, id: string) {
    const transaction = await this.sequelize.transaction();
    try {
      const consultation = await this.consultationModel.findOne({
        where: { id, organization_id: user.org_id },
        transaction,
      });

      if (!consultation) {
        throw new HttpException(
          { message: 'Consultation not found.', error: ErrorCode.NOT_FOUND },
          StatusCode.NOT_FOUND,
        );
      }

      // 1. Find and delete all attached documents from Cloudinary & DB
      const documents = await this.consultationDocModel.findAll({
        where: { consultation_id: id },
        transaction,
      });

      for (const doc of documents) {
        if (doc.file_key) {
          try {
            await this.uploadService.deleteFile(doc.file_key);
          } catch (uploadError) {
            this.logger.warn(
              `[deleteConsultation] Failed to delete file from Cloudinary: ${doc.file_key}`,
              uploadError,
            );
          }
        }
        await doc.destroy({ transaction });
      }

      // 2. Delete all dental chart entries
      await this.dentalChartEntryModel.destroy({
        where: { consultation_id: id },
        transaction,
      });

      // 3. Find all Treatment Plans associated with this consultation
      const treatmentPlans = await TreatmentPlan.findAll({
        where: { consultation_id: id, organization_id: user.org_id },
        transaction,
      });
      const planIds = treatmentPlans.map((p) => p.id);

      // 4. Retrieve phase IDs for these treatment plans
      let phaseIds: string[] = [];
      if (planIds.length > 0) {
        const phases = await TreatmentPlanPhase.findAll({
          where: { treatment_plan_id: { [Op.in]: planIds } },
          transaction,
        });
        phaseIds = phases.map((p) => p.id);
      }

      // 5. Delete related Appointments
      let appointmentIds: string[] = [];
      if (planIds.length > 0) {
        const appointments = await Appointment.findAll({
          where: {
            [Op.or]: [
              { treatment_plan_id: { [Op.in]: planIds } },
              ...(phaseIds.length > 0
                ? [{ plan_phase_id: { [Op.in]: phaseIds } }]
                : []),
            ],
          },
          transaction,
        });
        appointmentIds = appointments.map((app) => app.id);
      }

      if (appointmentIds.length > 0) {
        // Delete associated AppointmentStatusHistory
        await AppointmentStatusHistory.destroy({
          where: { appointment_id: { [Op.in]: appointmentIds } },
          transaction,
        });

        // Nullify appointment_id in Consultations (for safety, though they'll be deleted or updated)
        await Consultation.update(
          { appointment_id: null },
          {
            where: { appointment_id: { [Op.in]: appointmentIds } },
            transaction,
          },
        );

        // Delete the appointments themselves
        await Appointment.destroy({
          where: { id: { [Op.in]: appointmentIds } },
          transaction,
        });
      }

      // 6. Delete related Invoices
      const invoices = await Invoice.findAll({
        where: {
          [Op.or]: [
            { consultation_id: id, organization_id: user.org_id },
            ...(planIds.length > 0
              ? [
                  {
                    treatment_plan_id: { [Op.in]: planIds },
                    organization_id: user.org_id,
                  },
                ]
              : []),
          ],
        },
        transaction,
      });
      const invoiceIds = invoices.map((inv) => inv.id);

      if (invoiceIds.length > 0) {
        // Delete associated Payments
        await Payment.destroy({
          where: { invoice_id: { [Op.in]: invoiceIds } },
          transaction,
        });

        // Delete associated InvoiceLineItems
        await InvoiceLineItem.destroy({
          where: { invoice_id: { [Op.in]: invoiceIds } },
          transaction,
        });

        // Delete the invoices themselves
        await Invoice.destroy({
          where: { id: { [Op.in]: invoiceIds } },
          transaction,
        });
      }

      // 7. Delete related Prescriptions
      const prescriptions = await Prescription.findAll({
        where: {
          [Op.or]: [
            { consultation_id: id },
            ...(phaseIds.length > 0
              ? [{ treatment_plan_phase_id: { [Op.in]: phaseIds } }]
              : []),
          ],
        },
        transaction,
      });
      const prescriptionIds = prescriptions.map((p) => p.id);

      if (prescriptionIds.length > 0) {
        // Delete associated PrescriptionMedicines
        await PrescriptionMedicine.destroy({
          where: { prescription_id: { [Op.in]: prescriptionIds } },
          transaction,
        });

        // Delete the prescriptions themselves
        await Prescription.destroy({
          where: { id: { [Op.in]: prescriptionIds } },
          transaction,
        });
      }

      // 8. Delete Treatment Plan Phases
      if (planIds.length > 0) {
        await TreatmentPlanPhase.destroy({
          where: { treatment_plan_id: { [Op.in]: planIds } },
          transaction,
        });

        // 9. Delete Treatment Plans themselves
        await TreatmentPlan.destroy({
          where: { id: { [Op.in]: planIds } },
          transaction,
        });
      }

      // 10. Delete the consultation itself
      await consultation.destroy({ transaction });

      await transaction.commit();
      return { message: 'Consultation permanently deleted.' };
    } catch (error) {
      await transaction.rollback();
      if (error instanceof HttpException) throw error;
      this.logger.error(`[deleteConsultation] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
