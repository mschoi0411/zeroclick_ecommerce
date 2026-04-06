import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ChatResponsePayload, Product } from '@zeroclick/domain';
import {
  INTENT_INTERPRETER,
  type IntentInterpreter,
} from '../llm/intent-interpreter';
import { CommerceService } from './commerce.service';

@Injectable()
export class ChatOrchestratorService {
  constructor(
    private readonly commerceService: CommerceService,
    @Inject(INTENT_INTERPRETER)
    private readonly interpreter: IntentInterpreter,
  ) {}

  async handleMessage(message: string): Promise<ChatResponsePayload> {
    const interpreted = await this.interpreter.interpret(message);

    switch (interpreted.plan.action) {
      case 'track_order': {
        try {
          return {
            intent: interpreted.intent,
            message: `${interpreted.plan.reasoning} 최근 주문의 배송 상태를 조회했습니다.`,
            shipment: await this.commerceService.getRecentShipment(),
          };
        } catch (error) {
          if (error instanceof NotFoundException) {
            return {
              intent: interpreted.intent,
              message:
                '조회할 최근 배송 정보가 아직 없습니다. 먼저 주문을 생성한 뒤 다시 시도해 주세요.',
            };
          }
          throw error;
        }
      }

      case 'cancel_order': {
        try {
          const shipment = await this.commerceService.getRecentShipment();
          return {
            intent: interpreted.intent,
            message: `${interpreted.plan.reasoning} 최근 주문을 취소 처리했습니다.`,
            checkoutPreview: await this.commerceService.cancelOrder(
              shipment.orderId,
            ),
          };
        } catch (error) {
          if (error instanceof NotFoundException) {
            return {
              intent: interpreted.intent,
              message:
                '취소할 최근 주문이 아직 없습니다. 주문을 생성한 뒤 다시 시도해 주세요.',
            };
          }
          throw error;
        }
      }

      case 'preview_checkout':
        return {
          intent: interpreted.intent,
          message: `${interpreted.plan.reasoning} 결제 승인만 남은 주문 요약을 준비했습니다.`,
          checkoutPreview: await this.commerceService.previewCheckout({}),
          cart: await this.commerceService.getCart(),
        };

      case 'add_to_cart': {
        const featuredResult = await this.commerceService.getFeaturedProducts();
        const featured = featuredResult.items[0];
        const variant = featured?.variants[0];

        if (!featured || !variant) {
          return {
            intent: interpreted.intent,
            message:
              '장바구니에 담을 수 있는 추천 상품이 아직 없습니다. 상품 데이터를 먼저 등록해 주세요.',
            recommendationResult: featuredResult,
          };
        }

        return {
          intent: interpreted.intent,
          message: `${interpreted.plan.reasoning} ${featured.name} ${variant.label} 옵션을 장바구니에 반영했습니다.`,
          cart: await this.commerceService.addToCart({
            productId: featured.id,
            variantId: variant.id,
            quantity: 1,
          }),
          referencedProducts: [featured],
        };
      }

      case 'compare_products': {
        const items = (
          await this.commerceService.getFeaturedProducts()
        ).items.slice(0, 2);
        if (items.length < 2) {
          return {
            intent: interpreted.intent,
            message:
              '비교할 수 있는 상품이 아직 2개 이상 준비되지 않았습니다. 상품 데이터를 먼저 등록해 주세요.',
            referencedProducts: items,
          };
        }

        return {
          intent: interpreted.intent,
          message: `${interpreted.plan.reasoning} 최근 추천 목록 기준으로 두 상품 비교를 정리했습니다.`,
          compareResult: await this.commerceService.compareProducts(
            items.map((item) => item.id),
          ),
        };
      }

      case 'search_products': {
        const recommendationResult = await this.commerceService.searchProducts({
          query: interpreted.plan.query ?? interpreted.userMessage,
          maxPrice: interpreted.plan.maxPrice,
          color: interpreted.plan.color,
          category: interpreted.plan.category,
        });

        return {
          intent: interpreted.intent,
          message: `${interpreted.plan.reasoning} ${this.buildSearchMessage(recommendationResult.items)}`,
          referencedProducts: recommendationResult.items,
          recommendationResult,
        };
      }
    }
  }

  private buildSearchMessage(products: Product[]): string {
    if (products.length === 0) {
      return '조건에 맞는 상품이 아직 없습니다. 상품 데이터를 등록하면 추천을 이어서 진행할 수 있습니다.';
    }

    return `${products.length}개의 후보를 추렸어요. 비교, 장바구니 추가, 주문 미리보기까지 이어서 진행할 수 있습니다.`;
  }
}
