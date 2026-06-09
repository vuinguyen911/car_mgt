import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: Redis | null = null;
  private available = false;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    try {
      this.client = new Redis({
        host: this.config.get<string>('redis.host') ?? 'localhost',
        port: this.config.get<number>('redis.port') ?? 6379,
        password: this.config.get<string>('redis.password') || undefined,
        db: this.config.get<number>('redis.db') ?? 0,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 3000,
        enableOfflineQueue: false,
      });

      this.client.on('error', (err) => {
        if (this.available) {
          this.logger.warn(`Redis disconnected: ${err.message}`);
          this.available = false;
        }
      });

      await this.client.connect();
      this.available = true;
      this.logger.log('Redis cache connected');
    } catch (err: any) {
      this.logger.warn(`Redis cache unavailable — running without cache: ${err.message}`);
      this.available = false;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => {});
    }
  }

  isAvailable(): boolean { return this.available; }

  async get<T>(key: string): Promise<T | null> {
    if (!this.available || !this.client) return null;
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    if (!this.available || !this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {}
  }

  async del(key: string): Promise<void> {
    if (!this.available || !this.client) return;
    try {
      await this.client.del(key);
    } catch {}
  }

  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.available || !this.client) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch {}
  }

  /** Cache-aside helper: get from cache or compute & store */
  async getOrSet<T>(key: string, fn: () => Promise<T>, ttlSeconds = 300): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await fn();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  async ping(): Promise<boolean> {
    if (!this.available || !this.client) return false;
    try {
      const res = await this.client.ping();
      return res === 'PONG';
    } catch {
      return false;
    }
  }
}
