import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import {
  REDIS_CLIENT,
  WHITEBOARD_STATE_TTL_SECONDS,
} from './redis.constants';
import { whiteboardStateKey } from './redis.utils';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly client: Redis,
  ) {}

  async setWhiteboardState(
    sessionId: string,
    elements: unknown[],
  ): Promise<void> {
    await this.client.set(
      whiteboardStateKey(sessionId),
      JSON.stringify(elements),
      'EX',
      WHITEBOARD_STATE_TTL_SECONDS,
    );
  }

  async getWhiteboardState(sessionId: string): Promise<unknown[] | null> {
    const value = await this.client.get(whiteboardStateKey(sessionId));
    if (!value) return null;
    return JSON.parse(value) as unknown[];
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
