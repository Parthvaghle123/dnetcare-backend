import { Controller, Get, Put, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchStatusDto } from './dto/branch-status.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get('organization/me')
  async getMyOrganization(@CurrentUser() reqUser: any) {
    const data = await this.organizationService.getMyOrganization(reqUser);
    return { message: 'Organization details fetched.', data };
  }

  @Put('organization/me')
  async updateMyOrganization(@CurrentUser() reqUser: any, @Body() dto: UpdateOrganizationDto) {
    const data = await this.organizationService.updateMyOrganization(reqUser, dto);
    return { message: 'Organization updated successfully.', data };
  }

  @Get('branches')
  async getBranches(@CurrentUser() reqUser: any, @Query('is_active') is_active?: string) {
    let activeParam: boolean | undefined;
    if (is_active !== undefined) {
      activeParam = is_active === 'true';
    }
    const data = await this.organizationService.getBranches(reqUser, activeParam);
    return { message: 'Branches fetched successfully.', data };
  }

  @Post('branches')
  async createBranch(@CurrentUser() reqUser: any, @Body() dto: CreateBranchDto) {
    const data = await this.organizationService.createBranch(reqUser, dto);
    return { message: 'Branch created successfully.', data };
  }

  @Get('branches/:id')
  async getBranchById(@CurrentUser() reqUser: any, @Param('id') id: string) {
    const data = await this.organizationService.getBranchById(reqUser, id);
    return { message: 'Branch details fetched.', data };
  }

  @Put('branches/:id')
  async updateBranch(@CurrentUser() reqUser: any, @Param('id') id: string, @Body() dto: UpdateBranchDto) {
    const data = await this.organizationService.updateBranch(reqUser, id, dto);
    return { message: 'Branch updated successfully.', data };
  }

  @Patch('branches/:id/status')
  async updateBranchStatus(@CurrentUser() reqUser: any, @Param('id') id: string, @Body() dto: BranchStatusDto) {
    const data = await this.organizationService.updateBranchStatus(reqUser, id, dto);
    const message = dto.is_active ? 'Branch activated successfully.' : 'Branch deactivated successfully.';
    return { message, data };
  }
}
