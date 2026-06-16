import { Global, Module, OnModuleInit, Logger } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getDatabaseConfig } from '../config/database.config';

@Global()
@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => getDatabaseConfig(configService),
    }),
  ],
  exports: [SequelizeModule],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);

  onModuleInit() {
    this.logger.log('💸 Database connected successfully via Supabase!');
  }
}
