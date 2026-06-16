import { SequelizeModuleOptions } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

export const getDatabaseConfig = (configService: ConfigService): SequelizeModuleOptions => {
  const logger = new Logger('DatabaseConfig');
  logger.log('Initializing database configuration connection settings...');

  return {
    dialect: 'postgres',
    uri: configService.get<string>('DATABASE_URL'),
    dialectOptions: {
      ssl: {
        rejectUnauthorized: false,
      },
    },
    autoLoadModels: true,
    synchronize: false,
    logging: (msg) => logger.debug(msg),
  };
};
