import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './modules/redis/redis.module';
import { AuthIntegrationModule } from './modules/auth-integration/auth-integration.module';
import { PersistenceModule } from './modules/persistence/persistence.module';
import { WhiteboardModule } from './modules/whiteboard/whiteboard.module';
import { HealthModule } from './modules/health/health.module';
import { McpModule } from './modules/mcp/mcp.module';
import { MetricsController } from './modules/metrics/metrics.controller';
import { MetricsService } from './modules/metrics/metrics.service';
import { MetricsInterceptor } from './modules/metrics/metrics.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
    }),

    PrismaModule,
    RedisModule,
    AuthIntegrationModule,
    PersistenceModule,
    WhiteboardModule,
    HealthModule,
    McpModule,
  ],

  controllers: [MetricsController],

  providers: [
    MetricsService,

    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}