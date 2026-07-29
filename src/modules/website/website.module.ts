import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CacheModule } from '@nestjs/cache-manager';
import { WebsiteService } from './website.service';
import { AdminWebsiteController } from './controllers/admin-website.controller';
import { PublicWebsiteController } from './controllers/public-website.controller';
import { WebsiteConfig } from './entities/website-config.model';
import { Organization } from '../organization/entities/organization.model';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    SequelizeModule.forFeature([WebsiteConfig, Organization]),
    CacheModule.register(),
    UploadModule,
  ],
  controllers: [AdminWebsiteController, PublicWebsiteController],
  providers: [WebsiteService],
  exports: [WebsiteService],
})
export class WebsiteModule {}
