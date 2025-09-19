import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { PointsPayloadDto } from './dto/points-payload.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('points')
  @HttpCode(200)
  async processPoints(@Body() payload: PointsPayloadDto) {
    // The controller's responsibility is to handle the request and response.
    // It delegates the actual business logic to the AppService.
    return this.appService.processPoints(payload);
  }
}
