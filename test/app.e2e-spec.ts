import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import * as nock from 'nock';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { POINTS_ENDPOINT, PYTHON_SERVICE_BASE_URL } from '../src/constants';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let cacheManager: Cache;

  afterEach(() => {
    nock.cleanAll();
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: false },
      }),
    );
    await app.init();

    cacheManager = app.get(CACHE_MANAGER);
    await cacheManager.reset();
  });

  it('/points (POST) - should cache responses for identical payloads', async () => {
    const payload = {
      points: [
        { lat: 40.7128, lng: -74.006 },
        { lat: 34.0522, lng: -118.2437 },
      ],
    };

    const pythonServiceResponse = {
      message: 'Processed by Python',
      result: 'some_value',
    };

    const scope = nock(PYTHON_SERVICE_BASE_URL)
      .post(POINTS_ENDPOINT, payload)
      .reply(200, pythonServiceResponse);

    // First request should hit the Python service
    await request(app.getHttpServer())
      .post('/points')
      .send(payload)
      .expect(200)
      .expect(pythonServiceResponse);

    // Ensure the mock was called
    expect(scope.isDone()).toBe(true);

    // Second request for the same payload should be served from cache
    // Nock will throw an error if this second call tries to hit the service,
    // as the mock has already been consumed.
    await request(app.getHttpServer())
      .post('/points')
      .send(payload)
      .expect(200)
      .expect(pythonServiceResponse);
  });

  it('/points (POST) - should return 500 if python service fails', () => {
    const payload = {
      points: [{ lat: 40.7128, lng: -74.006 }],
    };

    nock(PYTHON_SERVICE_BASE_URL)
      .post(POINTS_ENDPOINT, payload)
      .reply(500, { error: 'Python service exploded' });

    return request(app.getHttpServer())
      .post('/points')
      .send(payload)
      .expect(500)
      .expect({ error: 'Python service exploded' });
  });

  it('/points (POST) - should return 400 for a missing points property', () => {
    const payload = {};
    return request(app.getHttpServer())
      .post('/points')
      .send(payload)
      .expect(400);
  });

  it('/points (POST) - should return 400 for an invalid point structure', () => {
    const payload = {
      points: [{ lat: 40.7128 }], // lng is missing
    };
    return request(app.getHttpServer())
      .post('/points')
      .send(payload)
      .expect(400);
  });

  it('/points (POST) - should return 400 for an empty points array', () => {
    const payload = {
      points: [],
    };
    return request(app.getHttpServer())
      .post('/points')
      .send(payload)
      .expect(400);
  });

  it('/points (POST) - should return 400 for invalid coordinate types', () => {
    const payload = {
      points: [{ lat: 'not-a-latitude', lng: -74.006 }],
    };
    return request(app.getHttpServer())
      .post('/points')
      .send(payload)
      .expect(400);
  });

  it('/points (POST) - should return 400 for string coordinate types', () => {
    const payload = {
      points: [
        { lat: '40.7128', lng: -74.006 },
        { lat: 40.7128, lng: '-74.006' },
      ],
    };
    return request(app.getHttpServer())
      .post('/points')
      .send(payload)
      .expect(400);
  });

  it('/points (POST) - should return 400 for a payload with extra properties', () => {
    const payload = {
      points: [{ lat: 40.7128, lng: -74.006 }],
      extra: 'property',
    };
    return request(app.getHttpServer())
      .post('/points')
      .send(payload)
      .expect(400)
      .then((response) => {
        expect(response.body.message).toContain(
          'property extra should not exist',
        );
      });
  });
});
