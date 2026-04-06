import { IsOptional, IsString } from 'class-validator';

export class CheckoutPreviewDto {
  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
