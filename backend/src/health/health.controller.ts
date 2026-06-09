import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import { CacheService } from '../common/cache/cache.service';

@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  @Get()
  async check() {
    const start = Date.now();

    // DB check
    let dbStatus = 'ok';
    let dbLatencyMs = 0;
    try {
      const t0 = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - t0;
    } catch {
      dbStatus = 'error';
    }

    // Redis check
    const redisOk = await this.cache.ping();

    const uptime = process.uptime();
    const mem = process.memoryUsage();

    return {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
      uptimeSeconds: Math.floor(uptime),
      checks: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
        redis: {
          status: redisOk ? 'ok' : 'unavailable',
          available: redisOk,
        },
      },
      memory: {
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
        rssMB: Math.round(mem.rss / 1024 / 1024),
      },
      responseTimeMs: Date.now() - start,
    };
  }

  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready' };
    } catch {
      return { status: 'not ready', reason: 'database unavailable' };
    }
  }

  @Get('live')
  live() {
    return { status: 'alive', pid: process.pid };
  }
}
