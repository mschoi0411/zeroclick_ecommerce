import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CompareProductsDto } from '../dto/compare-products.dto';
import { SearchProductsDto } from '../dto/search-products.dto';
import { CommerceService } from '../services/commerce.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly commerceService: CommerceService) {}

  @Get('featured')
  async getFeatured() {
    return this.commerceService.getFeaturedProducts();
  }

  @Post('search')
  async search(@Body() body: SearchProductsDto) {
    return this.commerceService.searchProducts(body);
  }

  @Get('products/:productId')
  async getProduct(@Param('productId') productId: string) {
    return this.commerceService.getProduct(productId);
  }

  @Post('compare')
  async compare(@Body() body: CompareProductsDto) {
    return this.commerceService.compareProducts(body.productIds);
  }
}
