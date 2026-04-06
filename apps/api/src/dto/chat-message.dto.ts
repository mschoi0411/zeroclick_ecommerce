import { IsString } from 'class-validator';

export class ChatMessageDto {
  @IsString()
  message!: string;
}
