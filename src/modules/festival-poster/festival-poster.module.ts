import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule } from '@nestjs/config';
import { FestivalPosterController } from './festival-poster.controller';
import { FestivalPosterService } from './festival-poster.service';
import { Holiday } from '../holiday/entities/holiday.model';
import { Organization } from '../organization/entities/organization.model';
import { Branch } from '../organization/entities/branch.model';
import { DoctorProfile } from '../doctor/entities/doctor-profile.model';
import { User } from '../auth/entities/user.model';
import { UserBranch } from '../auth/entities/user-branch.model';
import { ProcedureCatalog } from '../catalog/entities/procedure-catalog.model';
import { WebsiteConfig } from '../website/entities/website-config.model';
import { UploadModule } from '../upload/upload.module';
import { FestivalPosterSetting } from './entities/festival-poster-setting.model';
import { FestivalPoster } from './entities/festival-poster.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Holiday,
      Organization,
      Branch,
      DoctorProfile,
      User,
      UserBranch,
      ProcedureCatalog,
      WebsiteConfig,
      FestivalPosterSetting,
      FestivalPoster,
    ]),
    ConfigModule,
    UploadModule,
  ],
  controllers: [FestivalPosterController],
  providers: [FestivalPosterService],
  exports: [FestivalPosterService],
})
export class FestivalPosterModule {}
