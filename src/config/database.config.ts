import { SequelizeModuleOptions } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

export const getDatabaseConfig = (configService: ConfigService): SequelizeModuleOptions => {
  const logger = new Logger('DatabaseConfig');
  logger.log('Initializing database configuration connection settings...');

  return {
    dialect: 'postgres',
    dialectModule: require('pg'),
    uri: configService.get<string>('DATABASE_URL'),
    dialectOptions: {
      ssl: {
        rejectUnauthorized: false,
      },
    },
    pool: {
      max: 2,
      min: 0,
      idle: 0,
      acquire: 3000,
      evict: 0,
    },
    autoLoadModels: true,
    synchronize: configService.get<string>('NODE_ENV') !== 'production',
    sync: {
      alter: configService.get<string>('NODE_ENV') !== 'production',
    },
    define: {
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    logging: false,
  };
};
