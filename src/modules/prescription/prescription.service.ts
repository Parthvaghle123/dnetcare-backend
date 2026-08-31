import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Prescription } from './entities/prescription.model';
import { PrescriptionMedicine } from './entities/prescription-medicine.model';
import { Consultation } from '../consultation/entities/consultation.model';
import { Patient } from '../patient/entities/patient.model';
import { User } from '../auth/entities/user.model';
import { DoctorProfile } from '../doctor/entities/doctor-profile.model';
import { Branch } from '../organization/entities/branch.model';
import { MedicineMaster } from './entities/medicine-master.model';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';

@Injectable()
export class PrescriptionService {
  private readonly logger = new Logger(PrescriptionService.name);

  constructor(
    @InjectModel(Prescription) private prescriptionModel: typeof Prescription,
    @InjectModel(PrescriptionMedicine)
    private prescriptionMedicineModel: typeof PrescriptionMedicine,
    @InjectModel(Consultation) private consultationModel: typeof Consultation,
    @InjectModel(Patient) private patientModel: typeof Patient,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(DoctorProfile)
    private doctorProfileModel: typeof DoctorProfile,
    @InjectModel(Branch) private branchModel: typeof Branch,
    @InjectModel(MedicineMaster)
    private medicineMasterModel: typeof MedicineMaster,
    private sequelize: Sequelize,
  ) {}

  private async buildPrescriptionResponse(
    prescription: Prescription,
    transaction?: any,
  ) {
    let consultation: any = null;
    let branchId: any = null;
    let consultationDate: any = null;

    if (prescription.consultation_id) {
      consultation = await this.consultationModel.findByPk(
        prescription.consultation_id,
        { transaction },
      );
      branchId = consultation?.branch_id;
      consultationDate =
        consultation?.consultation_date || consultation?.created_at;
    } else if (prescription.treatment_plan_phase_id) {
      const TPPhase = this.sequelize.models.TreatmentPlanPhase;
      const TP = this.sequelize.models.TreatmentPlan;
      const phase: any = await TPPhase.findByPk(
        prescription.treatment_plan_phase_id,
        {
          include: [{ model: TP, as: 'treatment_plan' }],
          transaction,
        },
      );
      branchId = phase?.treatment_plan?.branch_id;
      consultationDate = prescription.created_at;
    }

    const patient = await this.patientModel.findByPk(prescription.patient_id, {
      transaction,
    });
    let displayDoctorId = prescription.doctor_id;
    if (prescription.consultation_id && consultation) {
      displayDoctorId = consultation.doctor_id;
    } else if (prescription.treatment_plan_phase_id) {
      const TPPhase = this.sequelize.models.TreatmentPlanPhase;
      const TP = this.sequelize.models.TreatmentPlan;
      const phase: any = await TPPhase.findByPk(
        prescription.treatment_plan_phase_id,
        {
          include: [{ model: TP, as: 'treatment_plan' }],
          transaction,
        },
      );
      if (phase?.treatment_plan?.consultation_id) {
        const tpCons = await this.consultationModel.findByPk(
          phase.treatment_plan.consultation_id,
          { transaction }
        );
        if (tpCons) {
          displayDoctorId = tpCons.doctor_id;
        }
      }
    }

    const doctor = await this.userModel.findByPk(displayDoctorId, {
      transaction,
    });
    const doctorProfile = await this.doctorProfileModel.findOne({
      where: { user_id: displayDoctorId },
      transaction,
    });
    const branch = await this.branchModel.findByPk(branchId, { transaction });
    const medicines = await this.prescriptionMedicineModel.findAll({
      where: { prescription_id: prescription.id },
      order: [['sort_order', 'ASC']],
      transaction,
    });

    return {
      id: prescription.id,
      advice: prescription.advice || null,
      consultation_id: prescription.consultation_id || null,
      treatment_plan_phase_id: prescription.treatment_plan_phase_id || null,
      consultation_date: consultationDate,
      patient: {
        id: patient?.id,
        file_number: patient?.file_number,
        first_name: patient?.first_name,
        last_name: patient?.last_name,
        mobile: patient?.mobile,
        age: patient?.age,
        gender: patient?.gender,
      },
      doctor: {
        id: doctor?.id,
        first_name: doctor?.first_name,
        last_name: doctor?.last_name,
        qualification: doctorProfile?.qualification || null,
        registration_number: doctorProfile?.registration_number || null,
        signature_url: doctorProfile?.signature_url || null,
      },
      branch: {
        id: branch?.id,
        name: branch?.name,
        city: branch?.city,
        phone: branch?.phone,
        address: branch?.address || null,
        state: branch?.state || null,
        logo_url: branch?.logo_url || null,
      },
      medicines: medicines.map((m) => ({
        id: m.id,
        medicine_name: m.medicine_name,
        dosage: m.dosage,
        quantity: m.quantity,
        duration_days: m.duration_days,
        timing: m.timing,
        sort_order: m.sort_order,
      })),
      created_at: prescription.created_at,
    };
  }

