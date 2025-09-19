import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PointsPayloadDto } from './dto/points-payload.dto';

describe('AppController', () => {
  let appController: AppController;
  let appService: { processPoints: jest.Mock };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            processPoints: jest.fn(),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get(AppService);
  });

  describe('processPoints', () => {
    it('should call appService.processPoints with the payload', async () => {
      const payload: PointsPayloadDto = {
        points: [
          { lat: 40.7128, lng: -74.006 },
          { lat: 34.0522, lng: -118.2437 },
        ],
      };
      appService.processPoints.mockResolvedValue({ success: true });

      await appController.processPoints(payload);
      expect(appService.processPoints).toHaveBeenCalledWith(payload);
    });

    it('should return the result from appService.processPoints', async () => {
      const payload: PointsPayloadDto = { points: [{ lat: 1, lng: 1 }] };
      const result = { success: true, data: 'processed' };
      appService.processPoints.mockResolvedValue(result);

      await expect(appController.processPoints(payload)).resolves.toBe(result);
    });
  });
});
