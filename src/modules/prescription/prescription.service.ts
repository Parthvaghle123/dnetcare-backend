import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Prescription } from './entities/prescription.model';
import { PrescriptionMedicine } from './entities/prescription-medicine.model';
import { Consultation } from '../consultation/entities/consultation.model';
import { Patient } from '../patient/entities/patient.model';
import { User } from '../auth/entities/user.model';
import { DoctorProfile } from '../doctor/entities/doctor-profile.model';
import { Branch } from '../organization/entities/branch.model';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';

@Injectable()
export class PrescriptionService {
  private readonly logger = new Logger(PrescriptionService.name);

  constructor(
    @InjectModel(Prescription) private prescriptionModel: typeof Prescription,
    @InjectModel(PrescriptionMedicine) private prescriptionMedicineModel: typeof PrescriptionMedicine,
    @InjectModel(Consultation) private consultationModel: typeof Consultation,
    @InjectModel(Patient) private patientModel: typeof Patient,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(DoctorProfile) private doctorProfileModel: typeof DoctorProfile,
    @InjectModel(Branch) private branchModel: typeof Branch,
    private sequelize: Sequelize,
  ) {}

  private async buildPrescriptionResponse(prescription: Prescription, transaction?: any) {
    const consultation: any = await this.consultationModel.findByPk(prescription.consultation_id, { transaction });
    const patient = await this.patientModel.findByPk(prescription.patient_id, { transaction });
    const doctor = await this.userModel.findByPk(prescription.doctor_id, { transaction });
    const doctorProfile = await this.doctorProfileModel.findOne({ where: { user_id: prescription.doctor_id }, transaction });
    const branch = await this.branchModel.findByPk(consultation.branch_id, { transaction });
    const medicines = await this.prescriptionMedicineModel.findAll({
      where: { prescription_id: prescription.id },
      order: [['sort_order', 'ASC']],
      transaction,
    });

    return {
      id: prescription.id,
      advice: prescription.advice || null,
      consultation_id: consultation.id,
      consultation_date: consultation.consultation_date || consultation.created_at,
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
      const consultation: any = await this.consultationModel.findOne({
        where: { id: dto.consultation_id, organization_id: user.org_id },
      });

      if (!consultation) {
        throw new NotFoundException('Consultation not found.');
      }

      if (consultation.is_completed) {
        throw new BadRequestException('Cannot add prescription to a completed consultation.');
      }

      const existing = await this.prescriptionModel.findOne({
        where: { consultation_id: dto.consultation_id },
      });

      if (existing) {
        throw new BadRequestException('A prescription already exists for this consultation. Use update to modify it.');
      }

      if (!dto.medicines || dto.medicines.length === 0) {
        throw new BadRequestException('At least one medicine is required.');
      }

      const allowedTiming = ['After Meal', 'Before Meal', 'Sublingual', 'As Required'];
      for (let i = 0; i < dto.medicines.length; i++) {
        if (!allowedTiming.includes(dto.medicines[i].timing)) {
          throw new BadRequestException(`Invalid timing value for medicine ${i}. Must be After Meal, Before Meal, Sublingual or As Required.`);
        }
      }

      return await this.sequelize.transaction(async (t) => {
        const prescription = await this.prescriptionModel.create(
          {
            consultation_id: consultation.id,
            patient_id: consultation.patient_id,
            doctor_id: consultation.doctor_id,
            advice: dto.advice || null,
          },
          { transaction: t }
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

        await this.prescriptionMedicineModel.bulkCreate(medicinesToInsert, { transaction: t });

        return await this.buildPrescriptionResponse(prescription, t);
      });
    } catch (error) {
      this.logger.error(`Create Prescription Error: ${error.message}`, error.stack);
      if (error instanceof BadRequestException || error instanceof ForbiddenException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to create prescription.');
    }
  }

  async updatePrescription(id: string, user: any, dto: UpdatePrescriptionDto) {
    const t = await this.sequelize.transaction();
    try {
      const prescription = await this.prescriptionModel.findOne({
        where: { id },
        include: [{ 
          model: Consultation, 
          as: 'consultation',
          where: { organization_id: user.org_id }
        }]
      });

      if (!prescription) {
        throw new NotFoundException('Prescription not found.');
      }

      if (user.role === 'DOCTOR') {
        const consultation: any = prescription.getDataValue('consultation');
        if (consultation?.doctor_id !== user.sub) {
          throw new ForbiddenException('You can only update prescriptions for your own consultations.');
        }
      }

      if (dto.advice !== undefined) {
        await prescription.update({ advice: dto.advice }, { transaction: t });
      }

      if (dto.medicines && dto.medicines.length > 0) {
        await this.prescriptionMedicineModel.destroy({
          where: { prescription_id: prescription.id },
          transaction: t
        });

        const medicinesData = dto.medicines.map((m, index) => ({
          prescription_id: prescription.id,
          medicine_name: m.medicine_name,
          dosage: m.dosage,
          quantity: m.quantity,
          duration_days: m.duration_days,
          timing: m.timing,
          sort_order: index + 1
        }));
        await this.prescriptionMedicineModel.bulkCreate(medicinesData, { transaction: t });
      }

      await t.commit();

      return this.getPrescriptionById(id, user);
    } catch (error) {
      await t.rollback();
      this.logger.error(`Update Prescription Error: ${error.message}`, error.stack);
      if (error instanceof BadRequestException || error instanceof ForbiddenException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to update prescription.');
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

      if (!consultation || consultation.organization_id !== user.org_id) {
        throw new NotFoundException('Prescription not found.');
      }

      return await this.buildPrescriptionResponse(prescription);
    } catch (error) {
      this.logger.error(`Get Prescription By Id Error: ${error.message}`, error.stack);
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
        throw new NotFoundException('No prescription found for this consultation.');
      }

      return await this.buildPrescriptionResponse(prescription);
    } catch (error) {
      this.logger.error(`Get Prescription By Consultation Error: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to fetch prescription.');
    }
  }
}
