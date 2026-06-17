import { Injectable, HttpException } from '@nestjs/common';
import { StatusCode } from '../../common/enums/status-code.enum';
import { InjectModel } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

import { Organization } from '../organization/entities/organization.model';
import { Branch } from '../organization/entities/branch.model';
import { User, UserStatus } from './entities/user.model';
import { UserBranch } from './entities/user-branch.model';
import { RefreshToken } from './entities/refresh-token.model';

import { RegisterDto } from './dto/register.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { Role } from '../../common/enums/role.enum';

import { Sequelize } from 'sequelize-typescript';
import { InjectConnection } from '@nestjs/sequelize';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Organization) private orgModel: typeof Organization,
    @InjectModel(Branch) private branchModel: typeof Branch,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(UserBranch) private userBranchModel: typeof UserBranch,
    @InjectModel(RefreshToken) private refreshTokenModel: typeof RefreshToken,
    private configService: ConfigService,
    private jwtService: JwtService,
    @InjectConnection() private sequelize: Sequelize,
  ) {}

  private generateOtp(): string {
    if (this.configService.get('NODE_ENV') === 'development') {
      return '999999';
    } else {
      return Math.floor(100000 + Math.random() * 900000).toString();
    }
  }

  private async sendEmail(to: string, subject: string, body: string) {
    if (this.configService.get('NODE_ENV') === 'development') {
      console.log('===== DEV EMAIL =====');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('Body:', body);
      console.log('=====================');
      return;
    }

    try {
      const apiKey = this.configService.get<string>('BREVO_API_KEY');
      const senderEmail = this.configService.get<string>('MAIL_FROM') || 'noreply@dentalapp.com';
      
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': apiKey as string,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'Dental App', email: senderEmail },
          to: [{ email: to }],
          subject: subject,
          htmlContent: `<html><body><p>${body}</p></body></html>`
        })
      });

      if (!response.ok) {
        console.error('Brevo API error:', await response.text());
      }
    } catch (error) {
      console.error('Email sending failed:', error);
      // We log but don't strictly throw here, to avoid breaking flows if Brevo drops an email
    }
  }

  private async generateTokens(user: User, branchIds: string[]) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await argon2.hash(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const refreshToken = await this.refreshTokenModel.create({
      user_id: user.id,
      token: tokenHash,
      expires_at: expiresAt,
      is_revoked: false
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
    const existingUser = await this.userModel.findOne({ where: { email: dto.email } });
    if (existingUser) {
      throw new HttpException('An account with this email already exists', StatusCode.CONFLICT);
    }

    const existingPhone = await this.userModel.findOne({ where: { phone: dto.phone } });
    if (existingPhone) {
      throw new HttpException('An account with this phone already exists', StatusCode.CONFLICT);
    }

    const transaction = await this.sequelize.transaction();

    try {
      const createdOrg = await this.orgModel.create({
        name: dto.org_name,
        phone: dto.phone,
        is_active: true
      }, { transaction });

      const branchName = (dto.branch_name && dto.branch_name.trim() !== '') ? dto.branch_name : dto.org_name;

      const createdBranch = await this.branchModel.create({
        organization_id: createdOrg.id,
        name: branchName,
        city: dto.branch_city,
        phone: dto.branch_phone,
        color_code: '#3B82F6',
        is_active: true
      }, { transaction });

      const otp = this.generateOtp();
      const otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);

      const createdUser = await this.userModel.create({
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
        is_active: true
      }, { transaction });

      await this.userBranchModel.create({
        user_id: createdUser.id,
        branch_id: createdBranch.id,
        is_primary: true,
      }, { transaction });

      await this.sendEmail(
        dto.email,
        'Verify your email — Dental App',
        `Your OTP is: ${otp}. Valid for 10 minutes.`
      );

      await transaction.commit();
      return { email: dto.email };
    } catch (error) {
      await transaction.rollback();
      console.error('Registration failed:', error);
      throw new HttpException({ message: 'Something went wrong. Please try again.', error: error.message || error.toString() }, StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async sendOtp(dto: SendOtpDto) {
    try {
      const user = await this.userModel.findOne({ where: { email: dto.email } });
      if (!user) {
        throw new HttpException('No account found with this email', StatusCode.NOT_FOUND);
      }

      if (user.status === UserStatus.PENDING && !user.invite_token) {
        // Registered but unverified — allow OTP resend
      } else if (user.status === UserStatus.PENDING) {
        throw new HttpException('Account not activated. Please use your invite link.', StatusCode.FORBIDDEN);
      }

      if (user.status === UserStatus.INACTIVE || !user.is_active) {
        throw new HttpException('Your account has been disabled. Contact your clinic admin.', StatusCode.FORBIDDEN);
      }

      const otp = this.generateOtp();
      const otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);

      await user.update({
        otp_code: otp,
        otp_expires_at: otp_expires_at,
        otp_attempts: 0,
      });

      await this.sendEmail(
        dto.email,
        'Your login OTP — Dental App',
        `Your OTP is: ${otp}. Valid for 10 minutes. Do not share.`
      );

      return { email: dto.email };
    } catch (error) {
      if (error.status) throw error;
      console.error(error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async verifyOtp(dto: VerifyOtpDto) {
    try {
      const user = await this.userModel.findOne({ where: { email: dto.email } });
      if (!user) {
        throw new HttpException('No account found with this email', StatusCode.NOT_FOUND);
      }

      if (!user.otp_code) {
        throw new HttpException('No OTP requested. Please request a new OTP first.', StatusCode.BAD_REQUEST);
      }

      if (user.otp_attempts >= 3) {
        // Technically throws 429 TooManyRequests
        throw new HttpException('Too many wrong attempts. Please request a new OTP.', StatusCode.TOO_MANY_REQUESTS);
      }

      if (new Date() > user.otp_expires_at) {
        await user.update({ otp_code: null, otp_expires_at: null, otp_attempts: 0 });
        throw new HttpException('OTP has expired. Please request a new OTP.', StatusCode.BAD_REQUEST);
      }

      if (String(dto.otp) !== user.otp_code) {
        await user.update({ otp_attempts: user.otp_attempts + 1 });
        throw new HttpException('Invalid OTP.', StatusCode.UNAUTHORIZED);
      }

      await user.update({
        status: UserStatus.ACTIVE,
        otp_code: null,
        otp_expires_at: null,
        otp_attempts: 0,
      });

      const userBranches = await this.userBranchModel.findAll({ where: { user_id: user.id } });
      const branchIds = userBranches.map(ub => ub.branch_id);

      const tokens = await this.generateTokens(user, branchIds);

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
        }
      };
    } catch (error) {
      if (error.status) throw error;
      console.error(error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async refresh(dto: RefreshTokenDto) {
    try {
      const user = await this.userModel.findByPk(dto.user_id);
      if (!user) {
        throw new HttpException('Invalid session.', StatusCode.UNAUTHORIZED);
      }

      if (user.status !== UserStatus.ACTIVE) {
        throw new HttpException('Account is not active. Please contact administration.', StatusCode.FORBIDDEN);
      }

      const activeSessions = await this.refreshTokenModel.findAll({
        where: { user_id: user.id, is_revoked: false }
      });

      let validSession: RefreshToken | null = null;
      for (const session of activeSessions) {
        if (new Date() > session.expires_at) {
          await session.update({ is_revoked: true });
          continue;
        }
        const isMatch = await argon2.verify(session.token, dto.refresh_token);
        if (isMatch) {
          validSession = session;
          break;
        }
      }

      if (!validSession) {
        throw new HttpException('Session expired. Please login again.', StatusCode.UNAUTHORIZED);
      }

      await validSession.update({ is_revoked: true });

      const userBranches = await this.userBranchModel.findAll({ where: { user_id: user.id } });
      const branchIds = userBranches.map(ub => ub.branch_id);

      const tokens = await this.generateTokens(user, branchIds);

      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token
      };
    } catch (error) {
      if (error.status) throw error;
      console.error(error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async logout(userId: string) {
    try {
      await this.refreshTokenModel.update(
        { is_revoked: true },
        { where: { user_id: userId, is_revoked: false } }
      );
      return null;
    } catch (error) {
      console.error(error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async inviteStaff(dto: InviteStaffDto, reqUser: any) {
    try {
      const inviterOrgId = reqUser.org_id;
      const inviterRole = reqUser.role;
      const inviterBranchIds = reqUser.branch_ids;

      if (dto.role === Role.OWNER) {
        throw new HttpException('Cannot invite a user with OWNER role.', StatusCode.FORBIDDEN);
      }

      if (inviterRole === Role.BRANCH_ADMIN) {
        const hasAccessToAll = dto.branch_ids.every(id => inviterBranchIds.includes(id));
        if (!hasAccessToAll) {
          throw new HttpException('You can only invite staff to your own branch.', StatusCode.FORBIDDEN);
        }
      }

      let primaryBranchId = dto.primary_branch_id;
      if (!primaryBranchId) {
        if (dto.branch_ids.length === 1) {
          primaryBranchId = dto.branch_ids[0];
        } else {
          throw new HttpException('Please select a primary branch when assigning multiple branches to this user.', StatusCode.BAD_REQUEST);
        }
      }

      if (!dto.branch_ids.includes(primaryBranchId)) {
        throw new HttpException('The selected primary branch must be one of the assigned branches.', StatusCode.BAD_REQUEST);
      }

      const existingUser = await this.userModel.findOne({
        where: { email: dto.email, organization_id: inviterOrgId }
      });

      if (existingUser) {
        throw new HttpException('A user with this email already exists in your clinic.', StatusCode.CONFLICT);
      }

      const inviteToken = crypto.randomBytes(32).toString('hex');

      const createdUser = await this.userModel.create({
        organization_id: inviterOrgId,
        first_name: dto.first_name,
        last_name: dto.last_name,
        email: dto.email,
        role: dto.role as Role,
        status: UserStatus.PENDING,
        invite_token: inviteToken,
        is_active: true
      });

      for (const branchId of dto.branch_ids) {
        await this.userBranchModel.create({
          user_id: createdUser.id,
          branch_id: branchId,
          is_primary: branchId === primaryBranchId
        });
      }

      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
      const inviteLink = `${frontendUrl}/accept-invite?token=${inviteToken}`;

      await this.sendEmail(
        dto.email,
        'You are invited to join Dental App',
        `You have been invited as ${dto.role}. Click to activate your account: ${inviteLink}. This link does not expire until you use it.`
      );

      return {
        email: dto.email,
        role: dto.role,
        invite_token: inviteToken
      };
    } catch (error) {
      if (error.status) throw error;
      console.error(error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async acceptInvite(dto: AcceptInviteDto) {
    try {
      const user = await this.userModel.findOne({ where: { invite_token: dto.invite_token } });
      if (!user) {
        throw new HttpException('Invalid or expired invite link.', StatusCode.BAD_REQUEST);
      }

      if (user.email !== dto.email) {
        throw new HttpException('Email does not match the invited email address.', StatusCode.BAD_REQUEST);
      }

      if (user.status !== UserStatus.PENDING) {
        throw new HttpException('This invite has already been used. Please login directly.', StatusCode.BAD_REQUEST);
      }

      await user.update({
        status: UserStatus.ACTIVE,
        invite_token: null
      });

      const otp = this.generateOtp();
      const otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);

      await user.update({
        otp_code: otp,
        otp_expires_at: otp_expires_at,
        otp_attempts: 0
      });

      await this.sendEmail(
        user.email,
        'Your login OTP — Dental App',
        `Your account is activated. OTP: ${otp}. Valid for 10 minutes.`
      );

      return { email: user.email };
    } catch (error) {
      if (error.status) throw error;
      console.error(error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getMe(userId: string) {
    try {
      const user = await this.userModel.findByPk(userId, {
        include: [{ model: Organization, attributes: ['name'] }]
      });

      if (!user) {
        throw new HttpException('User not found.', StatusCode.UNAUTHORIZED);
      }

      const userBranches = await this.userBranchModel.findAll({
        where: { user_id: userId },
        include: [{ model: Branch }]
      });

      const branches = userBranches.map(ub => ({
        id: ub.branch.id,
        name: ub.branch.name,
        city: ub.branch.city,
        color_code: ub.branch.color_code,
        is_primary: ub.is_primary
      }));

      return {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        org_id: user.organization_id,
        org_name: user.organization.name,
        branches
      };
    } catch (error) {
      if (error.status) throw error;
      console.error(error);
      throw new HttpException('Something went wrong. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }
}
