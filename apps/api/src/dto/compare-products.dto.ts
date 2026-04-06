import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class CompareProductsDto {
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  productIds!: string[];
}
