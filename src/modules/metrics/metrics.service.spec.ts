import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  it('creates a Prometheus registry', () => {
    expect(service.registry).toBeDefined();
  });

  it('creates httpRequestsTotal counter', () => {
    expect(service.httpRequestsTotal).toBeDefined();
  });

  it('creates httpRequestDuration histogram', () => {
    expect(service.httpRequestDuration).toBeDefined();
  });

  it('registry has content type string', () => {
    expect(typeof service.registry.contentType).toBe('string');
    expect(service.registry.contentType).toContain('text/plain');
  });

  it('registry.metrics() resolves to a string', async () => {
    const result = await service.registry.metrics();
    expect(typeof result).toBe('string');
  });
});
