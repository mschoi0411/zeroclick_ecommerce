import type { InterpretedChatRequest } from '@zeroclick/domain';

export const INTENT_INTERPRETER = Symbol('INTENT_INTERPRETER');

export interface IntentInterpreter {
  interpret(message: string): Promise<InterpretedChatRequest>;
}
