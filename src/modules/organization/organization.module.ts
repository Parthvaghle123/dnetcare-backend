import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { Organization } from './entities/organization.model';
import { Branch } from './entities/branch.model';
import { UserBranch } from '../auth/entities/user-branch.model';
import { Subscription } from '../subscription/entities/subscription.model';
import { Plan } from '../subscription/entities/plan.model';

@Module({
  imports: [SequelizeModule.forFeature([Organization, Branch, UserBranch, Subscription, Plan])],
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [SequelizeModule, OrganizationService],
})
export class OrganizationModule {}
