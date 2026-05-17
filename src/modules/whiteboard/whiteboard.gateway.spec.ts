import { Test, TestingModule } from '@nestjs/testing';
import { WhiteboardGateway } from './whiteboard.gateway';
import { WhiteboardJwtGuard } from './whiteboard-jwt.guard';
import { RedisService } from '../redis/redis.service';
import { WhiteboardStateRepository } from '../persistence/repositories/whiteboard-state.repository';
import { JwtService } from '@nestjs/jwt';

jest.useFakeTimers();

const mockRedis = {
  setWhiteboardState: jest.fn(),
  getWhiteboardState: jest.fn(),
};

const mockRepo = {
  upsert: jest.fn(),
  findBySessionId: jest.fn(),
};

function makeClient(id: string) {
  const roomEmitFn = jest.fn();
  const client = {
    id,
    data: {} as Record<string, unknown>,
    join: jest.fn().mockResolvedValue(undefined),
    emit: jest.fn(),
    to: jest.fn().mockReturnValue({ emit: roomEmitFn }),
    handshake: { auth: {}, headers: {} },
    _roomEmit: roomEmitFn,
  };
  return client;
}

describe('WhiteboardGateway', () => {
  let gateway: WhiteboardGateway;
  let serverToEmit: jest.Mock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhiteboardGateway,
        { provide: RedisService, useValue: mockRedis },
        { provide: WhiteboardStateRepository, useValue: mockRepo },
        { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
        { provide: WhiteboardJwtGuard, useValue: { canActivate: () => true } },
      ],
    }).compile();

    gateway = module.get<WhiteboardGateway>(WhiteboardGateway);

    serverToEmit = jest.fn();
    (gateway as any).server = {
      to: jest.fn().mockReturnValue({ emit: serverToEmit }),
    };

    jest.clearAllMocks();
    (gateway as any).server.to.mockReturnValue({ emit: serverToEmit });
  });

  afterEach(() => {
    jest.clearAllTimers();
    if (gateway) {
      (gateway as any).roomElements?.clear();
      (gateway as any).roomCollaborators?.clear();
      (gateway as any).clientMeta?.clear();
      (gateway as any).redisDebounces?.clear();
      (gateway as any).mongoDebounces?.clear();
    }
  });

  describe('handleConnection', () => {
    it('does not throw', () => {
      const client = makeClient('c1');
      expect(() => gateway.handleConnection(client as any)).not.toThrow();
    });
  });

  describe('handleDisconnect', () => {
    it('is a no-op for unknown client', () => {
      const client = makeClient('unknown');
      expect(() => gateway.handleDisconnect(client as any)).not.toThrow();
    });

    it('emits collaboratorLeft when user disconnects', async () => {
      mockRedis.getWhiteboardState.mockResolvedValue(null);
      mockRepo.findBySessionId.mockResolvedValue(null);

      const client = makeClient('c1');
      await gateway.onJoin(client as any, { sessionId: 'sess1', userEmail: 'a@b.com', userColor: '#fff' });
      gateway.handleDisconnect(client as any);

      expect(client.to).toHaveBeenCalledWith('wb:sess1');
      expect(client._roomEmit).toHaveBeenCalledWith('whiteboard.collaboratorLeft', { userEmail: 'a@b.com' });
    });

    it('flushes elements to redis and mongo when last user leaves', async () => {
      const elements = [{ id: '1' }];
      mockRedis.getWhiteboardState.mockResolvedValue(elements);
      mockRedis.setWhiteboardState.mockResolvedValue(undefined);
      mockRepo.findBySessionId.mockResolvedValue(null);
      mockRepo.upsert.mockResolvedValue(undefined);

      const client = makeClient('c1');
      await gateway.onJoin(client as any, { sessionId: 'sess-flush', userEmail: 'a@b.com', userColor: '#fff' });
      gateway.handleDisconnect(client as any);

      await Promise.resolve();
      expect(mockRedis.setWhiteboardState).toHaveBeenCalledWith('sess-flush', elements);
      expect(mockRepo.upsert).toHaveBeenCalledWith('sess-flush', elements);
    });

    it('does not flush when room has no elements', async () => {
      mockRedis.getWhiteboardState.mockResolvedValue(null);
      mockRepo.findBySessionId.mockResolvedValue(null);

      const client = makeClient('c1');
      await gateway.onJoin(client as any, { sessionId: 'sess-empty', userEmail: 'a@b.com', userColor: '#fff' });
      gateway.handleDisconnect(client as any);

      await Promise.resolve();
      expect(mockRedis.setWhiteboardState).not.toHaveBeenCalled();
      expect(mockRepo.upsert).not.toHaveBeenCalled();
    });

    it('clears pending debounces on last-user disconnect', async () => {
      mockRedis.getWhiteboardState.mockResolvedValue(null);
      mockRepo.findBySessionId.mockResolvedValue(null);
      mockRedis.setWhiteboardState.mockResolvedValue(undefined);
      mockRepo.upsert.mockResolvedValue(undefined);

      const client = makeClient('c1');
      await gateway.onJoin(client as any, { sessionId: 'sess-debounce', userEmail: 'a@b.com', userColor: '#fff' });
      gateway.onUpdate(client as any, { sessionId: 'sess-debounce', elements: [{ id: 'x' }] });

      gateway.handleDisconnect(client as any);
      jest.clearAllMocks();
      jest.advanceTimersByTime(6000);

      expect(mockRedis.setWhiteboardState).not.toHaveBeenCalled();
    });

    it('does not remove collaborators if another client is in same room', async () => {
      mockRedis.getWhiteboardState.mockResolvedValue(null);
      mockRepo.findBySessionId.mockResolvedValue(null);

      const c1 = makeClient('c1');
      const c2 = makeClient('c2');
      await gateway.onJoin(c1 as any, { sessionId: 'shared', userEmail: 'a@b.com', userColor: '#fff' });
      await gateway.onJoin(c2 as any, { sessionId: 'shared', userEmail: 'b@b.com', userColor: '#000' });
      gateway.handleDisconnect(c1 as any);

      const collabs = (gateway as any).roomCollaborators.get('shared');
      expect(collabs).toBeDefined();
      expect(collabs.size).toBe(1);
    });
  });

  describe('onJoin', () => {
    it('emits whiteboard.joined with elements from Redis', async () => {
      const elements = [{ id: '1' }];
      mockRedis.getWhiteboardState.mockResolvedValue(elements);

      const client = makeClient('c1');
      await gateway.onJoin(client as any, { sessionId: 'sess1', userEmail: 'u@t.com', userColor: '#f00' });

      expect(client.emit).toHaveBeenCalledWith('whiteboard.joined', expect.objectContaining({ elements }));
    });

    it('loads from MongoDB when Redis miss and caches in Redis', async () => {
      const elements = [{ id: '2' }];
      mockRedis.getWhiteboardState.mockResolvedValue(null);
      mockRepo.findBySessionId.mockResolvedValue({ elements: JSON.stringify(elements) });
      mockRedis.setWhiteboardState.mockResolvedValue(undefined);

      const client = makeClient('c1');
      await gateway.onJoin(client as any, { sessionId: 'sess-mongo', userEmail: 'u@t.com', userColor: '#f00' });

      expect(mockRedis.setWhiteboardState).toHaveBeenCalledWith('sess-mongo', elements);
      expect(client.emit).toHaveBeenCalledWith('whiteboard.joined', expect.objectContaining({ elements }));
    });

    it('joins with empty elements when no state found', async () => {
      mockRedis.getWhiteboardState.mockResolvedValue(null);
      mockRepo.findBySessionId.mockResolvedValue(null);

      const client = makeClient('c1');
      await gateway.onJoin(client as any, { sessionId: 'sess-none', userEmail: 'u@t.com', userColor: '#f00' });

      expect(client.emit).toHaveBeenCalledWith('whiteboard.joined', expect.objectContaining({ elements: [] }));
    });

    it('uses cached in-memory elements on second join (skips Redis/Mongo)', async () => {
      const elements = [{ id: '1' }];
      mockRedis.getWhiteboardState.mockResolvedValue(elements);

      const c1 = makeClient('c1');
      const c2 = makeClient('c2');
      await gateway.onJoin(c1 as any, { sessionId: 'sess-cache', userEmail: 'a@t.com', userColor: '#f00' });
      jest.clearAllMocks();
      await gateway.onJoin(c2 as any, { sessionId: 'sess-cache', userEmail: 'b@t.com', userColor: '#0f0' });

      expect(mockRedis.getWhiteboardState).not.toHaveBeenCalled();
    });

    it('uses default values when payload fields are missing', async () => {
      mockRedis.getWhiteboardState.mockResolvedValue(null);
      mockRepo.findBySessionId.mockResolvedValue(null);

      const client = makeClient('c1');
      await gateway.onJoin(client as any, {});

      expect(client.emit).toHaveBeenCalledWith('whiteboard.joined', expect.objectContaining({ sessionId: 'global' }));
    });

    it('broadcasts collaboratorJoined to room', async () => {
      mockRedis.getWhiteboardState.mockResolvedValue(null);
      mockRepo.findBySessionId.mockResolvedValue(null);

      const client = makeClient('c1');
      await gateway.onJoin(client as any, { sessionId: 'sess1', userEmail: 'u@t.com', userColor: '#f00' });

      expect(client.to).toHaveBeenCalledWith('wb:sess1');
      expect(client._roomEmit).toHaveBeenCalledWith('whiteboard.collaboratorJoined', {
        userEmail: 'u@t.com',
        userColor: '#f00',
      });
    });
  });

  describe('onUpdate', () => {
    it('broadcasts elements to room immediately', () => {
      const client = makeClient('c1');
      const elements = [{ id: '1' }];

      gateway.onUpdate(client as any, { sessionId: 'sess1', elements });

      expect(client.to).toHaveBeenCalledWith('wb:sess1');
      expect(client._roomEmit).toHaveBeenCalledWith('whiteboard.update', { elements });
    });

    it('uses empty array when elements missing from payload', () => {
      const client = makeClient('c1');

      gateway.onUpdate(client as any, { sessionId: 'sess1' });

      expect(client._roomEmit).toHaveBeenCalledWith('whiteboard.update', { elements: [] });
    });

    it('persists to Redis after 500ms debounce', () => {
      const client = makeClient('c1');
      const elements = [{ id: '1' }];
      mockRedis.setWhiteboardState.mockResolvedValue(undefined);

      gateway.onUpdate(client as any, { sessionId: 'debounce-redis', elements });
      expect(mockRedis.setWhiteboardState).not.toHaveBeenCalled();

      jest.advanceTimersByTime(500);
      expect(mockRedis.setWhiteboardState).toHaveBeenCalledWith('debounce-redis', elements);
    });

    it('persists to MongoDB after 5000ms debounce', () => {
      const client = makeClient('c1');
      const elements = [{ id: '1' }];
      mockRepo.upsert.mockResolvedValue(undefined);

      gateway.onUpdate(client as any, { sessionId: 'debounce-mongo', elements });
      expect(mockRepo.upsert).not.toHaveBeenCalled();

      jest.advanceTimersByTime(5000);
      expect(mockRepo.upsert).toHaveBeenCalledWith('debounce-mongo', elements);
    });

    it('resets debounce on rapid updates (only last fires)', () => {
      const client = makeClient('c1');
      const firstElements = [{ id: 'first' }];
      const lastElements = [{ id: 'last' }];
      mockRedis.setWhiteboardState.mockResolvedValue(undefined);

      gateway.onUpdate(client as any, { sessionId: 'rapid', elements: firstElements });
      jest.advanceTimersByTime(200);
      gateway.onUpdate(client as any, { sessionId: 'rapid', elements: lastElements });
      jest.advanceTimersByTime(500);

      expect(mockRedis.setWhiteboardState).toHaveBeenCalledTimes(1);
      expect(mockRedis.setWhiteboardState).toHaveBeenCalledWith('rapid', lastElements);
    });
  });

  describe('onPointer', () => {
    it('broadcasts pointer coordinates to room', async () => {
      mockRedis.getWhiteboardState.mockResolvedValue(null);
      mockRepo.findBySessionId.mockResolvedValue(null);

      const client = makeClient('c1');
      await gateway.onJoin(client as any, { sessionId: 'sess1', userEmail: 'u@t.com', userColor: '#000' });
      jest.clearAllMocks();
      client.to.mockReturnValue({ emit: client._roomEmit });

      gateway.onPointer(client as any, { sessionId: 'sess1', x: 42, y: 99 });

      expect(client._roomEmit).toHaveBeenCalledWith('whiteboard.pointer', {
        userEmail: 'u@t.com',
        userColor: '#000',
        x: 42,
        y: 99,
      });
    });

    it('is a no-op when client not in meta', () => {
      const client = makeClient('unknown');
      expect(() => gateway.onPointer(client as any, { sessionId: 'sess1', x: 0, y: 0 })).not.toThrow();
      expect(client._roomEmit).not.toHaveBeenCalled();
    });

    it('uses default coordinates when x/y missing', async () => {
      mockRedis.getWhiteboardState.mockResolvedValue(null);
      mockRepo.findBySessionId.mockResolvedValue(null);

      const client = makeClient('c1');
      await gateway.onJoin(client as any, { sessionId: 'sess1', userEmail: 'u@t.com', userColor: '#000' });
      jest.clearAllMocks();
      client.to.mockReturnValue({ emit: client._roomEmit });

      gateway.onPointer(client as any, { sessionId: 'sess1' });

      expect(client._roomEmit).toHaveBeenCalledWith('whiteboard.pointer', expect.objectContaining({ x: 0, y: 0 }));
    });
  });

  describe('injectElements', () => {
    it('sets elements in memory, persists, and broadcasts via server', async () => {
      const elements = [{ id: '1' }];
      mockRedis.setWhiteboardState.mockResolvedValue(undefined);
      mockRepo.upsert.mockResolvedValue(undefined);

      await gateway.injectElements('sess1', elements);

      expect((gateway as any).roomElements.get('sess1')).toEqual(elements);
      expect(mockRedis.setWhiteboardState).toHaveBeenCalledWith('sess1', elements);
      expect(serverToEmit).toHaveBeenCalledWith('whiteboard.update', { elements });
    });
  });

  describe('getCurrentElements', () => {
    it('returns live in-memory elements first', async () => {
      const elements = [{ id: 'live' }];
      (gateway as any).roomElements.set('live-sess', elements);

      const result = await gateway.getCurrentElements('live-sess');

      expect(result).toEqual(elements);
      expect(mockRedis.getWhiteboardState).not.toHaveBeenCalled();
    });

    it('falls back to Redis when not in memory', async () => {
      const elements = [{ id: 'redis' }];
      mockRedis.getWhiteboardState.mockResolvedValue(elements);

      const result = await gateway.getCurrentElements('redis-sess');

      expect(result).toEqual(elements);
    });

    it('falls back to MongoDB when Redis miss', async () => {
      const elements = [{ id: 'mongo' }];
      mockRedis.getWhiteboardState.mockResolvedValue(null);
      mockRepo.findBySessionId.mockResolvedValue({ elements: JSON.stringify(elements) });

      const result = await gateway.getCurrentElements('mongo-sess');

      expect(result).toEqual(elements);
    });

    it('returns null when no state found anywhere', async () => {
      mockRedis.getWhiteboardState.mockResolvedValue(null);
      mockRepo.findBySessionId.mockResolvedValue(null);

      const result = await gateway.getCurrentElements('nowhere');

      expect(result).toBeNull();
    });
  });
});
