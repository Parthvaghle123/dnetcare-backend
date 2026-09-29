import { SequelizeModuleOptions } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import pg from 'pg';

export const getDatabaseConfig = (
  configService: ConfigService,
): SequelizeModuleOptions => {
  const logger = new Logger('DatabaseConfig');
  logger.log('Initializing database configuration connection settings...');

  return {
    dialect: 'postgres',
    dialectModule: pg,
    uri: configService.get<string>('DATABASE_URL'),
    dialectOptions: {
      ssl: {
        rejectUnauthorized: false,
      },
    },
    pool: {
      max: 5,
      min: 0,
      idle: 10000,
      acquire: 30000,
      evict: 0,
    },
    autoLoadModels: true,
    synchronize: false,
    sync: {
      alter: false,
    },
    define: {
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    logging: false,
  };
};
