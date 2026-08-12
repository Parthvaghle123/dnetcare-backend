import { IsNotEmpty, IsString, IsOptional, IsUrl } from 'class-validator';

export class CreateSupportTicketDto {
  @IsNotEmpty({ message: 'Problem name is required.' })
  @IsString({ message: 'Problem name must be a string.' })
  problem_name: string;

  @IsNotEmpty({ message: 'Description is required.' })
  @IsString({ message: 'Description must be a string.' })
  description: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsString()
  video_url?: string;
}
