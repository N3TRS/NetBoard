import { Test, TestingModule } from '@nestjs/testing';
import { BoardSnapshotsRepository } from './board-snapshots.repository';
import { PrismaService } from '../../../prisma/prisma.service';

const mockPrisma = {
  boardSnapshot: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

const sampleData = {
  sessionId: '507f1f77bcf86cd799439011',
  sessionSnapshotId: '507f1f77bcf86cd799439012',
  savedByEmail: 'user@test.com',
  elements: '[]',
};

describe('BoardSnapshotsRepository', () => {
  let repo: BoardSnapshotsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoardSnapshotsRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repo = module.get<BoardSnapshotsRepository>(BoardSnapshotsRepository);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('delegates to prisma.boardSnapshot.create', () => {
      mockPrisma.boardSnapshot.create.mockResolvedValue({ id: 'id1', ...sampleData });

      repo.create(sampleData);

      expect(mockPrisma.boardSnapshot.create).toHaveBeenCalledWith({ data: sampleData });
    });
  });

  describe('listBySessionId', () => {
    it('queries with correct filters and projection', () => {
      mockPrisma.boardSnapshot.findMany.mockResolvedValue([]);

      repo.listBySessionId('sess1');

      expect(mockPrisma.boardSnapshot.findMany).toHaveBeenCalledWith({
        where: { sessionId: 'sess1' },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          sessionId: true,
          sessionSnapshotId: true,
          savedByEmail: true,
          createdAt: true,
        },
      });
    });

    it('returns empty array when no snapshots', async () => {
      mockPrisma.boardSnapshot.findMany.mockResolvedValue([]);
      const result = await repo.listBySessionId('sess1');
      expect(result).toEqual([]);
    });
  });

  describe('findBySessionSnapshotId', () => {
    it('queries by sessionSnapshotId', () => {
      mockPrisma.boardSnapshot.findUnique.mockResolvedValue(null);

      repo.findBySessionSnapshotId('snap1');

      expect(mockPrisma.boardSnapshot.findUnique).toHaveBeenCalledWith({
        where: { sessionSnapshotId: 'snap1' },
      });
    });

    it('returns snapshot when found', async () => {
      mockPrisma.boardSnapshot.findUnique.mockResolvedValue(sampleData);
      const result = await repo.findBySessionSnapshotId('snap1');
      expect(result).toEqual(sampleData);
    });

    it('returns null when not found', async () => {
      mockPrisma.boardSnapshot.findUnique.mockResolvedValue(null);
      const result = await repo.findBySessionSnapshotId('missing');
      expect(result).toBeNull();
    });
  });
});
