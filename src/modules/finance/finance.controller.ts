import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('expense-categories')
  @Roles(Role.OWNER, Role.BRANCH_ADMIN)
  async getExpenseCategories(@CurrentUser() user: any) {
    const data = await this.financeService.getExpenseCategories(user);
    return { message: 'Expense categories fetched.', data };
  }

  @Post('expense-categories')
  @Roles(Role.OWNER, Role.BRANCH_ADMIN)
  async createExpenseCategory(@Body() dto: CreateExpenseCategoryDto, @CurrentUser() user: any) {
    const data = await this.financeService.createExpenseCategory(user, dto);
    return { message: 'Expense category created successfully.', data };
  }

  @Get('expenses')
  @UseGuards(JwtAuthGuard)
  async getExpenses(@Query() query: any, @CurrentUser() user: any) {
    const data = await this.financeService.getExpenses(user, query);
    return { message: 'Expenses fetched successfully.', data };
  }

  @Post('expenses')
  @Roles(Role.OWNER, Role.BRANCH_ADMIN)
  async createExpense(@Body() dto: CreateExpenseDto, @CurrentUser() user: any) {
    const data = await this.financeService.createExpense(user, dto);
    return { message: 'Expense logged successfully.', data };
  }

  @Get('reports/income')
  @Roles(Role.OWNER, Role.BRANCH_ADMIN)
  async getIncomeReport(@Query() query: any, @CurrentUser() user: any) {
    const data = await this.financeService.getIncomeReport(user, query);
    return { message: 'Income report fetched.', data };
  }

  @Get('reports/expenses')
  @Roles(Role.OWNER, Role.BRANCH_ADMIN)
  async getExpenseReport(@Query() query: any, @CurrentUser() user: any) {
    const data = await this.financeService.getExpenseReport(user, query);
    return { message: 'Expense report fetched.', data };
  }

  @Get('reports/pl')
  @Roles(Role.OWNER, Role.BRANCH_ADMIN)
  async getPLReport(@Query() query: any, @CurrentUser() user: any) {
    const data = await this.financeService.getPLReport(user, query);
    return { message: 'Profit & Loss report fetched.', data };
  }
}
