import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Op } from 'sequelize';
import { Invoice, InvoiceStatus } from './entities/invoice.model';
import { InvoiceLineItem } from './entities/invoice-line-item.model';
import { Payment } from './entities/payment.model';
import { Patient } from '../patient/entities/patient.model';
import { Branch } from '../organization/entities/branch.model';
import { User } from '../auth/entities/user.model';
import { ProcedureCatalog } from '../catalog/entities/procedure-catalog.model';
import { Consultation } from '../consultation/entities/consultation.model';
import { TreatmentPlan } from '../treatment/entities/treatment-plan.model';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectModel(Invoice) private invoiceModel: typeof Invoice,
    @InjectModel(InvoiceLineItem) private invoiceLineItemModel: typeof InvoiceLineItem,
    @InjectModel(Payment) private paymentModel: typeof Payment,
    @InjectModel(Patient) private patientModel: typeof Patient,
    @InjectModel(Branch) private branchModel: typeof Branch,
    @InjectModel(ProcedureCatalog) private procedureCatalogModel: typeof ProcedureCatalog,
    @InjectModel(Consultation) private consultationModel: typeof Consultation,
    @InjectModel(TreatmentPlan) private treatmentPlanModel: typeof TreatmentPlan,
    private sequelize: Sequelize,
  ) {}

  async createInvoice(user: any, dto: CreateInvoiceDto) {
    try {
      const patient = await this.patientModel.findOne({
        where: { id: dto.patient_id, organization_id: user.org_id },
      });
      if (!patient) throw new NotFoundException('Patient not found.');

      const branch = await this.branchModel.findOne({
        where: { id: dto.branch_id, organization_id: user.org_id },
      });
      if (!branch) throw new BadRequestException('Invalid branch.');

      if (dto.consultation_id) {
        const consultation = await this.consultationModel.findOne({
          where: { id: dto.consultation_id, organization_id: user.org_id, patient_id: dto.patient_id },
        });
        if (!consultation) throw new BadRequestException('Invalid consultation.');
      }

      if (dto.treatment_plan_id) {
        const treatmentPlan = await this.treatmentPlanModel.findOne({
          where: { id: dto.treatment_plan_id, organization_id: user.org_id, patient_id: dto.patient_id },
        });
        if (!treatmentPlan) throw new BadRequestException('Invalid treatment plan.');
      }

      if (!dto.line_items || dto.line_items.length === 0) {
        throw new BadRequestException('At least one line item is required.');
      }

      for (let i = 0; i < dto.line_items.length; i++) {
        const item = dto.line_items[i];
        if (item.procedure_id) {
          const procedure = await this.procedureCatalogModel.findOne({
            where: { id: item.procedure_id, organization_id: user.org_id, is_active: true },
          });
          if (!procedure) throw new BadRequestException(`Invalid procedure in line item ${i}.`);
        }
      }

      const gstPercentage = dto.gst_percentage ?? 0;
      if (gstPercentage !== 0 && gstPercentage !== 18) {
        throw new BadRequestException('GST percentage must be 0 or 18.');
      }

      let procedureAmount = 0;
      const parsedLineItems = dto.line_items.map((item) => {
        const quantity = item.quantity ?? 1;
        const discount = item.discount ?? 0;
        const lineSubtotal = (Number(item.unit_cost) * quantity) - Number(discount);
        
        if (lineSubtotal < 0) {
          throw new BadRequestException('Line item discount cannot exceed cost.');
        }

        procedureAmount += lineSubtotal;
        
        return {
          ...item,
          quantity,
          discount,
          subtotal: lineSubtotal,
        };
      });

      const consultationFee = dto.consultation_fee ?? 0;
      const otherAmount = dto.other_amount ?? 0;
      const subtotal = Number(consultationFee) + Number(otherAmount) + procedureAmount;
      const invoiceDiscount = dto.discount ?? 0;

      if (invoiceDiscount > subtotal) {
        throw new BadRequestException('Invoice discount cannot exceed subtotal.');
      }

      const taxableAmount = subtotal - invoiceDiscount;
      const gstAmount = (taxableAmount * gstPercentage) / 100;
      const total = taxableAmount + gstAmount;

      return await this.sequelize.transaction(async (t) => {
        const year = new Date().getFullYear();
        const count = await this.invoiceModel.count({
          where: {
            organization_id: user.org_id,
            invoice_number: { [Op.like]: `INV-${year}-%` },
          },
          transaction: t,
        });

        const sequence = count + 1;
        const invoiceNumber = `INV-${year}-${String(sequence).padStart(5, '0')}`;

        const invoice = await this.invoiceModel.create(
          {
            organization_id: user.org_id,
            branch_id: dto.branch_id,
            patient_id: dto.patient_id,
            consultation_id: dto.consultation_id || null,
            treatment_plan_id: dto.treatment_plan_id || null,
            invoice_number: invoiceNumber,
            invoice_date: dto.invoice_date || new Date().toISOString().split('T')[0],
            consultation_fee: consultationFee,
            other_amount: otherAmount,
            procedure_amount: procedureAmount,
            subtotal: subtotal,
            discount: invoiceDiscount,
            gst_percentage: gstPercentage,
            gst_amount: gstAmount,
            total: total,
            paid_amount: 0,
            pending_amount: total,
            status: InvoiceStatus.ISSUED,
            notes: dto.notes || null,
            created_by: user.sub,
          },
          { transaction: t },
        );

        const lineItemsToInsert = parsedLineItems.map((item) => ({
          invoice_id: invoice.id,
          description: item.description,
          procedure_id: item.procedure_id || null,
          plan_phase_id: item.treatment_plan_phase_id || null,
          tooth_numbers: item.tooth_numbers || null,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          discount: item.discount,
          subtotal: item.subtotal,
        }));

        await this.invoiceLineItemModel.bulkCreate(lineItemsToInsert, { transaction: t });

        return await this.getInvoiceById(user, invoice.id, t);
      });
    } catch (error) {
      this.logger.error(`Create Invoice Error: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to create invoice.');
    }
  }

  async getInvoices(user: any, query: any) {
    try {
      const { patient_id, branch_id, status, date_from, date_to, page = 1, limit = 10 } = query;
      const whereClause: any = { organization_id: user.org_id };

      if (patient_id) whereClause.patient_id = patient_id;
      if (branch_id) whereClause.branch_id = branch_id;
      if (status) whereClause.status = status;

      if (date_from && date_to) {
        whereClause.invoice_date = { [Op.between]: [date_from, date_to] };
      } else if (date_from) {
        whereClause.invoice_date = { [Op.gte]: date_from };
      } else if (date_to) {
        whereClause.invoice_date = { [Op.lte]: date_to };
      }

      const offset = (Number(page) - 1) * Number(limit);

      const { rows, count } = await this.invoiceModel.findAndCountAll({
        where: whereClause,
        include: [
          { model: Patient, attributes: ['id', 'file_number', 'first_name', 'last_name'] },
          { model: Branch, attributes: ['id', 'name'] },
        ],
        order: [['created_at', 'DESC']],
        limit: Number(limit),
        offset,
      });

      return {
        invoices: rows,
        meta: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(count / Number(limit)),
        },
      };
    } catch (error) {
      this.logger.error(`Get Invoices Error: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch invoices.');
    }
  }

  async getInvoiceById(user: any, id: string, transaction?: any) {
    try {
      const invoice = await this.invoiceModel.findOne({
        where: { id, organization_id: user.org_id },
        include: [
          { model: Patient, attributes: ['id', 'file_number', 'first_name', 'last_name', 'mobile', 'age', 'gender'] },
          { model: Branch, attributes: ['id', 'name', 'city', 'phone'] },
          { model: User, as: 'created_by_relation', attributes: ['id', 'first_name', 'last_name'] },
        ],
        transaction,
      });

      if (!invoice) throw new NotFoundException('Invoice not found.');

      const lineItems = await this.invoiceLineItemModel.findAll({
        where: { invoice_id: id },
        include: [
          { model: ProcedureCatalog, attributes: ['id', 'name'] }
        ],
        order: [['created_at', 'ASC']],
        transaction,
      });

      const payments = await this.paymentModel.findAll({
        where: { invoice_id: id },
        include: [
          { model: User, as: 'received_by_relation', attributes: ['id', 'first_name', 'last_name'] }
        ],
        order: [['created_at', 'ASC']],
        transaction,
      });

      const parsedLineItems = lineItems.map((item) => {
        const json = item.toJSON();
        return {
          ...json,
          procedure_name: json.procedure ? (json.procedure as any).name : null,
          procedure: undefined,
        };
      });

      const parsedPayments = payments.map((p) => {
        const json = p.toJSON();
        return {
          ...json,
          received_by: json.received_by_relation,
          received_by_relation: undefined,
        };
      });

      const invoiceJson = invoice.toJSON();
      return {
        ...invoiceJson,
        created_by: invoiceJson.created_by_relation,
        created_by_relation: undefined,
        line_items: parsedLineItems,
        payments: parsedPayments,
      };
    } catch (error) {
      this.logger.error(`Get Invoice By Id Error: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to fetch invoice.');
    }
  }

  async createPayment(user: any, id: string, dto: CreatePaymentDto) {
    try {
      const invoice = await this.invoiceModel.findOne({
        where: { id, organization_id: user.org_id },
      });

      if (!invoice) throw new NotFoundException('Invoice not found.');

      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new BadRequestException('Cannot record payment against a cancelled invoice.');
      }
      if (invoice.status === InvoiceStatus.PAID) {
        throw new BadRequestException('This invoice is already fully paid.');
      }

      if (Number(dto.amount) <= 0) {
        throw new BadRequestException('Payment amount must be greater than zero.');
      }

      const currentPending = Number(invoice.pending_amount);
      if (Number(dto.amount) > currentPending) {
        throw new BadRequestException(`Payment amount (₹${dto.amount}) exceeds pending balance (₹${currentPending}).`);
      }

      if (dto.payment_mode === 'CHEQUE' && !dto.payment_reference) {
        throw new BadRequestException('Cheque number is required for cheque payments.');
      }

      return await this.sequelize.transaction(async (t) => {
        const payment = await this.paymentModel.create(
          {
            organization_id: user.org_id,
            branch_id: invoice.branch_id,
            patient_id: invoice.patient_id,
            invoice_id: invoice.id,
            amount: dto.amount,
            payment_date: dto.payment_date || new Date().toISOString().split('T')[0],
            payment_mode: dto.payment_mode,
            payment_reference: dto.payment_reference || null,
            received_by: user.sub,
          },
          { transaction: t }
        );

        const newPaidAmount = Number(invoice.paid_amount) + Number(dto.amount);
        let newPendingAmount = Number(invoice.total) - newPaidAmount;
        let newStatus = InvoiceStatus.PARTIALLY_PAID;

        if (newPendingAmount <= 0) {
          newStatus = InvoiceStatus.PAID;
          newPendingAmount = 0;
        }

        await invoice.update(
          {
            paid_amount: newPaidAmount,
            pending_amount: newPendingAmount,
            status: newStatus,
          },
          { transaction: t }
        );

        return {
          payment: {
            id: payment.id,
            amount: payment.amount,
            payment_date: payment.payment_date,
            payment_mode: payment.payment_mode,
            payment_reference: payment.payment_reference,
            created_at: payment.created_at,
          },
          invoice_summary: {
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            total: Number(invoice.total),
            paid_amount: newPaidAmount,
            pending_amount: newPendingAmount,
            status: newStatus,
          },
        };
      });
    } catch (error) {
      this.logger.error(`Create Payment Error: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to create payment.');
    }
  }

  async getPatientPendingBalance(user: any, patientId: string) {
    try {
      const patient = await this.patientModel.findOne({
        where: { id: patientId, organization_id: user.org_id },
      });
      if (!patient) {
        throw new NotFoundException('Patient not found.');
      }

      const invoices = await this.invoiceModel.findAll({
        where: {
          patient_id: patientId,
          organization_id: user.org_id,
          status: { [Op.notIn]: [InvoiceStatus.CANCELLED] },
        },
        order: [['invoice_date', 'ASC']],
      });

      let total_billed = 0;
      let total_paid = 0;
      let total_pending = 0;
      let pending_invoices = 0;
      let paid_invoices = 0;
      const unpaid_list: any[] = [];

      for (const inv of invoices) {
        total_billed += Number(inv.total);
        total_paid += Number(inv.paid_amount);
        total_pending += Number(inv.pending_amount);

        if (inv.status === InvoiceStatus.PAID) {
          paid_invoices++;
        } else if (inv.status === InvoiceStatus.ISSUED || inv.status === InvoiceStatus.PARTIALLY_PAID) {
          pending_invoices++;
          unpaid_list.push({
            id: inv.id,
            invoice_number: inv.invoice_number,
            invoice_date: inv.invoice_date,
            total: Number(inv.total),
            paid_amount: Number(inv.paid_amount),
            pending_amount: Number(inv.pending_amount),
            status: inv.status,
          });
        }
      }

      return {
        patient_id: patientId,
        summary: {
          total_billed,
          total_paid,
          total_pending,
          total_invoices: invoices.length,
          pending_invoices,
          paid_invoices,
        },
        outstanding_invoices: unpaid_list,
      };
    } catch (error) {
      this.logger.error(`Get Pending Balance Error: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to fetch patient balance.');
    }
  }

  async getInvoicePayments(id: string, user: any) {
    try {
      const invoice = await this.invoiceModel.findOne({
        where: { id, organization_id: user.org_id }
      });

      if (!invoice) {
        throw new NotFoundException('Invoice not found.');
      }

      const payments = await this.paymentModel.findAll({
        where: { invoice_id: id },
        order: [
          ['payment_date', 'ASC'],
          ['created_at', 'ASC']
        ],
        include: [{
          model: User,
          as: 'received_by_relation',
          attributes: ['id', 'first_name', 'last_name']
        }]
      });

      const parsedPayments = payments.map((p) => {
        const json = p.toJSON();
        return {
          id: json.id,
          amount: Number(json.amount),
          payment_date: json.payment_date,
          payment_mode: json.payment_mode,
          payment_reference: json.payment_reference,
          received_by: json.received_by_relation ? {
            id: json.received_by_relation.id,
            first_name: json.received_by_relation.first_name,
            last_name: json.received_by_relation.last_name
          } : null,
          created_at: json.created_at
        };
      });

      return {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        invoice_total: Number(invoice.total),
        paid_amount: Number(invoice.paid_amount),
        pending_amount: Number(invoice.pending_amount),
        invoice_status: invoice.status,
        total_payments: payments.length,
        payments: parsedPayments
      };
    } catch (error) {
      this.logger.error(`Get Invoice Payments Error: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to fetch invoice payments.');
    }
  }

  async cancelInvoice(id: string, user: any) {
    try {
      if (user.role !== 'OWNER' && user.role !== 'BRANCH_ADMIN') {
        throw new BadRequestException('Only owners and branch admins can cancel invoices.');
      }

      const invoice = await this.invoiceModel.findOne({
        where: { id, organization_id: user.org_id }
      });

      if (!invoice) {
        throw new NotFoundException('Invoice not found.');
      }

      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new BadRequestException('Invoice is already cancelled.');
      }

      if (invoice.status === InvoiceStatus.PAID) {
        throw new BadRequestException('Cannot cancel a fully paid invoice.');
      }

      const paymentCount = await this.paymentModel.count({
        where: { invoice_id: id }
      });

      if (paymentCount > 0) {
        throw new BadRequestException('Cannot cancel invoice with recorded payments. Reverse the payments first.');
      }

      await invoice.update({ status: InvoiceStatus.CANCELLED });

      return {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        status: InvoiceStatus.CANCELLED,
        total: Number(invoice.total),
        updated_at: invoice.updated_at
      };
    } catch (error) {
      this.logger.error(`Cancel Invoice Error: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to cancel invoice.');
    }
  }
}
