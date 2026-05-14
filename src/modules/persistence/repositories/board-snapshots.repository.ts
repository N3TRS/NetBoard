import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface CreateBoardSnapshotInput {
  sessionId: string;
  sessionSnapshotId: string;
  savedByEmail: string;
  elements: string;
}

@Injectable()
export class BoardSnapshotsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateBoardSnapshotInput) {
    return this.prisma.boardSnapshot.create({ data });
  }

  listBySessionId(sessionId: string) {
    return this.prisma.boardSnapshot.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        sessionId: true,
        sessionSnapshotId: true,
        savedByEmail: true,
        createdAt: true,
      },
    });
  }

  findBySessionSnapshotId(sessionSnapshotId: string) {
    return this.prisma.boardSnapshot.findUnique({
      where: { sessionSnapshotId },
    });
  }
}
