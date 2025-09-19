import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpException, Inject, Injectable } from '@nestjs/common';
import { AxiosError } from 'axios';
import type { Cache } from 'cache-manager';
import { createHash } from 'crypto';
import { firstValueFrom } from 'rxjs';
import { POINTS_ENDPOINT, PYTHON_SERVICE_BASE_URL } from './constants';
import { PointsPayloadDto } from './dto/points-payload.dto';

@Injectable()
export class AppService {
  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async processPoints(payload: PointsPayloadDto): Promise<any> {
    const cacheKey = createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');

    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${PYTHON_SERVICE_BASE_URL}${POINTS_ENDPOINT}`,
          payload,
        ),
      );

      // Store the response from the Python service in the cache
      await this.cacheManager.set(cacheKey, response.data);

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      // Re-throw an appropriate NestJS exception, forwarding status and body
      throw new HttpException(
        axiosError.response?.data || 'Failed to process points.',
        axiosError.response?.status || 500,
      );
    }
  }
}
