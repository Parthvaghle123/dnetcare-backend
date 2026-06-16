import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { Invoice } from './invoice.model';
import { ProcedureCatalog } from '../../catalog/entities/procedure-catalog.model';
import { TreatmentPlanPhase } from '../../treatment/entities/treatment-plan-phase.model';

@Table({ tableName: 'invoice_line_items', timestamps: true })
export class InvoiceLineItem extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Invoice)
  @AllowNull(false)
  @Column(DataType.UUID)
  invoice_id: string;

  @BelongsTo(() => Invoice)
  invoice: Invoice;

  @ForeignKey(() => ProcedureCatalog)
  @AllowNull(true)
  @Column(DataType.UUID)
  procedure_id: string;

  @BelongsTo(() => ProcedureCatalog)
  procedure: ProcedureCatalog;

  @ForeignKey(() => TreatmentPlanPhase)
  @AllowNull(true)
  @Column(DataType.UUID)
  plan_phase_id: string;

  @BelongsTo(() => TreatmentPlanPhase)
  plan_phase: TreatmentPlanPhase;

  @AllowNull(false)
  @Column(DataType.STRING)
  description: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  tooth_numbers: string;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  quantity: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  unit_cost: number;

  @AllowNull(true)
  @Column(DataType.DECIMAL(10, 2))
  discount: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  subtotal: number;

  @AllowNull(false)
  @Column(DataType.DATE)
  created_at: Date;

}
