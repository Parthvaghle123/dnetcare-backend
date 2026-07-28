import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { ExpenseCategory } from './entities/expense-category.model';
import { Expense } from './entities/expense.model';
import { Payment } from '../billing/entities/payment.model';
import { Branch } from '../organization/entities/branch.model';
import { User } from '../auth/entities/user.model';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { Invoice, InvoiceStatus } from '../billing/entities/invoice.model';
import { Patient } from '../patient/entities/patient.model';
import dayjs from 'dayjs';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    @InjectModel(ExpenseCategory)
    private expenseCategoryModel: typeof ExpenseCategory,
    @InjectModel(Expense) private expenseModel: typeof Expense,
    @InjectModel(Payment) private paymentModel: typeof Payment,
    @InjectModel(Branch) private branchModel: typeof Branch,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(Invoice) private invoiceModel: typeof Invoice,
    @InjectModel(Patient) private patientModel: typeof Patient,
  ) {}

  private resolveDateRange(
    period: string = 'month',
    date_from?: string,
    date_to?: string,
  ) {
    let startDate: string;
    let endDate: string;
    let label: string;

    const today = dayjs();

    switch (period) {
      case 'today':
        startDate = today.format('YYYY-MM-DD');
        endDate = today.format('YYYY-MM-DD');
        label = 'Today';
        break;
      case 'week':
        startDate = today.day(1).format('YYYY-MM-DD');
        endDate = today.day(7).format('YYYY-MM-DD');
        label = 'This Week';
        break;
      case 'month':
        startDate = today.startOf('month').format('YYYY-MM-DD');
        endDate = today.endOf('month').format('YYYY-MM-DD');
        label = 'This Month';
        break;
      case 'year':
        startDate = today.startOf('year').format('YYYY-MM-DD');
        endDate = today.endOf('year').format('YYYY-MM-DD');
        label = 'This Year';
        break;
      case 'custom':
        if (!date_from || !date_to) {
          throw new BadRequestException(
            'date_from and date_to are required for custom period.',
          );
        }
        startDate = date_from;
        endDate = date_to;
        label = `${date_from} to ${date_to}`;
        break;
      default:
        startDate = today.startOf('month').format('YYYY-MM-DD');
        endDate = today.endOf('month').format('YYYY-MM-DD');
        label = 'This Month';
    }

    return { startDate, endDate, label };
  }

  private generateDateRangeArray(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    let current = dayjs(startDate);
    const end = dayjs(endDate);
    while (current.isBefore(end) || current.isSame(end, 'day')) {
      dates.push(current.format('YYYY-MM-DD'));
      current = current.add(1, 'day');
    }
    return dates;
  }

  private generateMonthRangeArray(
    startDate: string,
    endDate: string,
  ): string[] {
    const months: string[] = [];
    let current = dayjs(startDate).startOf('month');
    const end = dayjs(endDate).startOf('month');
    while (current.isBefore(end) || current.isSame(end, 'month')) {
      months.push(current.format('MMM YYYY'));
      current = current.add(1, 'month');
    }
    return months;
  }

  async getExpenseCategories(user: any) {
    try {
      const categories = await this.expenseCategoryModel.findAll({
        where: {
          [Op.or]: [
            { organization_id: null },
            { organization_id: user.org_id },
          ],
          is_active: true,
        },
        order: [
          ['is_system', 'DESC'],
          ['name', 'ASC'],
        ],
      });

      return categories.map((c: any) => ({
        id: c.id,
        name: c.name,
        is_system: c.is_system,
        is_custom: !c.is_system,
      }));
    } catch (error) {
      this.logger.error(
        `Get Expense Categories Error: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to fetch expense categories.',
      );
    }
  }

  async createExpenseCategory(user: any, dto: CreateExpenseCategoryDto) {
    try {
      if (user.role !== 'OWNER' && user.role !== 'BRANCH_ADMIN') {
        throw new ForbiddenException(
          'Only owners and branch admins can create expense categories.',
        );
      }

      const existing = await this.expenseCategoryModel.findOne({
        where: {
          name: dto.name,
          [Op.or]: [
            { organization_id: null },
            { organization_id: user.org_id },
          ],
        },
      });

      if (existing) {
        throw new BadRequestException(
          'Expense category with this name already exists.',
        );
      }

      const category = await this.expenseCategoryModel.create({
        name: dto.name,
        organization_id: user.org_id,
        is_system: false,
        is_active: true,
      });

      return {
        id: category.id,
        name: category.name,
        is_system: category.is_system,
        is_custom: true,
      };
    } catch (error) {
      this.logger.error(
        `Create Expense Category Error: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      )
        throw error;
      throw new InternalServerErrorException(
        'Failed to create expense category.',
      );
    }
  }

  async createExpense(user: any, dto: CreateExpenseDto) {
    try {
      if (user.role !== 'OWNER' && user.role !== 'BRANCH_ADMIN') {
        throw new ForbiddenException(
          'Only owners and branch admins can log expenses.',
        );
      }

      const branch = await this.branchModel.findOne({
        where: { id: dto.branch_id, organization_id: user.org_id },
      });
      if (!branch) {
        throw new BadRequestException('Invalid branch.');
      }

      if (
        user.role === 'BRANCH_ADMIN' &&
        (!user.branch_ids || !user.branch_ids.includes(dto.branch_id))
      ) {
        throw new ForbiddenException(
          'You can only log expenses for your assigned branch.',
        );
      }

      const category = await this.expenseCategoryModel.findOne({
        where: {
          id: dto.category_id,
          [Op.or]: [
            { organization_id: null },
            { organization_id: user.org_id },
          ],
          is_active: true,
        },
      });
      if (!category) {
        throw new BadRequestException('Invalid expense category.');
      }

      if (dto.amount <= 0) {
        throw new BadRequestException(
          'Expense amount must be greater than zero.',
        );
      }

      const expenseDate = dto.expense_date || dayjs().format('YYYY-MM-DD');

      const expense = await this.expenseModel.create({
        organization_id: user.org_id,
        branch_id: dto.branch_id,
        category_id: dto.category_id,
        amount: dto.amount,
        expense_date: expenseDate,
        payment_mode: dto.payment_mode,
        vendor_name: dto.vendor_name || null,
        description: dto.description || null,
        added_by: user.sub,
      });

      return {
        id: expense.id,
        amount: Number(expense.amount),
        expense_date: expense.expense_date,
        payment_mode: expense.payment_mode,
        vendor_name: expense.vendor_name,
        description: expense.description,
        category: { id: category.id, name: category.name },
        branch: { id: branch.id, name: branch.name },
        added_by: expense.added_by,
        created_at: expense.created_at,
      };
    } catch (error) {
      this.logger.error(`Create Expense Error: ${error.message}`, error.stack);
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      )
        throw error;
      throw new InternalServerErrorException('Failed to log expense.');
    }
  }

  async updateExpense(user: any, id: string, dto: UpdateExpenseDto) {
    try {
      if (user.role !== 'OWNER' && user.role !== 'BRANCH_ADMIN') {
        throw new ForbiddenException(
          'Only owners and branch admins can update expenses.',
        );
      }

      const expense = await this.expenseModel.findOne({
        where: { id, organization_id: user.org_id },
      });

      if (!expense) {
        throw new NotFoundException('Expense not found.');
      }

      if (
        user.role === 'BRANCH_ADMIN' &&
        (!user.branch_ids || !user.branch_ids.includes(expense.branch_id))
      ) {
        throw new ForbiddenException(
          'You can only update expenses for your assigned branch.',
        );
      }

      if (dto.branch_id && dto.branch_id !== expense.branch_id) {
        const branch = await this.branchModel.findOne({
          where: { id: dto.branch_id, organization_id: user.org_id },
        });
        if (!branch) throw new BadRequestException('Invalid branch.');

        if (
          user.role === 'BRANCH_ADMIN' &&
          (!user.branch_ids || !user.branch_ids.includes(dto.branch_id))
        ) {
          throw new ForbiddenException(
            'Cannot move expense to a branch you do not manage.',
          );
        }
      }

      if (dto.category_id && dto.category_id !== expense.category_id) {
        const category = await this.expenseCategoryModel.findOne({
          where: {
            id: dto.category_id,
            [Op.or]: [
              { organization_id: null },
              { organization_id: user.org_id },
            ],
            is_active: true,
          },
        });
        if (!category)
          throw new BadRequestException('Invalid expense category.');
      }

      if (dto.amount !== undefined && dto.amount <= 0) {
        throw new BadRequestException(
          'Expense amount must be greater than zero.',
        );
      }

      await expense.update({
        branch_id: dto.branch_id ?? expense.branch_id,
        category_id: dto.category_id ?? expense.category_id,
        amount: dto.amount ?? expense.amount,
        expense_date: dto.expense_date ?? expense.expense_date,
        payment_mode: dto.payment_mode ?? expense.payment_mode,
        vendor_name:
          dto.vendor_name !== undefined ? dto.vendor_name : expense.vendor_name,
        description:
          dto.description !== undefined ? dto.description : expense.description,
      });

      return await this.expenseModel.findOne({
        where: { id },
        include: [
          { model: ExpenseCategory, attributes: ['id', 'name'] },
          { model: Branch, attributes: ['id', 'name'] },
        ],
      });
    } catch (error) {
      this.logger.error(`Update Expense Error: ${error.message}`, error.stack);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      )
        throw error;
      throw new InternalServerErrorException('Failed to update expense.');
    }
  }

  async deleteExpense(user: any, id: string) {
    try {
      if (user.role !== 'OWNER' && user.role !== 'BRANCH_ADMIN') {
        throw new ForbiddenException(
          'Only owners and branch admins can delete expenses.',
        );
      }

      const expense = await this.expenseModel.findOne({
        where: { id, organization_id: user.org_id },
      });

      if (!expense) {
        throw new NotFoundException('Expense not found.');
      }

      if (
        user.role === 'BRANCH_ADMIN' &&
        (!user.branch_ids || !user.branch_ids.includes(expense.branch_id))
      ) {
        throw new ForbiddenException(
          'You can only delete expenses for your assigned branch.',
        );
      }

      await expense.destroy();
      return { id };
    } catch (error) {
      this.logger.error(`Delete Expense Error: ${error.message}`, error.stack);
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      )
        throw error;
      throw new InternalServerErrorException('Failed to delete expense.');
    }
  }

  async getExpenses(user: any, query: any) {
    try {
      if (user.role !== 'OWNER' && user.role !== 'BRANCH_ADMIN') {
        throw new ForbiddenException(
          'Only owners and branch admins can view expenses.',
        );
      }

      const whereClause: any = { organization_id: user.org_id };

      if (user.role === 'BRANCH_ADMIN') {
        if (
          query.branch_id &&
          (!user.branch_ids || !user.branch_ids.includes(query.branch_id))
        ) {
          throw new ForbiddenException(
            'You cannot view expenses for other branches.',
          );
        }
        if (!query.branch_id) {
          whereClause.branch_id = { [Op.in]: user.branch_ids || [] };
        }
      }

      if (query.branch_id && user.role === 'OWNER') {
        whereClause.branch_id = query.branch_id;
      }

      if (query.category_id) {
        whereClause.category_id = query.category_id;
      }

      if (query.payment_mode) {
        whereClause.payment_mode = query.payment_mode;
      }

      if (query.date_from && query.date_to) {
        whereClause.expense_date = {
          [Op.between]: [query.date_from, query.date_to],
        };
      } else if (query.date_from) {
        whereClause.expense_date = { [Op.gte]: query.date_from };
      } else if (query.date_to) {
        whereClause.expense_date = { [Op.lte]: query.date_to };
      }

      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 20;
      const offset = (page - 1) * limit;

      const { rows, count } = await this.expenseModel.findAndCountAll({
        where: whereClause,
        order: [['expense_date', 'DESC']],
        limit,
        offset,
        include: [
          {
            model: ExpenseCategory,
            as: 'category',
            attributes: ['id', 'name'],
          },
          { model: Branch, as: 'branch', attributes: ['id', 'name'] },
          {
            model: this.userModel,
            as: 'added_by_relation',
            attributes: ['id', 'first_name', 'last_name'],
          },
        ],
      });

      const items = rows.map((e: any) => {
        const cat = e.getDataValue('category');
        const br = e.getDataValue('branch');
        const usr = e.getDataValue('added_by_relation');

        return {
          id: e.id,
          amount: Number(e.amount),
          expense_date: e.expense_date,
          payment_mode: e.payment_mode,
          vendor_name: e.vendor_name,
          description: e.description,
          category: cat ? { id: cat.id, name: cat.name } : null,
          branch: br ? { id: br.id, name: br.name } : null,
          added_by: usr
            ? {
                id: usr.id,
                first_name: usr.first_name,
                last_name: usr.last_name,
              }
            : null,
          created_at: e.created_at,
        };
      });

      return {
        items,
        meta: {
          total: count,
          page,
          limit,
          total_pages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      this.logger.error(`Get Expenses Error: ${error.message}`, error.stack);
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      )
        throw error;
      throw new InternalServerErrorException('Failed to fetch expenses.');
    }
  }

  async getIncomeReport(user: any, query: any) {
    try {
      if (user.role !== 'OWNER' && user.role !== 'BRANCH_ADMIN') {
        throw new ForbiddenException(
          'Only owners and branch admins can view finance reports.',
        );
      }

      let branchFilter = query.branch_id;
      if (user.role === 'BRANCH_ADMIN') {
        if (
          branchFilter &&
          (!user.branch_ids || !user.branch_ids.includes(branchFilter))
        ) {
          throw new ForbiddenException(
            'You cannot view reports for other branches.',
          );
        }
        if (!branchFilter) {
          branchFilter = { [Op.in]: user.branch_ids || [] };
        }
      }

      const { startDate, endDate, label } = this.resolveDateRange(
        query.period,
        query.date_from,
        query.date_to,
      );

      const whereClause: any = {
        organization_id: user.org_id,
        payment_date: { [Op.between]: [startDate, endDate] },
      };

      if (branchFilter) {
        whereClause.branch_id = branchFilter;
      }

      const payments = await this.paymentModel.findAll({
        where: whereClause,
        include: [
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'color_code'],
          },
        ],
      });

      const total_income = payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const total_transactions = payments.length;

      const by_payment_mode: any = {};
      const by_branch_map = new Map();
      const daily_map = new Map();

      for (const p of payments) {
        const mode = p.payment_mode;
        if (!by_payment_mode[mode])
          by_payment_mode[mode] = { count: 0, total: 0 };
        by_payment_mode[mode].count += 1;
        by_payment_mode[mode].total += Number(p.amount);

        if (user.role === 'OWNER') {
          const bId = p.branch_id;
          if (!by_branch_map.has(bId)) {
            const branchObj: any = p.getDataValue('branch');
            by_branch_map.set(bId, {
              branch: {
                id: branchObj.id,
                name: branchObj.name,
                color_code: branchObj.color_code,
              },
              total: 0,
              count: 0,
              by_payment_mode: {},
            });
          }
          const bData = by_branch_map.get(bId);
          bData.total += Number(p.amount);
          bData.count += 1;
          if (!bData.by_payment_mode[mode])
            bData.by_payment_mode[mode] = { count: 0, total: 0 };
          bData.by_payment_mode[mode].count += 1;
          bData.by_payment_mode[mode].total += Number(p.amount);
        }

        const dateStr = dayjs(p.payment_date).format('YYYY-MM-DD');
        if (!daily_map.has(dateStr))
          daily_map.set(dateStr, { date: dateStr, total: 0, count: 0 });
        const dData = daily_map.get(dateStr);
        dData.total += Number(p.amount);
        dData.count += 1;
      }

      const by_branch = Array.from(by_branch_map.values()).sort(
        (a, b) => b.total - a.total,
      );

      const allDates = this.generateDateRangeArray(startDate, endDate);
      const daily_breakdown = allDates.map(
        (d) => daily_map.get(d) || { date: d, total: 0, count: 0 },
      );

      return {
        period: { label, start_date: startDate, end_date: endDate },
        summary: {
          total_income,
          total_transactions,
          average_per_transaction:
            total_transactions > 0 ? total_income / total_transactions : 0,
        },
        by_payment_mode,
        by_branch: user.role === 'OWNER' ? by_branch : [],
        daily_breakdown,
      };
    } catch (error) {
      this.logger.error(
        `Get Income Report Error: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      )
        throw error;
      throw new InternalServerErrorException('Failed to fetch income report.');
    }
  }

  async getExpenseReport(user: any, query: any) {
    try {
      if (user.role !== 'OWNER' && user.role !== 'BRANCH_ADMIN') {
        throw new ForbiddenException(
          'Only owners and branch admins can view finance reports.',
        );
      }

      let branchFilter = query.branch_id;
      if (user.role === 'BRANCH_ADMIN') {
        if (
          branchFilter &&
          (!user.branch_ids || !user.branch_ids.includes(branchFilter))
        ) {
          throw new ForbiddenException(
            'You cannot view reports for other branches.',
          );
        }
        if (!branchFilter) {
          branchFilter = { [Op.in]: user.branch_ids || [] };
        }
      }

      const { startDate, endDate, label } = this.resolveDateRange(
        query.period,
        query.date_from,
        query.date_to,
      );

      const whereClause: any = {
        organization_id: user.org_id,
        expense_date: { [Op.between]: [startDate, endDate] },
      };

      if (branchFilter) {
        whereClause.branch_id = branchFilter;
      }

      if (query.category_id) {
        whereClause.category_id = query.category_id;
      }

      const expenses = await this.expenseModel.findAll({
        where: whereClause,
        include: [
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'color_code'],
          },
          {
            model: ExpenseCategory,
            as: 'category',
            attributes: ['id', 'name'],
          },
        ],
      });

      const total_expenses = expenses.reduce(
        (sum, e) => sum + Number(e.amount),
        0,
      );
      const total_transactions = expenses.length;

      const by_category_map = new Map();
      const by_branch_map = new Map();
      const by_payment_mode: any = {};
      const daily_map = new Map();

      for (const e of expenses) {
        const amt = Number(e.amount);

        const catId = e.category_id;
        if (!by_category_map.has(catId)) {
          const catObj: any = e.getDataValue('category');
          by_category_map.set(catId, {
            category: { id: catObj?.id, name: catObj?.name },
            total: 0,
            count: 0,
          });
        }
        const cData = by_category_map.get(catId);
        cData.total += amt;
        cData.count += 1;

        if (user.role === 'OWNER') {
          const bId = e.branch_id;
          if (!by_branch_map.has(bId)) {
            const branchObj: any = e.getDataValue('branch');
            by_branch_map.set(bId, {
              branch: {
                id: branchObj?.id,
                name: branchObj?.name,
                color_code: branchObj?.color_code,
              },
              total: 0,
              count: 0,
            });
          }
          const bData = by_branch_map.get(bId);
          bData.total += amt;
          bData.count += 1;
        }

        const mode = e.payment_mode;
        if (!by_payment_mode[mode])
          by_payment_mode[mode] = { count: 0, total: 0 };
        by_payment_mode[mode].count += 1;
        by_payment_mode[mode].total += amt;

        const dateStr = dayjs(e.expense_date).format('YYYY-MM-DD');
        if (!daily_map.has(dateStr))
          daily_map.set(dateStr, { date: dateStr, total: 0, count: 0 });
        const dData = daily_map.get(dateStr);
        dData.total += amt;
        dData.count += 1;
      }

      const by_category = Array.from(by_category_map.values())
        .map((c: any) => ({
          ...c,
          percentage:
            total_expenses > 0
              ? ((c.total / total_expenses) * 100).toFixed(1)
              : '0.0',
        }))
        .sort((a, b) => b.total - a.total);

      const by_branch = Array.from(by_branch_map.values()).sort(
        (a: any, b: any) => b.total - a.total,
      );

      const allDates = this.generateDateRangeArray(startDate, endDate);
      const daily_breakdown = allDates.map(
        (d) => daily_map.get(d) || { date: d, total: 0, count: 0 },
      );

      return {
        period: { label, start_date: startDate, end_date: endDate },
        summary: { total_expenses, total_transactions },
        by_category,
        by_branch: user.role === 'OWNER' ? by_branch : [],
        by_payment_mode,
        daily_breakdown,
      };
    } catch (error) {
      this.logger.error(
        `Get Expense Report Error: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      )
        throw error;
      throw new InternalServerErrorException('Failed to fetch expense report.');
    }
  }

  async getPLReport(user: any, query: any) {
    try {
      if (user.role !== 'OWNER' && user.role !== 'BRANCH_ADMIN') {
        throw new ForbiddenException(
          'Only owners and branch admins can view finance reports.',
        );
      }

      let branchFilter = query.branch_id;
      if (user.role === 'BRANCH_ADMIN') {
        if (
          branchFilter &&
          (!user.branch_ids || !user.branch_ids.includes(branchFilter))
        ) {
          throw new ForbiddenException(
            'You cannot view reports for other branches.',
          );
        }
        if (!branchFilter) {
          branchFilter = { [Op.in]: user.branch_ids || [] };
        }
      }

      const { startDate, endDate, label } = this.resolveDateRange(
        query.period,
        query.date_from,
        query.date_to,
      );

      const incomeWhere: any = {
        organization_id: user.org_id,
        payment_date: { [Op.between]: [startDate, endDate] },
      };
      if (branchFilter) incomeWhere.branch_id = branchFilter;

      const expenseWhere: any = {
        organization_id: user.org_id,
        expense_date: { [Op.between]: [startDate, endDate] },
      };
      if (branchFilter) expenseWhere.branch_id = branchFilter;

      const payments = await this.paymentModel.findAll({
        where: incomeWhere,
        include: [{ model: Branch, as: 'branch' }],
      });
      const expenses = await this.expenseModel.findAll({
        where: expenseWhere,
        include: [{ model: Branch, as: 'branch' }],
      });

      const total_income = payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const payment_count = payments.length;

      const total_expenses = expenses.reduce(
        (sum, e) => sum + Number(e.amount),
        0,
      );
      const expense_count = expenses.length;

      const net_profit = total_income - total_expenses;
      const profit_margin_percentage =
        total_income > 0 ? ((net_profit / total_income) * 100).toFixed(1) : 0;

      let by_branch: any[] = [];
      if (user.role === 'OWNER' && !query.branch_id) {
        const branchMap = new Map();

        for (const p of payments) {
          const bId = p.branch_id;
          if (!branchMap.has(bId)) {
            const b: any = p.getDataValue('branch');
            branchMap.set(bId, {
              branch: { id: b?.id, name: b?.name, color_code: b?.color_code },
              income: 0,
              expenses: 0,
            });
          }
          branchMap.get(bId).income += Number(p.amount);
        }

        for (const e of expenses) {
          const bId = e.branch_id;
          if (!branchMap.has(bId)) {
            const b: any = e.getDataValue('branch');
            branchMap.set(bId, {
              branch: { id: b?.id, name: b?.name, color_code: b?.color_code },
              income: 0,
              expenses: 0,
            });
          }
          branchMap.get(bId).expenses += Number(e.amount);
        }

        by_branch = Array.from(branchMap.values())
          .map((b: any) => ({
            ...b,
            net_profit: b.income - b.expenses,
            is_profitable: b.income - b.expenses >= 0,
          }))
          .sort((a, b) => b.net_profit - a.net_profit);
      }

      const diffDays = dayjs(endDate).diff(dayjs(startDate), 'day');
      let trend: any[] = [];

      if (query.period === 'year' || diffDays > 30) {
        const allMonths = this.generateMonthRangeArray(startDate, endDate);
        const monthMap = new Map();
        allMonths.forEach((m) =>
          monthMap.set(m, { month: m, income: 0, expenses: 0 }),
        );

        for (const p of payments) {
          const m = dayjs(p.payment_date).format('MMM YYYY');
          if (monthMap.has(m)) monthMap.get(m).income += Number(p.amount);
        }
        for (const e of expenses) {
          const m = dayjs(e.expense_date).format('MMM YYYY');
          if (monthMap.has(m)) monthMap.get(m).expenses += Number(e.amount);
        }

        trend = Array.from(monthMap.values()).map((m: any) => ({
          ...m,
          net_profit: m.income - m.expenses,
        }));
      } else {
        const allDates = this.generateDateRangeArray(startDate, endDate);
        const dateMap = new Map();
        allDates.forEach((d) =>
          dateMap.set(d, { date: d, income: 0, expenses: 0 }),
        );

        for (const p of payments) {
          const d = dayjs(p.payment_date).format('YYYY-MM-DD');
          if (dateMap.has(d)) dateMap.get(d).income += Number(p.amount);
        }
        for (const e of expenses) {
          const d = dayjs(e.expense_date).format('YYYY-MM-DD');
          if (dateMap.has(d)) dateMap.get(d).expenses += Number(e.amount);
        }

        trend = Array.from(dateMap.values()).map((d: any) => ({
          ...d,
          net_profit: d.income - d.expenses,
        }));
      }

      return {
        period: { label, start_date: startDate, end_date: endDate },
        summary: {
          total_income,
          total_expenses,
          net_profit,
          profit_margin_percentage,
          is_profitable: net_profit >= 0,
          payment_transactions: payment_count,
          expense_transactions: expense_count,
        },
        by_branch,
        trend,
      };
    } catch (error) {
      this.logger.error(`Get P&L Report Error: ${error.message}`, error.stack);
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      )
        throw error;
      throw new InternalServerErrorException('Failed to fetch P&L report.');
    }
  }

  async getOutstandingPatientBalances(user: any, query: any) {
    try {
      if (user.role !== 'OWNER' && user.role !== 'BRANCH_ADMIN') {
        throw new ForbiddenException(
          'Only owners and branch admins can view outstanding balances.',
        );
      }

      const whereClause: any = {
        organization_id: user.org_id,
        pending_amount: { [Op.gt]: 0 },
        status: { [Op.notIn]: [InvoiceStatus.CANCELLED] },
      };

      if (user.role === 'BRANCH_ADMIN') {
        if (
          query.branch_id &&
          (!user.branch_ids || !user.branch_ids.includes(query.branch_id))
        ) {
          throw new ForbiddenException(
            'You cannot view balances for other branches.',
          );
        }
        whereClause.branch_id = query.branch_id
          ? query.branch_id
          : { [Op.in]: user.branch_ids || [] };
      } else if (query.branch_id) {
        whereClause.branch_id = query.branch_id;
      }

      const invoices = await this.invoiceModel.findAll({
        where: whereClause,
        include: [
          {
            model: Patient,
            attributes: [
              'id',
              'first_name',
              'last_name',
              'file_number',
              'mobile',
            ],
          },
        ],
        order: [['invoice_date', 'ASC']],
      });

      let total_outstanding = 0;
      const patientMap = new Map<string, any>();

      for (const inv of invoices) {
        total_outstanding += Number(inv.pending_amount);
        const patientId = inv.patient_id;

        if (!patientMap.has(patientId)) {
          patientMap.set(patientId, {
            patient: inv.patient,
            total_pending: 0,
            invoices: [],
          });
        }

        const data = patientMap.get(patientId);
        data.total_pending += Number(inv.pending_amount);
        data.invoices.push({
          id: inv.id,
          invoice_number: inv.invoice_number,
          invoice_date: inv.invoice_date,
          total: Number(inv.total),
          paid_amount: Number(inv.paid_amount),
          pending_amount: Number(inv.pending_amount),
          status: inv.status,
        });
      }

      const patients_with_balances = Array.from(patientMap.values())
        .map((p) => ({
          ...p,
          total_pending: Number(p.total_pending.toFixed(2)),
        }))
        .sort((a, b) => b.total_pending - a.total_pending);

      return {
        total_outstanding: Number(total_outstanding.toFixed(2)),
        total_patients: patients_with_balances.length,
        patients: patients_with_balances,
      };
    } catch (error) {
      this.logger.error(
        `Get Outstanding Balances Error: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to fetch outstanding balances.',
      );
    }
  }
}
