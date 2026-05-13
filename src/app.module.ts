import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './modules/redis/redis.module';
import { AuthIntegrationModule } from './modules/auth-integration/auth-integration.module';
import { PersistenceModule } from './modules/persistence/persistence.module';
import { WhiteboardModule } from './modules/whiteboard/whiteboard.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    AuthIntegrationModule,
    PersistenceModule,
    WhiteboardModule,
    HealthModule,
  ],
})
export class AppModule {}
