import { Test, TestingModule } from '@nestjs/testing';
import { WhiteboardStateRepository } from './whiteboard-state.repository';
import { PrismaService } from '../../../prisma/prisma.service';

const mockPrisma = {
  whiteboardState: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
  },
};

describe('WhiteboardStateRepository', () => {
  let repo: WhiteboardStateRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhiteboardStateRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repo = module.get<WhiteboardStateRepository>(WhiteboardStateRepository);
    jest.clearAllMocks();
  });

  describe('upsert', () => {
    it('calls prisma upsert with JSON-serialized elements', async () => {
      mockPrisma.whiteboardState.upsert.mockResolvedValue({});
      const elements = [{ id: '1', type: 'rectangle' }];

      await repo.upsert('sess1', elements);

      expect(mockPrisma.whiteboardState.upsert).toHaveBeenCalledWith({
        where: { sessionId: 'sess1' },
        update: { elements: JSON.stringify(elements) },
        create: { sessionId: 'sess1', elements: JSON.stringify(elements) },
      });
    });

    it('upserts empty array correctly', async () => {
      mockPrisma.whiteboardState.upsert.mockResolvedValue({});
      await repo.upsert('sess1', []);
      expect(mockPrisma.whiteboardState.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { elements: '[]' } }),
      );
    });
  });

  describe('findBySessionId', () => {
    it('calls prisma findUnique with sessionId', () => {
      const row = { sessionId: 'sess1', elements: '[]' };
      mockPrisma.whiteboardState.findUnique.mockResolvedValue(row);

      repo.findBySessionId('sess1');

      expect(mockPrisma.whiteboardState.findUnique).toHaveBeenCalledWith({
        where: { sessionId: 'sess1' },
      });
    });

    it('returns null when no row found', async () => {
      mockPrisma.whiteboardState.findUnique.mockResolvedValue(null);
      const result = await repo.findBySessionId('missing');
      expect(result).toBeNull();
    });
  });
});
