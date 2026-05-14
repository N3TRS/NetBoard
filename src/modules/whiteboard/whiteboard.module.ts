import { Module } from '@nestjs/common';
import { AuthIntegrationModule } from '../auth-integration/auth-integration.module';
import { RedisModule } from '../redis/redis.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { WhiteboardGateway } from './whiteboard.gateway';
import { WhiteboardJwtGuard } from './whiteboard-jwt.guard';
import { WhiteboardController } from './whiteboard.controller';

@Module({
  imports: [AuthIntegrationModule, RedisModule, PersistenceModule],
  controllers: [WhiteboardController],
  providers: [WhiteboardGateway, WhiteboardJwtGuard],
  exports: [WhiteboardGateway],
})
export class WhiteboardModule {}
