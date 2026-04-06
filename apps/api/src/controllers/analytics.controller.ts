import { Controller, Get } from '@nestjs/common';
import { CommerceService } from '../services/commerce.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly commerceService: CommerceService) {}

  @Get('summary')
  async summary() {
    return this.commerceService.getAnalyticsSummary();
  }
}
