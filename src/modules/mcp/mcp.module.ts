import { Module } from '@nestjs/common';
import { WhiteboardModule } from '../whiteboard/whiteboard.module';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';

@Module({
  imports: [WhiteboardModule],
  controllers: [McpController],
  providers: [McpService],
})
export class McpModule {}
