import { Test, TestingModule } from '@nestjs/testing';
import { WhiteboardJwtGuard } from './whiteboard-jwt.guard';
import { JwtService } from '@nestjs/jwt';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

const mockJwtService = { verifyAsync: jest.fn() };

function makeWsContext(opts: {
  authToken?: string;
  authHeader?: string;
} = {}): ExecutionContext {
  const client = {
    handshake: {
      auth: opts.authToken !== undefined ? { token: opts.authToken } : {},
      headers: opts.authHeader !== undefined ? { authorization: opts.authHeader } : {},
    },
    data: {},
  };
  return {
    switchToWs: () => ({ getClient: () => client }),
  } as unknown as ExecutionContext;
}

describe('WhiteboardJwtGuard', () => {
  let guard: WhiteboardJwtGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhiteboardJwtGuard,
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    guard = module.get<WhiteboardJwtGuard>(WhiteboardJwtGuard);
    jest.clearAllMocks();
  });

  it('returns true when valid token in handshake auth', async () => {
    mockJwtService.verifyAsync.mockResolvedValue({ sub: '1' });
    const ctx = makeWsContext({ authToken: 'valid.token' });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid.token');
  });

  it('attaches decoded payload to client.data.user', async () => {
    const payload = { sub: '1', email: 'u@t.com' };
    mockJwtService.verifyAsync.mockResolvedValue(payload);
    const client = {
      handshake: { auth: { token: 'valid.token' }, headers: {} },
      data: {},
    };
    const ctx = {
      switchToWs: () => ({ getClient: () => client }),
    } as unknown as ExecutionContext;

    await guard.canActivate(ctx);
    expect(client.data).toMatchObject({ user: payload });
  });

  it('falls back to Authorization header when no auth token', async () => {
    mockJwtService.verifyAsync.mockResolvedValue({ sub: '1' });
    const ctx = makeWsContext({ authHeader: 'Bearer header.token' });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('header.token');
  });

  it('throws UnauthorizedException when no token anywhere', async () => {
    const ctx = makeWsContext();
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when auth token is empty string', async () => {
    const ctx = makeWsContext({ authToken: '' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException on JWT verification failure', async () => {
    mockJwtService.verifyAsync.mockRejectedValue(new Error('expired'));
    const ctx = makeWsContext({ authToken: 'bad.token' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });
});
