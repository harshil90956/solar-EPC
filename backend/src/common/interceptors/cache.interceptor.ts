import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from '../services/redis.service';

/**
 * CacheInterceptor - Automatic API Response Caching
 * 
 * Usage:
 * @UseInterceptors(CacheInterceptor)
 * @Get('dashboard/kpis')
 * async getDashboardKpis() { ... }
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private redisService: RedisService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const cacheKey = this.generateCacheKey(request);
    const ttl = this.getTTLFromRequest(request);
    
    // Try to get from cache
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      console.log(`[CacheInterceptor] Cache HIT for: ${cacheKey}`);
      return of(JSON.parse(cached));
    }
    
    console.log(`[CacheInterceptor] Cache MISS for: ${cacheKey}`);
    
    // Execute handler and cache result
    return next.handle().pipe(
      tap(async (data) => {
        try {
          await this.redisService.set(cacheKey, JSON.stringify(data), ttl);
          console.log(`[CacheInterceptor] Cached response for: ${cacheKey} (TTL: ${ttl}s)`);
        } catch (error) {
          console.error(`[CacheInterceptor] Failed to cache response:`, (error as any).message);
        }
      }),
    );
  }
  
  private generateCacheKey(request: any): string {
    const method = request.method;
    const url = request.url;
    const userId = request.user?.id || request.user?._id || 'anonymous';
    const tenantId = request.tenant?.id || 'default';
    const queryHash = this.simpleHash(JSON.stringify(request.query));
    
    return `api:${tenantId}:${method}:${url}:${userId}:${queryHash}`;
  }
  
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).substring(0, 8);
  }
  
  private getTTLFromRequest(request: any): number {
    // Default TTL by endpoint pattern
    const url = request.url;
    
    if (url.includes('/dashboard/')) return 60;
    if (url.includes('/stats')) return 60;
    if (url.includes('/list') || url.includes('?page=')) return 30;
    if (url.includes('/options') || url.includes('/categories')) return 600;
    
    return 60; // Default 60 seconds
  }
}

/**
 * Cache decorator for method-level caching
 * 
 * Usage:
 * @Cacheable('dashboard:kpis', 60)
 * async getDashboardKpis() { ... }
 */
export function Cacheable(keyPrefix: string, ttlSeconds: number = 60) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      // Get RedisService from the class instance
      const self = this as any;
      const redisService: RedisService = self.redisService;
      
      if (!redisService) {
        console.warn(`[Cacheable] redisService not found on class, executing without cache`);
        return originalMethod.apply(this, args);
      }
      
      // Generate cache key with args hash
      const argsHash = JSON.stringify(args);
      const cacheKey = `${keyPrefix}:${argsHash}`;
      
      // Try cache
      const cached = await redisService.get(cacheKey);
      if (cached) {
        console.log(`[Cacheable] HIT: ${cacheKey}`);
        return JSON.parse(cached);
      }
      
      // Execute and cache
      console.log(`[Cacheable] MISS: ${cacheKey}`);
      const result = await originalMethod.apply(this, args);
      await redisService.set(cacheKey, JSON.stringify(result), ttlSeconds);
      
      return result;
    };
    
    return descriptor;
  };
}

/**
 * CacheEvict decorator - Clear cache on data modification
 * 
 * Usage:
 * @CacheEvict('dashboard:*')
 * async createLead() { ... }
 */
export function CacheEvict(pattern: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const self = this as any;
      const redisService: RedisService = self.redisService;
      
      // Execute the method first
      const result = await originalMethod.apply(this, args);
      
      // Then invalidate cache
      if (redisService) {
        try {
          const keys = await redisService.keys(pattern);
          for (const key of keys) {
            await redisService.del(key);
          }
          console.log(`[CacheEvict] Cleared ${keys.length} keys matching: ${pattern}`);
        } catch (error) {
          console.error(`[CacheEvict] Failed to clear cache:`, (error as any).message);
        }
      }
      
      return result;
    };
    
    return descriptor;
  };
}
