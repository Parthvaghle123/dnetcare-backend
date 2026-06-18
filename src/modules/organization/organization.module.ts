import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { Organization } from './entities/organization.model';
import { Branch } from './entities/branch.model';

@Module({
  imports: [SequelizeModule.forFeature([Organization, Branch])],
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [SequelizeModule, OrganizationService],
})
export class OrganizationModule {}
