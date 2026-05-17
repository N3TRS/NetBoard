import { Test, TestingModule } from '@nestjs/testing';
import { MetricsInterceptor } from 'src/modules/metrics/metrics.interceptor';
import { MetricsService } from 'src/modules/metrics/metrics.service';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

const mockEndTimer = jest.fn();
const mockMetrics = {
  httpRequestDuration: {
    startTimer: jest.fn().mockReturnValue(mockEndTimer),
  },
  httpRequestsTotal: {
    inc: jest.fn(),
  },
};

function makeContext(opts: {
  path: string;
  method?: string;
  statusCode?: number;
  routePath?: string;
}): ExecutionContext {
  const { path, method = 'GET', statusCode = 200, routePath } = opts;
  return {
    switchToHttp: () => ({
      getRequest: () => ({ path, method, url: path, route: routePath ? { path: routePath } : undefined }),
      getResponse: () => ({ statusCode }),
    }),
  } as unknown as ExecutionContext;
}

describe('MetricsInterceptor', () => {
  let interceptor: MetricsInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsInterceptor,
        { provide: MetricsService, useValue: mockMetrics },
      ],
    }).compile();

    interceptor = module.get<MetricsInterceptor>(MetricsInterceptor);
    jest.clearAllMocks();
    mockMetrics.httpRequestDuration.startTimer.mockReturnValue(mockEndTimer);
  });

  it('skips metrics recording for /metrics path', (done) => {
    const ctx = makeContext({ path: '/metrics' });
    const next: CallHandler = { handle: () => of({}) };

    interceptor.intercept(ctx, next).subscribe(() => {
      expect(mockMetrics.httpRequestDuration.startTimer).not.toHaveBeenCalled();
      expect(mockMetrics.httpRequestsTotal.inc).not.toHaveBeenCalled();
      done();
    });
  });

  it('records duration and request count for normal requests', (done) => {
    const ctx = makeContext({ path: '/v1/boards', method: 'POST', statusCode: 201, routePath: '/v1/boards' });
    const next: CallHandler = { handle: () => of({ id: '1' }) };

    interceptor.intercept(ctx, next).subscribe(() => {
      expect(mockMetrics.httpRequestDuration.startTimer).toHaveBeenCalledWith({
        method: 'POST',
        route: '/v1/boards',
      });
      expect(mockEndTimer).toHaveBeenCalled();
      expect(mockMetrics.httpRequestsTotal.inc).toHaveBeenCalledWith({
        method: 'POST',
        status: 201,
        route: '/v1/boards',
      });
      done();
    });
  });

  it('falls back to req.url when route.path unavailable', (done) => {
    const ctx = makeContext({ path: '/v1/health' });
    const next: CallHandler = { handle: () => of({}) };

    interceptor.intercept(ctx, next).subscribe(() => {
      expect(mockMetrics.httpRequestDuration.startTimer).toHaveBeenCalledWith(
        expect.objectContaining({ route: '/v1/health' }),
      );
      done();
    });
  });
});
