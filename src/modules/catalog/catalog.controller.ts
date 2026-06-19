import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateCatalogDto } from './dto/create-catalog.dto';

@Controller('catalog')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @Roles(Role.OWNER, Role.BRANCH_ADMIN, Role.DOCTOR, Role.RECEPTIONIST)
  async getCatalog(@Query() query: any, @CurrentUser() user: any) {
    const data = await this.catalogService.getCatalog(user, query);
    return { message: 'Catalog fetched successfully.', data };
  }

  @Post()
  @Roles(Role.OWNER, Role.BRANCH_ADMIN)
  async createCatalog(@Body() dto: CreateCatalogDto, @CurrentUser() user: any) {
    const data = await this.catalogService.createCatalog(user, dto);
    return { message: 'Procedure added to catalog.', data };
  }
}
