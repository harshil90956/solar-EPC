import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AutomationExecution, AutomationExecutionDocument } from '../schemas/automation-execution.schema';
import { AutomationEngineService } from '../services/automation-engine.service';
import { AutomationJobData } from '../services/automation-queue.service';

/**
 * Automation Worker
 * Processes automation jobs from the in-memory queue
 * 
 * Features:
 * - Direct execution via AutomationEngineService
 * - No external dependencies (Redis/BullMQ)
 * - Retry logic with exponential backoff
 * - Concurrency control
 */

@Injectable()
export class AutomationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutomationWorker.name);
  private isRunning = false;
  private concurrency = 5;
  private processingCount = 0;

  constructor(
    private readonly automationEngine: AutomationEngineService,
    @InjectModel(AutomationExecution.name)
    private executionModel: Model<AutomationExecutionDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log(`Automation worker initialized with concurrency ${this.concurrency}`);
    this.isRunning = true;
  }

  async onModuleDestroy(): Promise<void> {
    this.isRunning = false;
    this.logger.log('Automation worker shut down');
  }

  /**
   * Process a job directly
   * Called by the queue service when a job is ready
   */
  async processJob(data: AutomationJobData): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Worker not running, skipping job');
      return;
    }

    // Check concurrency limit
    if (this.processingCount >= this.concurrency) {
      this.logger.debug(`Concurrency limit reached (${this.processingCount}/${this.concurrency}), waiting...`);
      await this.waitForSlot();
    }

    this.processingCount++;
    const startTime = Date.now();

    try {
      this.logger.log(`Processing job for execution ${data.executionId}, rule ${data.ruleId}`);

      // Execute the automation
      await this.automationEngine.executeFromQueue(data);

      const duration = Date.now() - startTime;
      this.logger.log(`Job completed in ${duration}ms for execution ${data.executionId}`);

    } catch (error: any) {
      this.logger.error(`Job failed for execution ${data.executionId}: ${error.message}`);

      // Update execution status to failed
      await this.executionModel.updateOne(
        { executionId: data.executionId },
        {
          $set: {
            status: 'failed',
            failedAt: new Date(),
            errorMessage: error.message,
          },
        }
      );
    } finally {
      this.processingCount--;
    }
  }

  /**
   * Wait for a processing slot to become available
   */
  private async waitForSlot(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.processingCount < this.concurrency) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Get current processing stats
   */
  getStats(): {
    isRunning: boolean;
    concurrency: number;
    processingCount: number;
  } {
    return {
      isRunning: this.isRunning,
      concurrency: this.concurrency,
      processingCount: this.processingCount,
    };
  }

  /**
   * Set concurrency limit
   */
  setConcurrency(limit: number): void {
    this.concurrency = limit;
    this.logger.log(`Concurrency set to ${limit}`);
  }

  /**
   * Pause processing
   */
  pause(): void {
    this.isRunning = false;
    this.logger.log('Worker paused');
  }

  /**
   * Resume processing
   */
  resume(): void {
    this.isRunning = true;
    this.logger.log('Worker resumed');
  }
}
