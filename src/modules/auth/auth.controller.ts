import { Controller, Post, Body, Get, Delete, Patch, Param, UseGuards, HttpCode, Ip, Headers, Query, Put } from '@nestjs/common';
import { StatusCode } from '../../common/enums/status-code.enum';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

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
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const data = await this.authService.verifyOtp(dto, ip, userAgent);
    return {
      message: 'Login successful.',
      data
    };
  }

  @Post('refresh')
  @HttpCode(StatusCode.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const data = await this.authService.refresh(dto, ip, userAgent);
    return {
      message: 'Token refreshed.',
      data
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(StatusCode.OK)
  async logout(@CurrentUser() user: any) {
    // Perfectly revoke only the current session using the session_id embedded in the Access Token
    await this.authService.logout(user.sub, user.session_id);
    return {
      message: 'Logged out successfully.',
      data: null
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
