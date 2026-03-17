import { Injectable } from '@nestjs/common';
import { RedisService } from '../services/redis.service';

/**
 * CacheInvalidationService - Centralized Cache Management
 * 
 * Provides methods to invalidate caches across the application
 * when data changes occur.
 */
@Injectable()
export class CacheInvalidationService {
  constructor(private redisService: RedisService) {}

  /**
   * Invalidate all dashboard caches for a tenant
   * Call this when any dashboard-affecting data changes
   */
  async invalidateDashboard(tenantId: string): Promise<number> {
    const pattern = `*dashboard*:${tenantId}:*`;
    return this.invalidateByPattern(pattern);
  }

  /**
   * Invalidate module-specific caches
   * @param module - Module name (e.g., 'leads', 'projects', 'inventory')
   * @param tenantId - Tenant identifier
   */
  async invalidateModule(module: string, tenantId: string): Promise<number> {
    const patterns = [
      `*${module}*:${tenantId}:*`,
      `*stats*:${tenantId}:*`,
      `*list*:${module}*:${tenantId}:*`,
    ];
    
    let totalDeleted = 0;
    for (const pattern of patterns) {
      totalDeleted += await this.invalidateByPattern(pattern);
    }
    return totalDeleted;
  }

  /**
   * Invalidate list caches for a specific module
   * Call this when new records are created or deleted
   */
  async invalidateListCaches(module: string, tenantId: string): Promise<number> {
    const pattern = `*list*:${module}*:${tenantId}:*`;
    return this.invalidateByPattern(pattern);
  }

  /**
   * Invalidate stats caches for a specific module
   * Call this when any statistics-affecting data changes
   */
  async invalidateStats(module: string, tenantId: string): Promise<number> {
    const pattern = `*${module}:stats:${tenantId}:*`;
    return this.invalidateByPattern(pattern);
  }

  /**
   * Invalidate settings-related caches
   * Call this when settings are updated
   */
  async invalidateSettings(tenantId: string): Promise<number> {
    const patterns = [
      `*settings*:${tenantId}:*`,
      `*status*:${tenantId}:*`,
      `*categories*:${tenantId}:*`,
      `*options*:${tenantId}:*`,
    ];
    
    let totalDeleted = 0;
    for (const pattern of patterns) {
      totalDeleted += await this.invalidateByPattern(pattern);
    }
    return totalDeleted;
  }

  /**
   * Invalidate user-specific caches
   */
  async invalidateUser(userId: string, tenantId?: string): Promise<number> {
    const pattern = tenantId 
      ? `*:${tenantId}:*:${userId}:*`
      : `*:*:${userId}:*`;
    return this.invalidateByPattern(pattern);
  }

  /**
   * Generic data change handler - invalidate relevant caches
   * @param module - Module where change occurred
   * @param tenantId - Tenant identifier
   * @param operation - Type of operation (create, update, delete)
   * @param options - Additional options
   */
  async onDataChange(
    module: string,
    tenantId: string,
    operation: 'create' | 'update' | 'delete',
    options?: {
      invalidateDashboard?: boolean;
      invalidateLists?: boolean;
      invalidateStats?: boolean;
      invalidateSettings?: boolean;
    }
  ): Promise<{ deleted: number; patterns: string[] }> {
    const defaults = {
      invalidateDashboard: true,
      invalidateLists: operation === 'create' || operation === 'delete',
      invalidateStats: true,
      invalidateSettings: false,
    };
    
    const config = { ...defaults, ...options };
    const patterns: string[] = [];
    let totalDeleted = 0;

    // Always invalidate module caches
    const moduleCount = await this.invalidateModule(module, tenantId);
    totalDeleted += moduleCount;
    patterns.push(`module:${module}:${tenantId}`);

    // Invalidate dashboard if requested
    if (config.invalidateDashboard) {
      const dashboardCount = await this.invalidateDashboard(tenantId);
      totalDeleted += dashboardCount;
      patterns.push(`dashboard:${tenantId}`);
    }

    // Invalidate lists if requested
    if (config.invalidateLists) {
      const listCount = await this.invalidateListCaches(module, tenantId);
      totalDeleted += listCount;
      patterns.push(`list:${module}:${tenantId}`);
    }

    // Invalidate stats if requested
    if (config.invalidateStats) {
      const statsCount = await this.invalidateStats(module, tenantId);
      totalDeleted += statsCount;
      patterns.push(`stats:${module}:${tenantId}`);
    }

    // Invalidate settings if requested
    if (config.invalidateSettings) {
      const settingsCount = await this.invalidateSettings(tenantId);
      totalDeleted += settingsCount;
      patterns.push(`settings:${tenantId}`);
    }

    console.log(`[CacheInvalidation] Cleared ${totalDeleted} keys for ${module}:${tenantId} (${operation})`);
    return { deleted: totalDeleted, patterns };
  }

  /**
   * Invalidate caches by pattern
   * @returns Number of keys deleted
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redisService.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      // Delete keys in batches of 100 to avoid blocking Redis
      const batchSize = 100;
      let deleted = 0;
      
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        for (const key of batch) {
          await this.redisService.del(key);
          deleted++;
        }
      }

      return deleted;
    } catch (error) {
      console.error(`[CacheInvalidation] Error invalidating pattern ${pattern}:`, (error as any).message);
      return 0;
    }
  }

  /**
   * Clear all caches - USE WITH CAUTION
   */
  async clearAll(): Promise<void> {
    await this.redisService.flushAll();
    console.log('[CacheInvalidation] All caches cleared');
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    dashboardKeys: number;
    listKeys: number;
    statsKeys: number;
    settingsKeys: number;
  }> {
    const allKeys = await this.redisService.keys('*');
    
    return {
      totalKeys: allKeys.length,
      dashboardKeys: allKeys.filter(k => k.includes('dashboard')).length,
      listKeys: allKeys.filter(k => k.includes('list')).length,
      statsKeys: allKeys.filter(k => k.includes('stats')).length,
      settingsKeys: allKeys.filter(k => k.includes('settings') || k.includes('options')).length,
    };
  }

  /**
   * Pre-warm cache for a tenant
   * Call this on application startup or after cache clear
   */
  async warmCache(
    tenantId: string,
    warmers: Array<() => Promise<any>>
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const warmer of warmers) {
      try {
        await warmer();
        success++;
      } catch (error) {
        console.error('[CacheWarmup] Failed to warm cache:', (error as any).message);
        failed++;
      }
    }

    console.log(`[CacheWarmup] Completed: ${success} success, ${failed} failed`);
    return { success, failed };
  }
}