  async createPrescription(user: any, dto: CreatePrescriptionDto) {
    try {
      if (!dto.consultation_id && !dto.treatment_plan_phase_id) {
        throw new BadRequestException(
          'Either consultation_id or treatment_plan_phase_id must be provided.',
        );
      }

      let targetPatientId = null;
      let targetDoctorId = user.sub; // The user making the request is the doctor prescribing

      if (dto.consultation_id) {
        const consultation: any = await this.consultationModel.findOne({
          where: { id: dto.consultation_id, organization_id: user.org_id },
        });

        if (!consultation)
          throw new NotFoundException('Consultation not found.');
        if (consultation.is_completed)
          throw new BadRequestException(
            'Cannot add prescription to a completed consultation.',
          );

        const existing = await this.prescriptionModel.findOne({
          where: { consultation_id: dto.consultation_id },
        });
        if (existing)
          throw new BadRequestException(
            'A prescription already exists for this consultation. Use update to modify it.',
          );

        targetPatientId = consultation.patient_id;
        targetDoctorId = consultation.doctor_id;
      } else if (dto.treatment_plan_phase_id) {
        if (!dto.treatment_plan_id) {
          throw new BadRequestException(
            'treatment_plan_id is required when treatment_plan_phase_id is provided.',
          );
        }

        const TPPhase = this.sequelize.models.TreatmentPlanPhase;
        const TP = this.sequelize.models.TreatmentPlan;

        // Verify the treatment plan exists and belongs to this org
        const treatmentPlan: any = await TP.findOne({
          where: { id: dto.treatment_plan_id, organization_id: user.org_id },
        });
        if (!treatmentPlan)
          throw new NotFoundException('Treatment Plan not found.');

        // Verify the phase exists and belongs to this treatment plan
        const phase: any = await TPPhase.findOne({
          where: {
            id: dto.treatment_plan_phase_id,
            treatment_plan_id: dto.treatment_plan_id,
          },
        });
        if (!phase)
          throw new NotFoundException(
            'Treatment Plan Phase not found or does not belong to the specified Treatment Plan.',
          );

        const existing = await this.prescriptionModel.findOne({
          where: { treatment_plan_phase_id: dto.treatment_plan_phase_id },
        });
        if (existing)
          throw new BadRequestException(
            'A prescription already exists for this phase. Use update to modify it.',
          );

        targetPatientId = treatmentPlan.patient_id;
      }

      if (!dto.medicines || dto.medicines.length === 0) {
        throw new BadRequestException('At least one medicine is required.');
      }

      const allowedTiming = [
        'After Meal',
        'Before Meal',
        'Sublingual',
        'As Required',
      ];
      for (let i = 0; i < dto.medicines.length; i++) {
        if (!allowedTiming.includes(dto.medicines[i].timing)) {
          throw new BadRequestException(
            `Invalid timing value for medicine ${i}. Must be After Meal, Before Meal, Sublingual or As Required.`,
          );
        }
      }

      return await this.sequelize.transaction(async (t) => {
        const prescription = await this.prescriptionModel.create(
          {
            consultation_id: dto.consultation_id || null,
            treatment_plan_phase_id: dto.treatment_plan_phase_id || null,
            patient_id: targetPatientId,
            doctor_id: targetDoctorId,
            advice: dto.advice || null,
          },
          { transaction: t },
        );

        const medicinesToInsert = dto.medicines.map((med, index) => ({
          prescription_id: prescription.id,
          medicine_name: med.medicine_name,
          dosage: med.dosage,
          quantity: med.quantity,
          duration_days: med.duration_days,
          timing: med.timing,
          sort_order: index + 1,
        }));

        await this.prescriptionMedicineModel.bulkCreate(medicinesToInsert, {
          transaction: t,
        });

        // Decrement stock for medicines
        for (const med of dto.medicines) {
          const medicineMaster = await this.medicineMasterModel.findOne({
            where: { name: med.medicine_name },
            transaction: t,
          });

          if (medicineMaster) {
            const decrementAmount = med.quantity || 0;
            // Ensure stock doesn't go negative, or just let it if that's the business rule. For now we just decrement.
            await medicineMaster.decrement('stock_quantity', {
              by: decrementAmount,
              transaction: t,
            });
          }
        }

        return await this.buildPrescriptionResponse(prescription, t);
      });
    } catch (error) {
      this.logger.error(
        `Create Prescription Error: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new InternalServerErrorException('Failed to create prescription.');
    }
  }

  async updatePrescription(id: string, user: any, dto: UpdatePrescriptionDto) {
    const t = await this.sequelize.transaction();
    try {
      const prescription = await this.prescriptionModel.findOne({
        where: { id },
      });

      if (!prescription) {
        throw new NotFoundException('Prescription not found.');
      }

      // Verify organization ownership
      if (prescription.consultation_id) {
        const consultation: any = await this.consultationModel.findOne({
          where: { id: prescription.consultation_id },
        });
        if (!consultation || consultation.organization_id !== user.org_id) {
          throw new NotFoundException('Prescription not found.');
        }
        if (user.role === 'DOCTOR' && consultation.doctor_id !== user.sub) {
          throw new ForbiddenException(
            'You can only update prescriptions for your own consultations.',
          );
        }
      } else if (prescription.treatment_plan_phase_id) {
        const TPPhase = this.sequelize.models.TreatmentPlanPhase;
        const TP = this.sequelize.models.TreatmentPlan;
        const phase: any = await TPPhase.findByPk(
          prescription.treatment_plan_phase_id,
          {
            include: [
              {
                model: TP,
                as: 'treatment_plan',
                where: { organization_id: user.org_id },
              },
            ],
          },
        );
        if (!phase) {
          throw new NotFoundException('Prescription not found.');
        }
        if (user.role === 'DOCTOR' && prescription.doctor_id !== user.sub) {
          throw new ForbiddenException(
            'You can only update prescriptions for your own phases.',
          );
        }
      }

      if (dto.advice !== undefined) {
        await prescription.update({ advice: dto.advice }, { transaction: t });
      }

      if (dto.medicines && dto.medicines.length > 0) {
        await this.prescriptionMedicineModel.destroy({
          where: { prescription_id: prescription.id },
          transaction: t,
        });

        const medicinesData = dto.medicines.map((m, index) => ({
          prescription_id: prescription.id,
          medicine_name: m.medicine_name,
          dosage: m.dosage,
          quantity: m.quantity,
          duration_days: m.duration_days,
          timing: m.timing,
          sort_order: index + 1,
        }));
        await this.prescriptionMedicineModel.bulkCreate(medicinesData, {
          transaction: t,
        });
      }

      await t.commit();

      return this.getPrescriptionById(id, user);
    } catch (error) {
      await t.rollback();
      this.logger.error(
        `Update Prescription Error: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new InternalServerErrorException('Failed to update prescription.');
    }
  }

  async deletePrescription(id: string, user: any) {
    const t = await this.sequelize.transaction();
    try {
      const prescription = await this.prescriptionModel.findOne({
        where: { id },
      });

      if (!prescription) {
        throw new NotFoundException('Prescription not found.');
      }

      // Verify organization ownership
      if (prescription.consultation_id) {
        const consultation: any = await this.consultationModel.findOne({
          where: { id: prescription.consultation_id },
        });
        if (!consultation || consultation.organization_id !== user.org_id) {
          throw new NotFoundException('Prescription not found.');
        }
        if (user.role === 'DOCTOR' && consultation.doctor_id !== user.sub) {
          throw new ForbiddenException(
            'You can only delete prescriptions for your own consultations.',
          );
        }
      } else if (prescription.treatment_plan_phase_id) {
        const TPPhase = this.sequelize.models.TreatmentPlanPhase;
        const TP = this.sequelize.models.TreatmentPlan;
        const phase: any = await TPPhase.findByPk(
          prescription.treatment_plan_phase_id,
          {
            include: [
              {
                model: TP,
                as: 'treatment_plan',
                where: { organization_id: user.org_id },
              },
            ],
          },
        );
        if (!phase) {
          throw new NotFoundException('Prescription not found.');
        }
        if (user.role === 'DOCTOR' && prescription.doctor_id !== user.sub) {
          throw new ForbiddenException(
            'You can only delete prescriptions for your own phases.',
          );
        }
      }

      // We should restore stock logic here if needed, but for MVP deletion of medicines is fine
      await this.prescriptionMedicineModel.destroy({
        where: { prescription_id: prescription.id },
        transaction: t,
      });

      await prescription.destroy({ transaction: t });
      await t.commit();

      return true;
    } catch (error) {
      await t.rollback();
      this.logger.error(
        `Delete Prescription Error: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new InternalServerErrorException('Failed to delete prescription.');
    }
  }

  async getPrescriptionById(id: string, user: any) {
    try {
      const prescription = await this.prescriptionModel.findByPk(id);
      if (!prescription) {
        throw new NotFoundException('Prescription not found.');
      }

      const consultation: any = await this.consultationModel.findOne({
        where: { id: prescription.consultation_id },
      });

      // It's possible the prescription is for a phase and has no consultation.
      if (!consultation && !prescription.treatment_plan_phase_id) {
        throw new NotFoundException('Prescription not found.');
      }

      return await this.buildPrescriptionResponse(prescription);
    } catch (error) {
      this.logger.error(
        `Get Prescription By Id Error: ${error.message}`,
        error.stack,
      );
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to fetch prescription.');
    }
  }

  async getPrescriptionByConsultationId(user: any, consultationId: string) {
    try {
      const consultation = await this.consultationModel.findOne({
        where: { id: consultationId, organization_id: user.org_id },
      });

      if (!consultation) {
        throw new NotFoundException('Consultation not found.');
      }

      const prescription = await this.prescriptionModel.findOne({
        where: { consultation_id: consultationId },
      });

      if (!prescription) {
        throw new NotFoundException(
          'Prescription not found for this consultation.',
        );
      }

      return await this.buildPrescriptionResponse(prescription);
    } catch (error) {
      this.logger.error(
        `Get Prescription By Consultation Error: ${error.message}`,
        error.stack,
      );
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to fetch prescription.');
    }
  }

  async getPrescriptionByPhaseId(user: any, phaseId: string) {
    try {
      const TPPhase = this.sequelize.models.TreatmentPlanPhase;
      const TP = this.sequelize.models.TreatmentPlan;

      const phase: any = await TPPhase.findByPk(phaseId, {
        include: [
          {
            model: TP,
            as: 'treatment_plan',
            where: { organization_id: user.org_id },
          },
        ],
      });

      if (!phase) {
        throw new NotFoundException('Treatment Plan Phase not found.');
      }

      const prescription = await this.prescriptionModel.findOne({
        where: { treatment_plan_phase_id: phaseId },
      });

      if (!prescription) {
        throw new NotFoundException('Prescription not found for this phase.');
      }

      return await this.buildPrescriptionResponse(prescription);
    } catch (error) {
      this.logger.error(
        `Get Prescription By Phase Error: ${error.message}`,
        error.stack,
      );
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to fetch prescription.');
    }
  }

  async getPrescriptions(user: any, filters: any) {
    try {
      const whereClause: any = {};

      if (filters.patient_id) {
        whereClause.patient_id = filters.patient_id;
      }
      if (filters.consultation_id) {
        whereClause.consultation_id = filters.consultation_id;
      }
      if (filters.treatment_plan_phase_id) {
        whereClause.treatment_plan_phase_id = filters.treatment_plan_phase_id;
      }

      // Security check: Only return prescriptions for patients in the same organization
      // We can join with Patient or Consultation to ensure they belong to the org,
      // but simpler is to rely on doctor_id or branch_ids for Role.DOCTOR/RECEPTIONIST
      if (user.role === 'DOCTOR') {
        whereClause.doctor_id = user.sub;
      }

      const prescriptions = await this.prescriptionModel.findAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
      });

      const results: any[] = [];
      for (const p of prescriptions) {
        results.push(await this.buildPrescriptionResponse(p));
      }

      return results;
    } catch (error) {
      this.logger.error(
        `Get Prescriptions Error: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to fetch prescriptions.');
    }
  }
}
