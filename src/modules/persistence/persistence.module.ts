import { Module } from '@nestjs/common';
import { WhiteboardStateRepository } from './repositories/whiteboard-state.repository';
import { BoardSnapshotsRepository } from './repositories/board-snapshots.repository';

@Module({
  providers: [WhiteboardStateRepository, BoardSnapshotsRepository],
  exports: [WhiteboardStateRepository, BoardSnapshotsRepository],
})
export class PersistenceModule {}
