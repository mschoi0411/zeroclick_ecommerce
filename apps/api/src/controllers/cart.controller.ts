import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { AddToCartDto } from '../dto/add-to-cart.dto';
import { CommerceService } from '../services/commerce.service';

@Controller('cart')
export class CartController {
  constructor(private readonly commerceService: CommerceService) {}

  @Get()
  async getCart() {
    return this.commerceService.getCart();
  }

  @Post('items')
  async addItem(@Body() body: AddToCartDto) {
    return this.commerceService.addToCart(body);
  }

  @Delete('items/:itemId')
  async removeItem(@Param('itemId') itemId: string) {
    return this.commerceService.removeFromCart(itemId);
  }
}
