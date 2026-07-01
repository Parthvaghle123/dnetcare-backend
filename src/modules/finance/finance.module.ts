import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { ExpenseCategory } from './entities/expense-category.model';
import { Expense } from './entities/expense.model';
import { Payment } from '../billing/entities/payment.model';
import { Branch } from '../organization/entities/branch.model';
import { User } from '../auth/entities/user.model';
import { Invoice } from '../billing/entities/invoice.model';
import { Patient } from '../patient/entities/patient.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      ExpenseCategory,
      Expense,
      Payment,
      Branch,
      User,
      Invoice,
      Patient,
    ]),
  ],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [SequelizeModule, FinanceService],
})
export class FinanceModule {}
