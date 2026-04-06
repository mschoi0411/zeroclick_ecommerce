import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsController } from './controllers/analytics.controller';
import { CartController } from './controllers/cart.controller';
import { CatalogController } from './controllers/catalog.controller';
import { ChatController } from './controllers/chat.controller';
import { OrdersController } from './controllers/orders.controller';
import { intentInterpreterProvider } from './llm/intent-interpreter.provider';
import { MockIntentInterpreterService } from './llm/mock-intent-interpreter.service';
import { OpenAiIntentInterpreterService } from './llm/openai-intent-interpreter.service';
import { PrismaService } from './prisma/prisma.service';
import { COMMERCE_REPOSITORY } from './repositories/commerce.repository';
import { PrismaCommerceRepository } from './repositories/prisma-commerce.repository';
import { ChatOrchestratorService } from './services/chat-orchestrator.service';
import { CommerceService } from './services/commerce.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api/.env', '.env'],
    }),
  ],
  controllers: [
    CatalogController,
    CartController,
    OrdersController,
    AnalyticsController,
    ChatController,
  ],
  providers: [
    PrismaService,
    CommerceService,
    ChatOrchestratorService,
    PrismaCommerceRepository,
    MockIntentInterpreterService,
    OpenAiIntentInterpreterService,
    {
      provide: COMMERCE_REPOSITORY,
      useExisting: PrismaCommerceRepository,
    },
    intentInterpreterProvider,
  ],
})
export class AppModule {}
