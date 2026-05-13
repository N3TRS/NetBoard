import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth-integration/guards/jwt-auth.guard';
import { BoardSnapshotsRepository } from '../persistence/repositories/board-snapshots.repository';
import { CreateBoardSnapshotDto } from './dto/create-board-snapshot.dto';

type AuthenticatedRequest = Request & { user?: { email?: string } };

@ApiTags('boards')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
@Controller('boards')
@UseGuards(JwtAuthGuard)
export class WhiteboardController {
  constructor(private readonly snapshots: BoardSnapshotsRepository) {}

  @Post(':sessionId/snapshots')
  @ApiOperation({
    summary: 'Save a whiteboard snapshot paired with a session snapshot',
  })
  @ApiParam({ name: 'sessionId', description: 'Session Mongo ObjectId.' })
  @ApiForbiddenResponse({
    description: 'Caller email does not match savedByEmail.',
  })
  createSnapshot(
    @Param('sessionId') sessionId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateBoardSnapshotDto,
  ) {
    const callerEmail = this.getUserEmail(request);

    if (callerEmail !== dto.savedByEmail) {
      throw new ForbiddenException(
        'savedByEmail must match the authenticated user',
      );
    }

    return this.snapshots.create({
      sessionId,
      sessionSnapshotId: dto.sessionSnapshotId,
      savedByEmail: dto.savedByEmail,
      elements: JSON.stringify(dto.elements),
    });
  }

  @Get(':sessionId/snapshots')
  @ApiOperation({
    summary: 'List whiteboard snapshots for a session (metadata only)',
  })
  @ApiParam({ name: 'sessionId', description: 'Session Mongo ObjectId.' })
  listSnapshots(@Param('sessionId') sessionId: string) {
    return this.snapshots.listBySessionId(sessionId);
  }

  @Get('snapshots/:sessionSnapshotId')
  @ApiOperation({
    summary: 'Get a whiteboard snapshot by its paired session-snapshot id',
  })
  @ApiParam({
    name: 'sessionSnapshotId',
    description: 'SessionSnapshot id from net-sessions.',
  })
  @ApiNotFoundResponse({ description: 'No board snapshot for this id.' })
  async getSnapshot(
    @Param('sessionSnapshotId') sessionSnapshotId: string,
  ) {
    const row = await this.snapshots.findBySessionSnapshotId(sessionSnapshotId);

    if (!row) {
      throw new NotFoundException('Board snapshot not found');
    }

    return {
      ...row,
      elements: JSON.parse(row.elements) as unknown[],
    };
  }

  private getUserEmail(request: AuthenticatedRequest): string {
    const email = request.user?.email;
    if (!email) {
      throw new UnauthorizedException('Authenticated user email is required');
    }
    return email;
  }
}
