import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from 'src/modules/metrics/metrics.controller';
import { MetricsService } from 'src/modules/metrics/metrics.service';
import { Response } from 'express';

const CONTENT_TYPE = 'text/plain; version=0.0.4; charset=utf-8';
const METRICS_DATA = '# HELP http_requests_total Total number of HTTP requests\n';

const mockMetrics = {
  registry: {
    contentType: CONTENT_TYPE,
    metrics: jest.fn().mockResolvedValue(METRICS_DATA),
  },
};

describe('MetricsController', () => {
  let controller: MetricsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [{ provide: MetricsService, useValue: mockMetrics }],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
    jest.clearAllMocks();
    mockMetrics.registry.metrics.mockResolvedValue(METRICS_DATA);
  });

  it('sets Prometheus content-type header', async () => {
    const res = { set: jest.fn(), end: jest.fn() } as unknown as Response;
    await controller.getMetrics(res);
    expect(res.set).toHaveBeenCalledWith('Content-Type', CONTENT_TYPE);
  });

  it('sends metrics data in response body', async () => {
    const res = { set: jest.fn(), end: jest.fn() } as unknown as Response;
    await controller.getMetrics(res);
    expect(res.end).toHaveBeenCalledWith(METRICS_DATA);
  });
});
