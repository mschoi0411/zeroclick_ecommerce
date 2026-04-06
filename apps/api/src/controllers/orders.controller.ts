import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CheckoutPreviewDto } from '../dto/checkout-preview.dto';
import { CommerceService } from '../services/commerce.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly commerceService: CommerceService) {}

  @Post('preview')
  async preview(@Body() body: CheckoutPreviewDto) {
    return this.commerceService.previewCheckout(body);
  }

  @Post()
  async place() {
    return this.commerceService.placeOrder();
  }

  @Get('recent/shipment')
  async shipment() {
    return this.commerceService.getRecentShipment();
  }

  @Post(':orderId/cancel')
  async cancel(@Param('orderId') orderId: string) {
    return this.commerceService.cancelOrder(orderId);
  }
}
