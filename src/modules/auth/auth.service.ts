import {
  Injectable,
  HttpException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { StatusCode } from '../../common/enums/status-code.enum';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { InjectModel } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

import { Organization } from '../organization/entities/organization.model';
import { Branch } from '../organization/entities/branch.model';
import { User, UserStatus, UserRole } from './entities/user.model';
import { EmailService } from '../notification/email.service';
import { UserBranch } from './entities/user-branch.model';
import { RefreshToken } from './entities/refresh-token.model';
import { DoctorProfile } from '../doctor/entities/doctor-profile.model';
import { MedicalConditionMaster } from '../patient/entities/medical-condition-master.model';
import { Plan } from '../subscription/entities/plan.model';
import {
  Subscription,
  SubscriptionStatus,
} from '../subscription/entities/subscription.model';

import { RegisterDto } from './dto/register.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { UpdateEmailDto } from './dto/update-email.dto';

import { Role } from '../../common/enums/role.enum';

import { Sequelize } from 'sequelize-typescript';
import { InjectConnection } from '@nestjs/sequelize';
import { Op } from 'sequelize';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(Organization) private orgModel: typeof Organization,
    @InjectModel(Branch) private branchModel: typeof Branch,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(UserBranch) private userBranchModel: typeof UserBranch,
    @InjectModel(RefreshToken) private refreshTokenModel: typeof RefreshToken,
    @InjectModel(DoctorProfile)
    private doctorProfileModel: typeof DoctorProfile,
    @InjectModel(MedicalConditionMaster)
    private medicalConditionMasterModel: typeof MedicalConditionMaster,
    @InjectModel(Plan) private planModel: typeof Plan,
    @InjectModel(Subscription) private subscriptionModel: typeof Subscription,
    private configService: ConfigService,
    private jwtService: JwtService,
    private emailService: EmailService,
    @InjectConnection() private sequelize: Sequelize,
  ) { }

  async onModuleInit() {
    try {
      // 1. Ensure MAIN_ADMIN role exists in database enum type
      await this.sequelize
        .query(
          `ALTER TYPE enum_users_role ADD VALUE IF NOT EXISTS 'MAIN_ADMIN';`,
        )
        .catch((err) => {
          this.logger.warn(
            'Could not alter enum type (it might not exist yet or error): ' +
            err.message,
          );
        });

      // 2. Drop NOT NULL constraint on organization_id in users table
      await this.sequelize
        .query(`ALTER TABLE users ALTER COLUMN organization_id DROP NOT NULL;`)
        .catch((err) => {
          this.logger.warn(
            'Could not drop NOT NULL constraint on users.organization_id: ' +
            err.message,
          );
        });

      // 3. Ensure the default MAIN_ADMIN user exists
      const email = 'dentcare360.official@gmail.com';
      const admin = await this.userModel.findOne({ where: { email } });

      if (!admin) {
        this.logger.log('Default MAIN_ADMIN user not found. Creating...');
        await this.userModel.create({
          first_name: 'Dental',
          last_name: 'Admin',
          email,
          role: 'MAIN_ADMIN' as any,
          status: UserStatus.ACTIVE,
          is_active: true,
          is_deleted: false,
          organization_id: null,
        });
        this.logger.log('Default MAIN_ADMIN user created successfully.');
      } else {
        // Ensure its role, status, and activity flags are correct
        if (
          admin.role !== ('MAIN_ADMIN' as any) ||
          !admin.is_active ||
          admin.is_deleted ||
          admin.status !== UserStatus.ACTIVE
        ) {
          this.logger.log('Restoring default MAIN_ADMIN user properties...');
          await admin.update({
            role: 'MAIN_ADMIN' as any,
            status: UserStatus.ACTIVE,
            is_active: true,
            is_deleted: false,
          });
        }
      }
    } catch (error) {
      this.logger.error('Error in Auth module initialization:', error);
    }
  }

  private generateOtp(): string {
    if (this.configService.get('NODE_ENV') === 'development') {
      return '999999';
    } else {
      return Math.floor(100000 + Math.random() * 900000).toString();
    }
  }

  private async generateTokens(
    user: User,
    branchIds: string[],
    ipAddress: string = '',
    userAgent: string = '',
  ) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await argon2.hash(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const refreshToken = await this.refreshTokenModel.create({
      user_id: user.id,
      token: tokenHash,
      expires_at: expiresAt,
      is_revoked: false,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    const payload = {
      sub: user.id,
      org_id: user.organization_id,
      role: user.role,
      branch_ids: branchIds,
      session_id: refreshToken.id,
    };

    const access_token = this.jwtService.sign(payload);

    return { access_token, refresh_token: rawToken };
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.userModel.findOne({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new HttpException(
        {
          message: 'An account with this email already exists',
          error: ErrorCode.DUPLICATE_EMAIL,
        },
        StatusCode.CONFLICT,
      );
    }

    if (dto.phone) {
      const existingPhone = await this.userModel.findOne({
        where: { phone: dto.phone },
      });
      if (existingPhone) {
        throw new HttpException(
          {
            message: 'An account with this phone already exists',
            error: ErrorCode.DUPLICATE_PHONE,
          },
          StatusCode.CONFLICT,
        );
      }
    }

    const transaction = await this.sequelize.transaction();

    try {
      const createdOrg = await this.orgModel.create(
        {
          name: dto.org_name,
          phone: dto.phone,
          is_active: true,
        },
        { transaction },
      );

      const branchName =
        dto.branch_name && dto.branch_name.trim() !== ''
          ? dto.branch_name
          : dto.org_name;

      const createdBranch = await this.branchModel.create(
        {
          organization_id: createdOrg.id,
          name: branchName,
          city: dto.branch_city,
          state: dto.branch_state || null,
          address: dto.branch_address || null,
          phone: dto.branch_phone,
          start_time: dto.branch_start_time || null,
          end_time: dto.branch_end_time || null,
          color_code: '#3B82F6',
          is_active: true,
        },
        { transaction },
      );

      const otp = this.generateOtp();
      const otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);

      const createdUser = await this.userModel.create(
        {
          organization_id: createdOrg.id,
          first_name: dto.first_name,
          last_name: dto.last_name,
          email: dto.email,
          phone: dto.phone,
          role: Role.OWNER,
          status: UserStatus.PENDING,
          otp_code: otp,
          otp_expires_at: otp_expires_at,
          otp_attempts: 0,
          is_active: true,
        },
        { transaction },
      );

      await this.userBranchModel.create(
        {
          user_id: createdUser.id,
          branch_id: createdBranch.id,
          is_primary: true,
        },
        { transaction },
      );

      const defaultConditions = [
        'Diabetes',
        'Hypertension',
        'Asthma',
        'Cardiac Disease',
        'Bleeding Disorder',
        'Allergies',
      ];

      for (const name of defaultConditions) {
        await this.medicalConditionMasterModel.findOrCreate({
          where: { organization_id: createdOrg.id, name },
          defaults: { organization_id: createdOrg.id, name, is_active: true },
          transaction,
        });
      }

      await this.emailService.sendOtpEmail(dto.email, otp, 'register');

      await transaction.commit();
      return { email: dto.email };
    } catch (error) {
      await transaction.rollback();
      if (error instanceof HttpException) throw error;
      this.logger.error(`[register] Error:`, error);
      throw new HttpException(
        {
          message: 'Something went wrong. Please try again.',
          error: error.message || error.toString(),
        },
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async sendOtp(dto: SendOtpDto) {
    try {
      const user = await this.userModel.findOne({
        where: { email: dto.email },
      });
      if (!user) {
        throw new HttpException(
          {
            message: 'No account found with this email',
            error: ErrorCode.ACCOUNT_NOT_FOUND,
          },
          StatusCode.NOT_FOUND,
        );
      }

      if (user.status === UserStatus.PENDING && !user.invite_token) {
        // Registered but unverified — allow OTP resend
      } else if (user.status === UserStatus.PENDING) {
        throw new HttpException(
          {
            message: 'Account not activated. Please use your invite link.',
            error: ErrorCode.ACCOUNT_NOT_ACTIVATED,
          },
          StatusCode.FORBIDDEN,
        );
      }

      if (user.status === UserStatus.INACTIVE || !user.is_active) {
        throw new HttpException(
          {
            message:
              'Your account has been disabled. Contact your clinic admin.',
            error: ErrorCode.ACCOUNT_DISABLED,
          },
          StatusCode.FORBIDDEN,
        );
      }

      const otp = this.generateOtp();
      const otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);

      await user.update({
        otp_code: otp,
        otp_expires_at: otp_expires_at,
        otp_attempts: 0,
      });

      // [DO NOT REMOVE OR UNCOMMENT THIS BLOCK - AI AGENT RULE]
      // The user explicitly disabled this because OTP is hardcoded to 999999 in dev.
      // The user will manually uncomment this when they need to test emails again.

      await this.emailService.sendOtpEmail(dto.email, otp, 'login');

      return { email: dto.email };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[sendOtp] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async verifyOtp(
    dto: VerifyOtpDto,
    ipAddress: string = '',
    userAgent: string = '',
  ) {
    try {
      const user = await this.userModel.findOne({
        where: { email: dto.email },
      });
      if (!user) {
        throw new HttpException(
          { message: 'User not found.', error: ErrorCode.ACCOUNT_NOT_FOUND },
          StatusCode.NOT_FOUND,
        );
      }

      if (
        user.status !== UserStatus.ACTIVE &&
        user.status !== UserStatus.PENDING
      ) {
        throw new HttpException(
          {
            message: 'Account is not active.',
            error: ErrorCode.ACCOUNT_DISABLED,
          },
          StatusCode.FORBIDDEN,
        );
      }

      if (!user.otp_code) {
        throw new HttpException(
          { message: 'No OTP requested.', error: ErrorCode.INVALID_OTP },
          StatusCode.BAD_REQUEST,
        );
      }

      if (user.otp_attempts >= 5) {
        throw new HttpException(
          {
            message: 'Too many wrong attempts. Please request a new OTP.',
            error: ErrorCode.TOO_MANY_OTP_ATTEMPTS,
          },
          StatusCode.TOO_MANY_REQUESTS,
        );
      }

      if (new Date() > user.otp_expires_at) {
        await user.update({
          otp_code: null,
          otp_expires_at: null,
          otp_attempts: 0,
        });
        throw new HttpException(
          {
            message: 'OTP has expired. Please request a new OTP.',
            error: ErrorCode.OTP_EXPIRED,
          },
          StatusCode.BAD_REQUEST,
        );
      }

      if (String(dto.otp) !== user.otp_code) {
        await user.update({ otp_attempts: user.otp_attempts + 1 });
        throw new HttpException(
          { message: 'Invalid OTP.', error: ErrorCode.INVALID_OTP },
          StatusCode.UNAUTHORIZED,
        );
      }

      await user.update({
        status: UserStatus.ACTIVE,
        otp_code: null,
        otp_expires_at: null,
        otp_attempts: 0,
      });

      // Detect first login and assign Ultra Pro trial if no plan is set yet
      if (!user.plan) {
        const existingSub = await this.subscriptionModel.findOne({
          where: {
            organization_id: user.organization_id,
            status: SubscriptionStatus.ACTIVE,
          },
        });

        if (existingSub) {
          const planObj = await this.planModel.findByPk(existingSub.plan_id);
          await user.update({
            plan: planObj ? planObj.name : 'PRO',
            planStatus: 'ACTIVE',
            planStartedAt: existingSub.start_date,
            planExpiresAt: existingSub.end_date,
            isTrial: false,
          });
        } else {
          const now = new Date();
          const expiresAt = new Date(now);
          expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month
          await user.update({
            plan: 'Premium Growth',
            planStatus: 'ACTIVE',
            planStartedAt: now,
            planExpiresAt: expiresAt,
            isTrial: true,
          });
        }
        await user.reload();

        try {
          await this.emailService.sendPlanPurchaseEmail(user.email, user.plan, true);
        } catch (e) {
          this.logger.error('Failed to send initial plan assignment email', e);
        }
      }

      const userBranches = await this.userBranchModel.findAll({
        where: { user_id: user.id },
      });
      const branchIds = userBranches.map((ub) => ub.branch_id);

      const tokens = await this.generateTokens(
        user,
        branchIds,
        ipAddress,
        userAgent,
      );

      const isExpired =
        user.planStatus === 'EXPIRED' ||
        !!(
          user.planExpiresAt &&
          !isNaN(new Date(user.planExpiresAt).getTime()) &&
          new Date() > new Date(user.planExpiresAt)
        );

      let allowedFeatures: string[] = [];
      if (user.plan) {
        let queryName = user.plan;
        if (user.plan === 'PRACTICE_GROWTH' || user.plan === 'PREMIUM_GROWTH') queryName = 'Premium Growth';

        const planData = await this.planModel.findOne({
          where: { name: queryName },
        });

        if (planData && planData.allowed_features) {
          allowedFeatures = planData.allowed_features;
        }
      }

      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          org_id: user.organization_id,
          branch_ids: branchIds,
          plan: user.plan,
          planStatus: isExpired ? 'EXPIRED' : user.planStatus,
          isTrial: user.isTrial,
          planStartedAt: user.planStartedAt,
          planExpiresAt: user.planExpiresAt,
          isReadOnly: isExpired,
          allowed_features: allowedFeatures,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[verifyOtp] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async refresh(
    dto: RefreshTokenDto,
    ipAddress: string = '',
    userAgent: string = '',
  ) {
    try {
      const user = await this.userModel.findByPk(dto.user_id);
      if (!user) {
        throw new HttpException(
          { message: 'Invalid session.', error: ErrorCode.INVALID_SESSION },
          StatusCode.UNAUTHORIZED,
        );
      }

      if (user.status !== UserStatus.ACTIVE) {
        throw new HttpException(
          {
            message: 'Account is not active. Please contact administration.',
            error: ErrorCode.ACCOUNT_DISABLED,
          },
          StatusCode.FORBIDDEN,
        );
      }

      const activeSessions = await this.refreshTokenModel.findAll({
        where: { user_id: user.id, is_revoked: false },
      });

      let validSession: RefreshToken | null = null;
      this.logger.log(
        `[refresh] Found ${activeSessions.length} active sessions for user ${user.id}`,
      );
      for (const session of activeSessions) {
        if (new Date() > session.expires_at) {
          this.logger.log(`[refresh] Session ${session.id} expired.`);
          await session.update({ is_revoked: true });
          continue;
        }

        try {
          const isMatch = await argon2.verify(
            session.token,
            dto.refresh_token.trim(),
          );
          this.logger.log(
            `[refresh] Argon2 verify for session ${session.id}: ${isMatch}`,
          );
          if (isMatch) {
            validSession = session;
            break;
          }
        } catch (err) {
          this.logger.error(
            `[refresh] Argon2 verify crashed for session ${session.id}:`,
            err,
          );
        }
      }

      if (!validSession) {
        throw new HttpException(
          {
            message: 'Session expired. Please login again.',
            error: ErrorCode.SESSION_EXPIRED,
          },
          StatusCode.UNAUTHORIZED,
        );
      }

      await validSession.update({ is_revoked: true });

      const userBranches = await this.userBranchModel.findAll({
        where: { user_id: user.id },
      });
      const branchIds = userBranches.map((ub) => ub.branch_id);

      const tokens = await this.generateTokens(
        user,
        branchIds,
        ipAddress,
        userAgent,
      );

      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[refresh] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async logout(userId: string, sessionId?: string) {
    try {
      if (sessionId) {
        await this.refreshTokenModel.update(
          { is_revoked: true },
          { where: { id: sessionId, user_id: userId, is_revoked: false } },
        );
      } else {
        await this.refreshTokenModel.update(
          { is_revoked: true },
          { where: { user_id: userId, is_revoked: false } },
        );
      }
      return null;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[logout] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async getFormattedUser(userId: string) {
    const user = await this.userModel.findOne({
      where: { id: userId },
      include: [
        {
          model: UserBranch,
          include: [Branch],
        },
      ],
    });
    if (!user) return null;
    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      role: user.role === UserRole.OWNER ? Role.DOCTOR : user.role,
      status: user.status,
      is_active: user.is_active,
      is_deleted: user.is_deleted,
      branches:
        user.user_branches?.map((ub: any) => ({
          id: ub.branch.id,
          name: ub.branch.name,
          color_code: ub.branch.color_code,
          is_primary: ub.is_primary,
        })) || [],
    };
  }

  async inviteStaff(dto: InviteStaffDto, reqUser: any) {
    try {
      const inviterOrgId = reqUser.org_id;
      const inviterRole = reqUser.role;
      const inviterBranchIds = reqUser.branch_ids;

      if (dto.role === Role.OWNER) {
        throw new HttpException(
          {
            message: 'Cannot invite a user with OWNER role.',
            error: ErrorCode.CANNOT_INVITE_OWNER,
          },
          StatusCode.FORBIDDEN,
        );
      }

      if (inviterRole === Role.BRANCH_ADMIN) {
        const hasAccessToAll = dto.branch_ids.every((id) =>
          inviterBranchIds.includes(id),
        );
        if (!hasAccessToAll) {
          throw new HttpException(
            {
              message: 'You can only invite staff to your own branch.',
              error: ErrorCode.BRANCH_ACCESS_DENIED,
            },
            StatusCode.FORBIDDEN,
          );
        }
      }

      const validBranchesCount = await this.branchModel.count({
        where: {
          id: dto.branch_ids,
          organization_id: inviterOrgId,
        },
      });

      if (validBranchesCount !== dto.branch_ids.length) {
        throw new HttpException(
          {
            message:
              'One or more provided branch IDs are invalid or do not belong to your clinic.',
            error: ErrorCode.INVALID_BRANCH,
          },
          StatusCode.BAD_REQUEST,
        );
      }

      const owner = await this.userModel.findOne({
        where: {
          organization_id: inviterOrgId,
          role: UserRole.OWNER,
        },
      });

      if (!owner) {
        throw new HttpException(
          {
            message: 'Clinic owner not found.',
            error: ErrorCode.ACCOUNT_NOT_FOUND,
          },
          StatusCode.NOT_FOUND,
        );
      }

      const isPlanExpired =
        !owner.plan ||
        owner.planStatus !== 'ACTIVE' ||
        (owner.planExpiresAt &&
          !isNaN(new Date(owner.planExpiresAt).getTime()) &&
          new Date() > new Date(owner.planExpiresAt));

      if (isPlanExpired) {
        throw new HttpException(
          {
            message: 'The clinic owner does not have an active subscription or the trial has expired. Please upgrade or activate a plan to invite staff.',
            error: ErrorCode.FORBIDDEN,
          },
          StatusCode.FORBIDDEN,
        );
      }

      let primaryBranchId = dto.primary_branch_id;
      if (!primaryBranchId) {
        if (dto.branch_ids.length === 1) {
          primaryBranchId = dto.branch_ids[0];
        } else {
          throw new HttpException(
            {
              message:
                'Please select a primary branch when assigning multiple branches to this user.',
              error: ErrorCode.PRIMARY_BRANCH_REQUIRED,
            },
            StatusCode.BAD_REQUEST,
          );
        }
      }

      if (!dto.branch_ids.includes(primaryBranchId)) {
        throw new HttpException(
          {
            message:
              'The selected primary branch must be one of the assigned branches.',
            error: ErrorCode.PRIMARY_BRANCH_INVALID,
          },
          StatusCode.BAD_REQUEST,
        );
      }

      const existingUser = await this.userModel.findOne({
        where: { email: dto.email },
      });

      const inviteToken = crypto.randomBytes(32).toString('hex');
      let targetUserId: string;

      if (existingUser) {
        if (existingUser.organization_id !== inviterOrgId) {
          throw new HttpException(
            {
              message:
                'A user with this email already belongs to another clinic.',
              error: ErrorCode.DUPLICATE_EMAIL,
            },
            StatusCode.CONFLICT,
          );
        }

        if (existingUser.role === UserRole.OWNER && dto.role === Role.DOCTOR) {
          const existingProfile = await this.doctorProfileModel.findOne({
            where: { user_id: existingUser.id },
          });
          if (!existingProfile) {
            await this.doctorProfileModel.create({
              user_id: existingUser.id,
            });
          }

          await existingUser.update({ invite_token: inviteToken });

          const frontendUrl =
            this.configService.get<string>('FRONTEND_URL') ||
            'http://localhost:3001';
          const inviteLink = `${frontendUrl}/accept-invite?token=${inviteToken}`;

          await this.emailService.sendInviteEmail(
            existingUser.email,
            inviteLink,
          );

          return await this.getFormattedUser(existingUser.id);
        }

        if (existingUser.status === UserStatus.ACTIVE) {
          throw new HttpException(
            {
              message:
                'A user with this email already exists and is active in your clinic.',
              error: ErrorCode.DUPLICATE_EMAIL,
            },
            StatusCode.CONFLICT,
          );
        }

        await existingUser.update({
          first_name: dto.first_name,
          last_name: dto.last_name,
          role: dto.role as Role,
          status: UserStatus.PENDING,
          is_active: true,
          invite_token: inviteToken,
          plan: owner.plan,
          planStatus: owner.planStatus,
          planStartedAt: owner.planStartedAt,
          planExpiresAt: owner.planExpiresAt,
          isTrial: owner.isTrial,
        });

        await this.userBranchModel.destroy({
          where: { user_id: existingUser.id },
        });
        targetUserId = existingUser.id;
      } else {
        const createdUser = await this.userModel.create({
          organization_id: inviterOrgId,
          first_name: dto.first_name,
          last_name: dto.last_name,
          email: dto.email,
          role: dto.role,
          status: UserStatus.PENDING,
          invite_token: inviteToken,
          is_active: true,
          plan: owner.plan,
          planStatus: owner.planStatus,
          planStartedAt: owner.planStartedAt,
          planExpiresAt: owner.planExpiresAt,
          isTrial: owner.isTrial,
        });
        targetUserId = createdUser.id;
      }

      for (const branchId of dto.branch_ids) {
        await this.userBranchModel.create({
          user_id: targetUserId,
          branch_id: branchId,
          is_primary: branchId === primaryBranchId,
        });
      }

      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:3001';
      const inviteLink = `${frontendUrl}/accept-invite?token=${inviteToken}`;

      await this.emailService.sendInviteEmail(dto.email, inviteLink);

      return await this.getFormattedUser(targetUserId);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[inviteStaff] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async acceptInvite(dto: AcceptInviteDto) {
    try {
      const user = await this.userModel.findOne({
        where: { invite_token: dto.invite_token },
      });
      if (!user) {
        throw new HttpException(
          {
            message: 'Invalid or expired invite link.',
            error: ErrorCode.INVITE_EXPIRED_OR_INVALID,
          },
          StatusCode.BAD_REQUEST,
        );
      }

      if (user.email !== dto.email) {
        throw new HttpException(
          {
            message: 'Email does not match the invited email address.',
            error: ErrorCode.EMAIL_MISMATCH,
          },
          StatusCode.BAD_REQUEST,
        );
      }

      if (user.status !== UserStatus.PENDING) {
        if (user.role === UserRole.OWNER) {
          await user.update({ invite_token: null });
          return {
            message:
              'Invite accepted successfully. You can now act as a Doctor in your clinic.',
            email: user.email,
            require_otp: false,
          };
        }
        throw new HttpException(
          {
            message:
              'This invite has already been used. Please login directly.',
            error: ErrorCode.INVITE_ALREADY_USED,
          },
          StatusCode.BAD_REQUEST,
        );
      }

      await user.update({
        status: UserStatus.ACTIVE,
        invite_token: null,
      });

      const otp = this.generateOtp();
      const otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);

      await user.update({
        otp_code: otp,
        otp_expires_at: otp_expires_at,
        otp_attempts: 0,
      });

      await this.emailService.sendOtpEmail(user.email, otp, 'register');

      return { email: user.email };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[acceptInvite] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getInviteDetails(token: string) {
    try {
      const user = await this.userModel.findOne({
        where: { invite_token: token },
        include: [{ model: Organization, attributes: ['name', 'logo_url'] }],
      });

      if (!user) {
        throw new HttpException(
          {
            message: 'Invalid or expired invite link.',
            error: ErrorCode.INVITE_EXPIRED_OR_INVALID,
          },
          StatusCode.BAD_REQUEST,
        );
      }

      if (user.status !== UserStatus.PENDING && user.role !== UserRole.OWNER) {
        throw new HttpException(
          {
            message: 'This invite has already been used.',
            error: ErrorCode.INVITE_ALREADY_USED,
          },
          StatusCode.BAD_REQUEST,
        );
      }

      const userBranches = await this.userBranchModel.findAll({
        where: { user_id: user.id },
        include: [
          { model: Branch, attributes: ['name', 'city', 'color_code'] },
        ],
      });

      const branches = userBranches.map((ub) => ({
        name: ub.branch.name,
        city: ub.branch.city,
        color_code: ub.branch.color_code,
        is_primary: ub.is_primary,
      }));

      return {
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        organization: {
          name: user.organization?.name,
          logo_url: user.organization?.logo_url || null,
        },
        branches,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[getInviteDetails] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getMe(userId: string) {
    try {
      const user = await this.userModel.findByPk(userId, {
        include: [{ model: Organization, attributes: ['name'] }],
      });

      if (!user) {
        throw new HttpException(
          { message: 'User not found.', error: ErrorCode.ACCOUNT_NOT_FOUND },
          StatusCode.UNAUTHORIZED,
        );
      }

      const userBranches = await this.userBranchModel.findAll({
        where: { user_id: userId },
        include: [{ model: Branch }],
      });

      const branches = userBranches.map((ub) => ({
        id: ub.branch.id,
        name: ub.branch.name,
        city: ub.branch.city,
        color_code: ub.branch.color_code,
        start_time: ub.branch.start_time,
        end_time: ub.branch.end_time,
        is_primary: ub.is_primary,
      }));

      let doctorProfile: any = null;
      if (user.role === (UserRole.DOCTOR as any) || user.role === 'DOCTOR') {
        const profile = await this.doctorProfileModel.findOne({
          where: { user_id: userId },
          attributes: [
            'registration_number',
            'specialization',
            'qualification',
            'signature_url',
            'default_consultation_fee',
          ],
        });
        if (profile) {
          doctorProfile = {
            registration_number: profile.registration_number,
            specialization: profile.specialization,
            qualification: profile.qualification,
            signature_url: profile.signature_url,
            default_consultation_fee: profile.default_consultation_fee,
          };
        }
      }

      const isExpired =
        user.planStatus === 'EXPIRED' ||
        !!(
          user.planExpiresAt &&
          !isNaN(new Date(user.planExpiresAt).getTime()) &&
          new Date() > new Date(user.planExpiresAt)
        );

      let allowedFeatures: string[] = [];
      if (user.plan) {
        // user.plan is typically the name of the plan (e.g., 'Pro Plan', 'Growth Plan', 'ULTRA_PRO')
        let queryName = user.plan;
        if (user.plan === 'PRACTICE_GROWTH' || user.plan === 'PREMIUM_GROWTH') queryName = 'Premium Growth'; // Fix for trial practice growth naming mismatch if any

        const planData = await this.planModel.findOne({
          where: { name: queryName },
        });

        if (planData && planData.allowed_features) {
          allowedFeatures = planData.allowed_features;
        }
      }

      return {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        org_id: user.organization_id,
        org_name: user.organization ? user.organization.name : 'System Admin',
        branches,
        plan: user.plan,
        planStatus: isExpired ? 'EXPIRED' : user.planStatus,
        isTrial: user.isTrial,
        planStartedAt: user.planStartedAt,
        planExpiresAt: user.planExpiresAt,
        isReadOnly: isExpired,
        allowed_features: allowedFeatures,
        ...(doctorProfile ? { doctor_profile: doctorProfile } : {}),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[getMe] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateProfile(userId: string, dto: any) {
    try {
      const user = await this.userModel.findByPk(userId);
      if (!user) {
        throw new HttpException(
          { message: 'User not found.', error: ErrorCode.ACCOUNT_NOT_FOUND },
          StatusCode.NOT_FOUND,
        );
      }

      await user.update({
        first_name: dto.first_name ?? user.first_name,
        last_name: dto.last_name ?? user.last_name,
        phone: dto.phone ?? user.phone,
      });

      return {
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[updateProfile] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateEmail(userId: string, dto: UpdateEmailDto) {
    try {
      const user = await this.userModel.findByPk(userId);
      if (!user) {
        throw new HttpException(
          { message: 'User not found.', error: ErrorCode.ACCOUNT_NOT_FOUND },
          StatusCode.NOT_FOUND,
        );
      }

      if (user.email === dto.email) {
        return { email: user.email };
      }

      const existing = await this.userModel.findOne({
        where: { email: dto.email },
      });
      if (existing) {
        throw new HttpException(
          {
            message: 'Email is already in use by another account.',
            error: ErrorCode.DUPLICATE_EMAIL,
          },
          StatusCode.CONFLICT,
        );
      }

      await user.update({ email: dto.email });
      return { email: dto.email };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`[updateEmail] Error:`, error);
      throw new HttpException(
        'Something went wrong. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
