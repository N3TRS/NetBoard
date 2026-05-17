import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { WhiteboardController } from 'src/modules/whiteboard/whiteboard.controller';
import { BoardSnapshotsRepository } from 'src/modules/persistence/repositories/board-snapshots.repository';
import { JwtAuthGuard } from 'src/modules/auth-integration/guards/jwt-auth.guard';
import { Request } from 'express';

const mockSnapshots = {
  create: jest.fn(),
  listBySessionId: jest.fn(),
  findBySessionSnapshotId: jest.fn(),
};

type AuthRequest = Request & { user?: { email?: string } };

function makeRequest(email?: string): AuthRequest {
  return { user: email !== undefined ? { email } : {} } as AuthRequest;
}

const dto = {
  sessionSnapshotId: '507f1f77bcf86cd799439011',
  savedByEmail: 'user@test.com',
  elements: [{ id: '1' }],
};

describe('WhiteboardController', () => {
  let controller: WhiteboardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhiteboardController],
      providers: [{ provide: BoardSnapshotsRepository, useValue: mockSnapshots }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WhiteboardController>(WhiteboardController);
    jest.clearAllMocks();
  });

  describe('createSnapshot', () => {
    it('creates snapshot when caller email matches dto.savedByEmail', () => {
      mockSnapshots.create.mockResolvedValue({ id: 'snap1' });

      controller.createSnapshot('sess1', makeRequest('user@test.com'), dto);

      expect(mockSnapshots.create).toHaveBeenCalledWith({
        sessionId: 'sess1',
        sessionSnapshotId: dto.sessionSnapshotId,
        savedByEmail: dto.savedByEmail,
        elements: JSON.stringify(dto.elements),
      });
    });

    it('throws ForbiddenException when email mismatch', () => {
      expect(() =>
        controller.createSnapshot('sess1', makeRequest('other@test.com'), dto),
      ).toThrow(ForbiddenException);
    });

    it('throws UnauthorizedException when no user email on request', () => {
      expect(() =>
        controller.createSnapshot('sess1', makeRequest(), dto),
      ).toThrow(UnauthorizedException);
    });
  });

  describe('listSnapshots', () => {
    it('delegates to repository with sessionId', () => {
      mockSnapshots.listBySessionId.mockResolvedValue([]);

      controller.listSnapshots('sess1');

      expect(mockSnapshots.listBySessionId).toHaveBeenCalledWith('sess1');
    });
  });

  describe('getSnapshot', () => {
    it('returns snapshot with parsed elements', async () => {
      const elements = [{ id: '1', type: 'text' }];
      mockSnapshots.findBySessionSnapshotId.mockResolvedValue({
        id: 'snap1',
        sessionId: 'sess1',
        elements: JSON.stringify(elements),
      });

      const result = await controller.getSnapshot('snap1');

      expect(result).toMatchObject({ id: 'snap1', elements });
    });

    it('throws NotFoundException when snapshot not found', async () => {
      mockSnapshots.findBySessionSnapshotId.mockResolvedValue(null);

      await expect(controller.getSnapshot('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
