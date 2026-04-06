import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IntentName, InterpretedChatRequest } from '@zeroclick/domain';
import { MockIntentInterpreterService } from './mock-intent-interpreter.service';
import type { IntentInterpreter } from './intent-interpreter';

interface OpenAIChoiceResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

@Injectable()
export class OpenAiIntentInterpreterService implements IntentInterpreter {
  private readonly logger = new Logger(OpenAiIntentInterpreterService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly mockInterpreter: MockIntentInterpreterService,
  ) {}

  async interpret(message: string): Promise<InterpretedChatRequest> {
    const apiKey = this.configService.get<string>('LLM_API_KEY')?.trim();

    if (!apiKey) {
      return this.mockInterpreter.interpret(message);
    }

    const model =
      this.configService.get<string>('LLM_MODEL')?.trim() || 'gpt-4o-mini';

    try {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            temperature: 0.1,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content: [
                  'You are an intent and slot extraction engine for a conversational ecommerce app.',
                  'Return valid JSON only.',
                  'Output schema:',
                  '{',
                  '  "intent": "product_search|recommendation_request|product_compare|product_detail|add_to_cart|remove_from_cart|checkout_preview|place_order|track_order|cancel_order|faq_request|handoff_request",',
                  '  "confidence": number between 0 and 1,',
                  '  "extractedSlots": { "query"?: string, "maxPrice"?: number, "color"?: string, "category"?: string },',
                  '  "plan": {',
                  '    "action": "search_products|compare_products|add_to_cart|preview_checkout|track_order|cancel_order",',
                  '    "reasoning": string,',
                  '    "query"?: string,',
                  '    "maxPrice"?: number,',
                  '    "color"?: string,',
                  '    "category"?: string',
                  '  }',
                  '}',
                  'Infer the minimal action needed. If the request is ambiguous, choose the safest non-destructive action.',
                  'Map checkout_preview and place_order requests to action preview_checkout.',
                  'Map product_compare to compare_products, add_to_cart to add_to_cart, track_order to track_order, and cancel_order to cancel_order.',
                  'Map general search and recommendation requests to search_products.',
                  'For Korean price phrases like "5만원 이하", extract maxPrice as 50000.',
                ].join(' '),
              },
              { role: 'user', content: message },
            ],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`OpenAI request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as OpenAIChoiceResponse;
      const rawContent = payload.choices?.[0]?.message?.content;

      if (!rawContent) {
        throw new Error('OpenAI response missing content');
      }

      const parsed = JSON.parse(rawContent) as Partial<InterpretedChatRequest>;
      return this.normalizeResult(message, parsed);
    } catch (error) {
      this.logger.warn(
        `OpenAI interpretation failed, falling back to mock interpreter: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return this.mockInterpreter.interpret(message);
    }
  }

  private normalizeResult(
    userMessage: string,
    parsed: Partial<InterpretedChatRequest>,
  ): InterpretedChatRequest {
    const intent = this.normalizeIntent(parsed.intent);
    const extractedSlots = {
      query: parsed.extractedSlots?.query ?? parsed.plan?.query,
      maxPrice: this.toNumber(
        parsed.extractedSlots?.maxPrice ?? parsed.plan?.maxPrice,
      ),
      color: parsed.extractedSlots?.color ?? parsed.plan?.color,
      category: parsed.extractedSlots?.category ?? parsed.plan?.category,
    };

    return {
      intent,
      userMessage,
      confidence:
        typeof parsed.confidence === 'number'
          ? Math.max(0, Math.min(1, parsed.confidence))
          : 0.75,
      extractedSlots,
      plan: {
        action: this.normalizeAction(parsed.plan?.action, intent),
        reasoning:
          parsed.plan?.reasoning ??
          'LLM이 사용자 의도를 해석해 다음 액션을 선택했습니다.',
        query: extractedSlots.query,
        maxPrice: extractedSlots.maxPrice,
        color: extractedSlots.color,
        category: extractedSlots.category,
      },
    };
  }

  private normalizeIntent(intent: unknown): IntentName {
    const allowed: IntentName[] = [
      'product_search',
      'recommendation_request',
      'product_compare',
      'product_detail',
      'add_to_cart',
      'remove_from_cart',
      'checkout_preview',
      'place_order',
      'track_order',
      'cancel_order',
      'faq_request',
      'handoff_request',
    ];

    return typeof intent === 'string' && allowed.includes(intent as IntentName)
      ? (intent as IntentName)
      : 'recommendation_request';
  }

  private defaultActionForIntent(
    intent: IntentName,
  ): InterpretedChatRequest['plan']['action'] {
    switch (intent) {
      case 'product_compare':
        return 'compare_products';
      case 'add_to_cart':
        return 'add_to_cart';
      case 'checkout_preview':
      case 'place_order':
        return 'preview_checkout';
      case 'track_order':
        return 'track_order';
      case 'cancel_order':
        return 'cancel_order';
      default:
        return 'search_products';
    }
  }

  private normalizeAction(
    action: unknown,
    intent: IntentName,
  ): InterpretedChatRequest['plan']['action'] {
    const allowed: InterpretedChatRequest['plan']['action'][] = [
      'search_products',
      'compare_products',
      'add_to_cart',
      'preview_checkout',
      'track_order',
      'cancel_order',
    ];

    return typeof action === 'string' &&
      allowed.includes(action as InterpretedChatRequest['plan']['action'])
      ? (action as InterpretedChatRequest['plan']['action'])
      : this.defaultActionForIntent(intent);
  }

  private toNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }
}
