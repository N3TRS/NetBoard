import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from 'src/modules/auth-integration/guards/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

const mockJwtService = { verifyAsync: jest.fn() };

function makeContext(authHeader?: string): ExecutionContext {
  const request: Record<string, unknown> = {
    headers: { authorization: authHeader },
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    jest.clearAllMocks();
  });

  it('returns true and attaches user on valid Bearer token', async () => {
    const payload = { sub: '1', email: 'user@test.com' };
    mockJwtService.verifyAsync.mockResolvedValue(payload);
    const ctx = makeContext('Bearer valid.token.here');

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid.token.here');
  });

  it('throws UnauthorizedException when no Authorization header', async () => {
    await expect(guard.canActivate(makeContext(undefined))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when header does not start with Bearer', async () => {
    await expect(guard.canActivate(makeContext('Token abc'))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when token is empty after Bearer', async () => {
    await expect(guard.canActivate(makeContext('Bearer '))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException on JWT verification failure', async () => {
    mockJwtService.verifyAsync.mockRejectedValue(new Error('invalid signature'));
    await expect(guard.canActivate(makeContext('Bearer bad.token'))).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
