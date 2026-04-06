import { Body, Controller, Post } from '@nestjs/common';
import { ChatMessageDto } from '../dto/chat-message.dto';
import { ChatOrchestratorService } from '../services/chat-orchestrator.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly orchestrator: ChatOrchestratorService) {}

  @Post('message')
  async reply(@Body() body: ChatMessageDto) {
    return this.orchestrator.handleMessage(body.message);
  }
}
