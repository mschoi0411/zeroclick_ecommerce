import { IsInt, IsString, Min } from 'class-validator';

export class AddToCartDto {
  @IsString()
  productId!: string;

  @IsString()
  variantId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}
