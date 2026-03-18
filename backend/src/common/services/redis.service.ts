import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis | null = null;
  private isConnected = false;
  private readonly logger = new Logger(RedisService.name);
  private connectionAttempts = 0;
  private readonly maxConnectionAttempts = 5;

  constructor(private configService: ConfigService) {
    this.initializeRedis();
  }

  private initializeRedis(): void {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const useTls = this.configService.get<string>('REDIS_TLS') === 'true';
    
    if (!redisUrl) {
      this.logger.warn('[Redis] REDIS_URL not configured, running without cache');
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        tls: useTls ? {} : undefined,
        keepAlive: parseInt(this.configService.get('REDIS_KEEPALIVE') || '30000'),
        retryStrategy: (times) => {
          this.connectionAttempts = times;
          if (times > this.maxConnectionAttempts) {
            this.logger.error(`[Redis] Max reconnection attempts (${this.maxConnectionAttempts}) reached. Giving up.`);
            return null;
          }
          const delay = Math.min(times * 100, 3000);
          this.logger.warn(`[Redis] Reconnection attempt ${times}/${this.maxConnectionAttempts} in ${delay}ms`);
          return delay;
        },
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: true,
        connectTimeout: 5000,
        disconnectTimeout: 2000,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.connectionAttempts = 0;
        this.logger.log('[Redis] Connected successfully');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        this.logger.log('[Redis] Ready to accept commands');
      });

      this.client.on('error', (err) => {
        if (this.isConnected) {
          this.logger.error('[Redis] Error:', err.message);
        }
      });

      this.client.on('close', () => {
        this.isConnected = false;
        this.logger.warn('[Redis] Connection closed');
      });

      this.client.on('reconnecting', () => {
        this.isConnected = false;
        this.logger.warn('[Redis] Reconnecting...');
      });

      this.client.on('end', () => {
        this.isConnected = false;
        this.logger.warn('[Redis] Connection ended');
      });

    } catch (error: any) {
      this.logger.error('[Redis] Failed to initialize:', error.message);
      this.client = null;
      this.isConnected = false;
    }
  }

  isReady(): boolean {
    return this.isConnected && this.client !== null && this.client.status === 'ready';
  }

  getClient(): Redis | null {
    return this.client;
  }

  private safeExecute<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
    if (!this.client || !this.isConnected) {
      return Promise.resolve(fallback);
    }

    if (this.client.status !== 'ready') {
      this.logger.debug('[Redis] Client not ready, using fallback');
      return Promise.resolve(fallback);
    }

    return operation().catch((error) => {
      this.logger.warn('[Redis] Operation failed:', error.message);
      return fallback;
    });
  }

  async get(key: string): Promise<string | null> {
    return this.safeExecute(
      () => this.client!.get(key),
      null
    );
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    return this.safeExecute(
      async () => {
        if (ttlSeconds) {
          await this.client!.setex(key, ttlSeconds, value);
        } else {
          await this.client!.set(key, value);
        }
      },
      undefined
    );
  }

  async del(key: string): Promise<void> {
    return this.safeExecute(
      () => this.client!.del(key).then(() => undefined),
      undefined
    );
  }

  async exists(key: string): Promise<boolean> {
    return this.safeExecute(
      async () => {
        const result = await this.client!.exists(key);
        return result === 1;
      },
      false
    );
  }

  async keys(pattern: string): Promise<string[]> {
    return this.safeExecute(
      () => this.client!.keys(pattern),
      []
    );
  }

  async flushAll(): Promise<void> {
    return this.safeExecute(
      () => this.client!.flushall().then(() => undefined),
      undefined
    );
  }

  async expire(key: string, seconds: number): Promise<void> {
    return this.safeExecute(
      () => this.client!.expire(key, seconds).then(() => undefined),
      undefined
    );
  }

  async ttl(key: string): Promise<number> {
    return this.safeExecute(
      () => this.client!.ttl(key),
      -1
    );
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
        this.logger.log('[Redis] Connection closed gracefully');
      } catch (error: any) {
        this.logger.warn('[Redis] Error closing connection:', error.message);
      }
    }
  }
}
