# GeoNest API Gateway

This project is a NestJS application that acts as an API Gateway for a backend Python microservice. It is responsible for validating, caching, and forwarding requests.

## Architectural Decisions

This application follows a modern microservice architecture with a clear separation of concerns.

### 1. API Gateway Pattern

The NestJS application serves as a gateway. Its primary responsibilities are:

- **Exposing a Public API**: Provides a stable, client-facing API endpoint.
- **Request Validation**: Ensures that all incoming data is well-formed and valid before it reaches the core service.
- **Caching**: Implements a caching layer to improve performance and reduce load on the backend.
- **Request Forwarding**: Forwards valid, non-cached requests to the appropriate downstream microservice.

### 2. Request Flow

1. A client sends a `POST /points` request with a JSON payload.
2. The NestJS gateway intercepts the request.
3. **Validation**: The payload is validated against the `PointsPayloadDto` using `class-validator`. If invalid, a `400 Bad Request` is returned immediately.
4. **Caching**: The service creates a unique hash of the payload and checks the in-memory cache (`@nestjs/cache-manager`). If a valid response exists, it is returned directly.
5. **Forwarding**: On a cache miss, the `AppService` uses `HttpModule` (`axios`) to forward the request to the Python service at `http://localhost:8000/points`.
6. **Response**: The response from the Python service is proxied back to the client. If the response was successful, it is stored in the cache for future requests.

### 3. Separation of Concerns

- **Controller (`app.controller.ts`)**: Handles HTTP-layer concerns. It is responsible for defining the route, receiving the request, and delegating processing to the `AppService`.
- **Service (`app.service.ts`)**: Contains the core business logic of the gateway, including caching and request forwarding logic.

### 4. Testing Strategy

The project has a comprehensive testing suite to ensure reliability.

- **Unit Tests (`*.spec.ts`)**: Test individual components in isolation.
  - The `AppController` is tested to ensure it correctly calls the `AppService`.
  - The `AppService` is tested by mocking its dependencies (`HttpService`, `CacheManager`) to verify caching, forwarding, and error handling logic.
- **End-to-End Tests (`*.e2e-spec.ts`)**: Test the entire application flow.
  - `supertest` is used to send real HTTP requests to the application.
  - `nock` is used to mock the external Python service, allowing tests to run without a live dependency.

### 5. CORS

Cross-Origin Resource Sharing (CORS) is enabled globally via `app.enableCors()` to allow frontend applications from different origins to interact with the API.

---

## Getting Started

### Prerequisites

- Node.js (v16 or higher recommended)
- npm or yarn

### Installation

Clone the repository and install the dependencies.

```bash
npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

The application will be available at `http://localhost:5000`.

## Running Tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## API Endpoint

### `POST /points`

Processes a collection of geographical points.

**Request Body:**

```json
{
  "points": [
    { "lat": 40.7128, "lng": -74.006 },
    { "lat": 34.0522, "lng": -118.2437 }
  ]
}
```

**Responses:**

- `200 OK`: Returns the JSON response from the Python service.
- `400 Bad Request`: If the payload is invalid (e.g., empty `points` array, malformed point objects, invalid coordinates).
- `5xx Server Error`: If the downstream Python service returns an error.
