import { IsString, IsUUID, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @IsUUID()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}
