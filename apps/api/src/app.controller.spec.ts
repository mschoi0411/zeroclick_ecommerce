import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { CommerceService } from './services/commerce.service';

describe('CommerceService', () => {
  let service: CommerceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    service = module.get(CommerceService);
  });

  it('returns featured products', async () => {
    const result = await service.getFeaturedProducts();
    expect(Array.isArray(result.items)).toBe(true);
  });

  it('creates checkout preview from seeded cart', async () => {
    const preview = await service.previewCheckout({
      shippingAddress: '서울 강남구 테스트 주소',
      paymentMethod: '테스트 카드',
    });

    expect(preview.shippingAddress).toContain('서울');
    expect(preview.paymentMethod).toContain('카드');
    expect(preview.items.length).toBeGreaterThan(0);
  });
});
