import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosError, AxiosHeaders } from 'axios';
import type { Cache } from 'cache-manager';
import { of, throwError } from 'rxjs';
import { AppService } from './app.service';
import { POINTS_ENDPOINT, PYTHON_SERVICE_BASE_URL } from './constants';
import { PointsPayloadDto } from './dto/points-payload.dto';

describe('AppService', () => {
  let service: AppService;
  let httpService: HttpService;
  let cacheManager: Cache;

  const mockPayload: PointsPayloadDto = {
    points: [{ lat: 40.7128, lng: -74.006 }],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
    httpService = module.get<HttpService>(HttpService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processPoints', () => {
    it('should return cached data if available', async () => {
      const cachedResponse = { message: 'from cache' };
      jest.spyOn(cacheManager, 'get').mockResolvedValue(cachedResponse);
      const httpSpy = jest.spyOn(httpService, 'post');

      const result = await service.processPoints(mockPayload);

      expect(result).toEqual(cachedResponse);
      expect(cacheManager.get).toHaveBeenCalled();
      expect(httpSpy).not.toHaveBeenCalled();
    });

    it('should call the python service, cache, and return the response if not cached', async () => {
      const pythonResponse = { data: { message: 'from python' } };
      jest.spyOn(cacheManager, 'get').mockResolvedValue(undefined);
      const httpSpy = jest
        .spyOn(httpService, 'post')
        .mockReturnValue(of(pythonResponse as any));
      const cacheSetSpy = jest.spyOn(cacheManager, 'set');

      const result = await service.processPoints(mockPayload);

      expect(result).toEqual(pythonResponse.data);
      expect(httpSpy).toHaveBeenCalledWith(
        `${PYTHON_SERVICE_BASE_URL}${POINTS_ENDPOINT}`,
        mockPayload,
      );
      expect(cacheSetSpy).toHaveBeenCalledWith(
        expect.any(String),
        pythonResponse.data,
      );
    });

    it('should throw HttpException if the python service fails', async () => {
      const errorResponse = {
        message: 'Internal Server Error',
        status: 500,
      };
      const axiosError = new AxiosError(
        'Request failed with status code 500',
        '500',
        undefined,
        null,
        {
          data: errorResponse,
          status: 500,
          statusText: 'Internal Server Error',
          headers: {},
          config: { headers: new AxiosHeaders() },
        },
      );

      jest.spyOn(cacheManager, 'get').mockResolvedValue(undefined);
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(throwError(() => axiosError));
      const cacheSetSpy = jest.spyOn(cacheManager, 'set');

      await expect(service.processPoints(mockPayload)).rejects.toThrow(
        new HttpException(errorResponse, 500),
      );
      expect(cacheSetSpy).not.toHaveBeenCalled();
    });

    it('should throw a generic HttpException on network error', async () => {
      // This simulates a network error where axiosError.response is undefined
      const axiosError = new AxiosError('Network Error');

      jest.spyOn(cacheManager, 'get').mockResolvedValue(undefined);
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(throwError(() => axiosError));

      await expect(service.processPoints(mockPayload)).rejects.toThrow(
        new HttpException('Failed to process points.', 500),
      );
    });
  });
});
