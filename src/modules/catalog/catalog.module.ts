import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { ProcedureCatalog } from './entities/procedure-catalog.model';
import { ProcedureCategory } from './entities/procedure-category.model';

@Module({
  imports: [SequelizeModule.forFeature([ProcedureCatalog, ProcedureCategory])],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [SequelizeModule, CatalogService],
})
export class CatalogModule {}
