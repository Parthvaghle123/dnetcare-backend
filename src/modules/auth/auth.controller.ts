import { Controller, Post, Body, Get, UseGuards, HttpCode } from '@nestjs/common';
import { StatusCode } from '../../common/enums/status-code.enum';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const data = await this.authService.register(dto);
    return {
      message: 'OTP sent to your email. Please verify to activate your account.',
      data
    };
  }

  @Post('send-otp')
  @HttpCode(StatusCode.OK)
  async sendOtp(@Body() dto: SendOtpDto) {
    const data = await this.authService.sendOtp(dto);
    return {
      message: 'OTP sent to your email.',
      data
    };
  }

  @Post('verify-otp')
  @HttpCode(StatusCode.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    const data = await this.authService.verifyOtp(dto);
    return {
      message: 'Login successful.',
      data
    };
  }

  @Post('refresh')
  @HttpCode(StatusCode.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    const data = await this.authService.refresh(dto);
    return {
      message: 'Token refreshed.',
      data
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(StatusCode.OK)
  async logout(@CurrentUser() user: any) {
    await this.authService.logout(user.sub);
    return {
      message: 'Logged out successfully.',
      data: null
    };
  }

  @Post('invite-staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.BRANCH_ADMIN)
  async inviteStaff(@Body() dto: InviteStaffDto, @CurrentUser() user: any) {
    const data = await this.authService.inviteStaff(dto, user);
    return {
      message: `Invitation sent to ${dto.email}`,
      data
    };
  }

  @Post('accept-invite')
  @HttpCode(StatusCode.OK)
  async acceptInvite(@Body() dto: AcceptInviteDto) {
    const data = await this.authService.acceptInvite(dto);
    return {
      message: 'Account activated. OTP sent to your email to complete login.',
      data
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: any) {
    const data = await this.authService.getMe(user.sub);
    return {
      message: 'User profile fetched.',
      data
    };
  }
}
