import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

/**
 * Automation Event Bus
 * Centralized event handling for cross-module communication
 * 
 * Flow:
 * Module Event → EventBus.emit() → RuleMatcher.findRules() → Queue.add()
 */

export interface AutomationEvent {
  event: string;           // e.g., 'lead.created'
  module: string;          // e.g., 'leads'
  entityType: string;      // e.g., 'lead'
  entityId: string;        // MongoDB ObjectId as string
  tenantId: string;        // Tenant identifier
  payload: Record<string, any>;  // Full entity data + changes
  metadata?: {
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    timestamp: number;
    correlationId?: string;
  };
}

@Injectable()
export class AutomationEventBus {
  private readonly logger = new Logger(AutomationEventBus.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Emit an automation event
   * Called by modules when significant actions occur
   */
  async emit(event: AutomationEvent): Promise<boolean> {
    try {
      // Add timestamp if not present
      if (!event.metadata) {
        event.metadata = { timestamp: Date.now() };
      }

      // Emit to NestJS event system
      const result = this.eventEmitter.emit(event.event, event);
      
      // Also emit to wildcard listeners
      this.eventEmitter.emit('*', event);
      this.eventEmitter.emit(`${event.module}.*`, event);
      this.eventEmitter.emit(`${event.module}.${event.entityType}.*`, event);

      this.logger.debug(`Event emitted: ${event.event} for ${event.entityType}:${event.entityId}`);
      
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to emit event ${event.event}: ${error.message}`);
      return false;
    }
  }

  /**
   * Emit multiple events in batch
   */
  async emitBatch(events: AutomationEvent[]): Promise<number> {
    let emitted = 0;
    for (const event of events) {
      if (await this.emit(event)) {
        emitted++;
      }
    }
    return emitted;
  }

  /**
   * Subscribe to specific events
   */
  subscribe(
    eventPattern: string,
    handler: (event: AutomationEvent) => Promise<void> | void
  ): () => void {
    const wrappedHandler = (event: AutomationEvent) => {
      Promise.resolve(handler(event)).catch(err => {
        this.logger.error(`Handler error for ${eventPattern}: ${err.message}`);
      });
    };

    this.eventEmitter.on(eventPattern, wrappedHandler);
    
    // Return unsubscribe function
    return () => {
      this.eventEmitter.off(eventPattern, wrappedHandler);
    };
  }

  /**
   * Check if there are listeners for an event
   */
  hasListeners(event: string): boolean {
    return this.eventEmitter.listenerCount(event) > 0;
  }

  /**
   * Get listener count for debugging
   */
  getListenerCount(event?: string): number {
    if (event) {
      return this.eventEmitter.listenerCount(event);
    }
    return this.eventEmitter.eventNames().length;
  }

  /**
   * Wait for an event with timeout
   */
  async waitForEvent(
    eventPattern: string,
    timeoutMs: number = 5000,
    filter?: (event: AutomationEvent) => boolean
  ): Promise<AutomationEvent> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout waiting for event ${eventPattern}`));
      }, timeoutMs);

      const handler = (event: AutomationEvent) => {
        if (!filter || filter(event)) {
          clearTimeout(timeout);
          this.eventEmitter.off(eventPattern, handler);
          resolve(event);
        }
      };

      this.eventEmitter.on(eventPattern, handler);
    });
  }
}
