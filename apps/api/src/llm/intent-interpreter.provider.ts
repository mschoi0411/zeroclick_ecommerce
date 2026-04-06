import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { INTENT_INTERPRETER } from './intent-interpreter';
import { MockIntentInterpreterService } from './mock-intent-interpreter.service';
import { OpenAiIntentInterpreterService } from './openai-intent-interpreter.service';

const logger = new Logger('IntentInterpreterProvider');

export const intentInterpreterProvider = {
  provide: INTENT_INTERPRETER,
  inject: [
    ConfigService,
    MockIntentInterpreterService,
    OpenAiIntentInterpreterService,
  ],
  useFactory: (
    configService: ConfigService,
    mockInterpreter: MockIntentInterpreterService,
    openAiInterpreter: OpenAiIntentInterpreterService,
  ) => {
    const provider =
      configService.get<string>('LLM_PROVIDER')?.trim() || 'openai';
    const apiKey = configService.get<string>('LLM_API_KEY')?.trim();

    if (provider === 'openai' && apiKey) {
      logger.log('Using OpenAI intent interpreter');
      return openAiInterpreter;
    }

    logger.warn(
      'LLM_API_KEY is missing or provider is unsupported. Falling back to mock intent interpreter.',
    );
    return mockInterpreter;
  },
};
