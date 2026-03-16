import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AutomationRule, AutomationRuleDocument } from '../schemas/automation-rule.schema';

/**
 * Rule Matcher Service
 * Uses HashMap indexing for O(1) rule lookup by event
 * 
 * Architecture:
 * - In-memory index: Map<EventName, List<Rule>>
 * - Updates index when rules are created/updated/deleted/toggled
 * - Falls back to database query if index miss
 */

interface RuleIndex {
  byEvent: Map<string, AutomationRule[]>;
  byModule: Map<string, AutomationRule[]>;
  byTenant: Map<string, AutomationRule[]>;
  byId: Map<string, AutomationRule>;
}

@Injectable()
export class RuleMatcherService {
  private readonly logger = new Logger(RuleMatcherService.name);
  
  // In-memory index for fast lookups
  private ruleIndex: RuleIndex = {
    byEvent: new Map(),
    byModule: new Map(),
    byTenant: new Map(),
    byId: new Map(),
  };

  // Track if index needs refresh
  private indexDirty = true;
  private lastIndexUpdate = 0;
  private readonly INDEX_TTL_MS = 60000; // 1 minute

  constructor(
    @InjectModel(AutomationRule.name) private automationRuleModel: Model<AutomationRuleDocument>,
  ) {}

  /**
   * Build the in-memory rule index
   * Called on startup and periodically
   */
  async buildIndex(): Promise<void> {
    try {
      this.logger.log('Building rule index...');
      
      // Clear existing index
      this.ruleIndex = {
        byEvent: new Map(),
        byModule: new Map(),
        byTenant: new Map(),
        byId: new Map(),
      };

      // Fetch all enabled rules
      const rules = await this.automationRuleModel.find({ enabled: true }).lean();

      for (const rule of rules) {
        this.indexRule(rule as AutomationRule);
      }

      this.indexDirty = false;
      this.lastIndexUpdate = Date.now();
      
      this.logger.log(`Rule index built: ${rules.length} rules indexed`);
    } catch (error: any) {
      this.logger.error(`Failed to build rule index: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add a rule to the index
   */
  private indexRule(rule: AutomationRule): void {
    const tenantId = rule.tenantId.toString();
    const event = rule.trigger?.event;
    const module = rule.trigger?.module;

    // Index by ID
    this.ruleIndex.byId.set(rule.ruleId, rule);

    // Index by tenant
    if (!this.ruleIndex.byTenant.has(tenantId)) {
      this.ruleIndex.byTenant.set(tenantId, []);
    }
    this.ruleIndex.byTenant.get(tenantId)!.push(rule);

    // Index by event (primary lookup key)
    if (event) {
      if (!this.ruleIndex.byEvent.has(event)) {
        this.ruleIndex.byEvent.set(event, []);
      }
      this.ruleIndex.byEvent.get(event)!.push(rule);
    }

    // Index by module
    if (module) {
      if (!this.ruleIndex.byModule.has(module)) {
        this.ruleIndex.byModule.set(module, []);
      }
      this.ruleIndex.byModule.get(module)!.push(rule);
    }
  }

  /**
   * Remove a rule from the index
   */
  private unindexRule(ruleId: string): void {
    const rule = this.ruleIndex.byId.get(ruleId);
    if (!rule) return;

    this.ruleIndex.byId.delete(ruleId);
    this.indexDirty = true;

    // Note: Full rebuild is more efficient than trying to remove from all collections
    // The next query will trigger a rebuild if needed
  }

  /**
   * Find matching rules for an event - O(1) lookup
   */
  async findMatchingRules(
    event: string,
    tenantId: string,
    options: {
      module?: string;
      entityType?: string;
    } = {}
  ): Promise<AutomationRule[]> {
    // Check if index needs refresh
    if (this.indexDirty || Date.now() - this.lastIndexUpdate > this.INDEX_TTL_MS) {
      await this.buildIndex();
    }

    // Get rules by event (primary filter)
    let candidates = this.ruleIndex.byEvent.get(event) || [];

    // Filter by tenant
    candidates = candidates.filter(rule => rule.tenantId.toString() === tenantId);

    // Additional filtering
    if (options.module) {
      candidates = candidates.filter(rule => rule.trigger?.module === options.module);
    }

    if (options.entityType) {
      candidates = candidates.filter(rule => rule.trigger?.entityType === options.entityType);
    }

    return candidates;
  }

  /**
   * Find rules by tenant
   */
  async findRulesByTenant(tenantId: string): Promise<AutomationRule[]> {
    if (this.indexDirty || Date.now() - this.lastIndexUpdate > this.INDEX_TTL_MS) {
      await this.buildIndex();
    }

    return this.ruleIndex.byTenant.get(tenantId) || [];
  }

  /**
   * Find a single rule by ID - O(1)
   */
  async findRuleById(ruleId: string): Promise<AutomationRule | null> {
    if (this.indexDirty || Date.now() - this.lastIndexUpdate > this.INDEX_TTL_MS) {
      await this.buildIndex();
    }

    // Check in-memory index first
    const indexed = this.ruleIndex.byId.get(ruleId);
    if (indexed) return indexed;

    // Fallback to database
    const rule = await this.automationRuleModel.findOne({ ruleId }).lean();
    return rule as AutomationRule | null;
  }

  /**
   * Refresh index after rule changes
   */
  async onRuleChanged(ruleId?: string): Promise<void> {
    this.indexDirty = true;
    
    if (ruleId) {
      this.unindexRule(ruleId);
    }

    // Schedule immediate rebuild
    await this.buildIndex();
  }

  /**
   * Get index statistics
   */
  getIndexStats(): {
    totalRules: number;
    eventsIndexed: number;
    modulesIndexed: number;
    tenantsIndexed: number;
    lastUpdate: number;
    isDirty: boolean;
  } {
    return {
      totalRules: this.ruleIndex.byId.size,
      eventsIndexed: this.ruleIndex.byEvent.size,
      modulesIndexed: this.ruleIndex.byModule.size,
      tenantsIndexed: this.ruleIndex.byTenant.size,
      lastUpdate: this.lastIndexUpdate,
      isDirty: this.indexDirty,
    };
  }

  /**
   * Get all registered events (for UI)
   */
  getRegisteredEvents(): string[] {
    return Array.from(this.ruleIndex.byEvent.keys());
  }

  /**
   * Get rules by module (for debugging)
   */
  getRulesByModule(module: string): AutomationRule[] {
    return this.ruleIndex.byModule.get(module) || [];
  }

  /**
   * Preload all rules for a tenant into memory
   * Useful before bulk processing
   */
  async preloadTenantRules(tenantId: string): Promise<number> {
    const rules = await this.automationRuleModel.find({ 
      tenantId: new Types.ObjectId(tenantId),
      enabled: true 
    }).lean();

    for (const rule of rules) {
      this.indexRule(rule as AutomationRule);
    }

    return rules.length;
  }
}
