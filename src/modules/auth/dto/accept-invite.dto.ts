import { IsString, IsEmail, IsNotEmpty } from 'class-validator';

export class AcceptInviteDto {
  @IsString()
  @IsNotEmpty()
  invite_token: string;

  @IsEmail()
  email: string;
}
