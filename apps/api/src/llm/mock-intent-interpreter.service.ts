import { Injectable } from '@nestjs/common';
import type { IntentName, InterpretedChatRequest } from '@zeroclick/domain';
import type { IntentInterpreter } from './intent-interpreter';

@Injectable()
export class MockIntentInterpreterService implements IntentInterpreter {
  interpret(message: string): Promise<InterpretedChatRequest> {
    const normalized = message.toLowerCase();
    const numeric = message.match(/(\d+)\s*만원/);
    const maxPrice = numeric
      ? Number.parseInt(numeric[1], 10) * 10000
      : undefined;
    const color =
      message.includes('검정') || normalized.includes('black')
        ? 'black'
        : undefined;
    const category = message.includes('후드')
      ? '후드티'
      : message.includes('공기청정기')
        ? '공기청정기'
        : message.includes('향수')
          ? '향수'
          : undefined;

    if (normalized.includes('배송')) {
      return this.resolveResult(
        this.createResult(
          'track_order',
          message,
          0.96,
          'track_order',
          '최근 주문 배송 상태를 조회해야 합니다.',
        ),
      );
    }

    if (normalized.includes('취소')) {
      return this.resolveResult(
        this.createResult(
          'cancel_order',
          message,
          0.95,
          'cancel_order',
          '최근 주문의 취소 가능 여부를 확인하고 처리해야 합니다.',
        ),
      );
    }

    if (normalized.includes('주문')) {
      return this.resolveResult(
        this.createResult(
          'place_order',
          message,
          0.93,
          'preview_checkout',
          '고위험 액션이므로 우선 주문 미리보기를 만들어 승인 직전 상태로 보내야 합니다.',
        ),
      );
    }

    if (normalized.includes('담아') || normalized.includes('장바구니')) {
      return this.resolveResult(
        this.createResult(
          'add_to_cart',
          message,
          0.94,
          'add_to_cart',
          '최근 추천 상품 또는 현재 포커스 상품을 장바구니에 담는 흐름입니다.',
          {
            maxPrice,
            color,
            category,
          },
        ),
      );
    }

    if (normalized.includes('비교')) {
      return this.resolveResult(
        this.createResult(
          'product_compare',
          message,
          0.92,
          'compare_products',
          '추천 목록의 대표 상품들을 비교해야 합니다.',
        ),
      );
    }

    const intent: IntentName = category
      ? 'product_search'
      : 'recommendation_request';
    return this.resolveResult(
      this.createResult(
        intent,
        message,
        0.88,
        'search_products',
        '조건을 구조화해 추천 결과를 만드는 탐색 단계입니다.',
        {
          query: category ?? message,
          maxPrice,
          color,
          category,
        },
      ),
    );
  }

  private resolveResult(
    result: InterpretedChatRequest,
  ): Promise<InterpretedChatRequest> {
    return Promise.resolve(result);
  }

  private createResult(
    intent: IntentName,
    userMessage: string,
    confidence: number,
    action: InterpretedChatRequest['plan']['action'],
    reasoning: string,
    extractedSlots: InterpretedChatRequest['extractedSlots'] = {},
  ): InterpretedChatRequest {
    return {
      intent,
      userMessage,
      confidence,
      extractedSlots,
      plan: {
        action,
        reasoning,
        ...extractedSlots,
      },
    };
  }
}
