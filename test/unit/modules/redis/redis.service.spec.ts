import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from 'src/modules/redis/redis.service';
import { REDIS_CLIENT, WHITEBOARD_STATE_TTL_SECONDS } from 'src/modules/redis/redis.constants';

const mockRedis = {
  set: jest.fn(),
  get: jest.fn(),
  quit: jest.fn(),
};

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    jest.clearAllMocks();
  });

  describe('setWhiteboardState', () => {
    it('calls redis SET with correct key, JSON value, and TTL', async () => {
      mockRedis.set.mockResolvedValue('OK');
      const elements = [{ id: '1', type: 'rectangle' }];

      await service.setWhiteboardState('sess1', elements);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'whiteboard:sess1:elements',
        JSON.stringify(elements),
        'EX',
        WHITEBOARD_STATE_TTL_SECONDS,
      );
    });

    it('handles empty elements array', async () => {
      mockRedis.set.mockResolvedValue('OK');
      await service.setWhiteboardState('sess1', []);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'whiteboard:sess1:elements',
        '[]',
        'EX',
        WHITEBOARD_STATE_TTL_SECONDS,
      );
    });
  });

  describe('getWhiteboardState', () => {
    it('returns parsed elements when key exists', async () => {
      const elements = [{ id: '1' }, { id: '2' }];
      mockRedis.get.mockResolvedValue(JSON.stringify(elements));

      const result = await service.getWhiteboardState('sess1');

      expect(mockRedis.get).toHaveBeenCalledWith('whiteboard:sess1:elements');
      expect(result).toEqual(elements);
    });

    it('returns null when key does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.getWhiteboardState('missing');

      expect(result).toBeNull();
    });
  });

  describe('onModuleDestroy', () => {
    it('calls redis quit', async () => {
      mockRedis.quit.mockResolvedValue(undefined);
      await service.onModuleDestroy();
      expect(mockRedis.quit).toHaveBeenCalled();
    });
  });
});
