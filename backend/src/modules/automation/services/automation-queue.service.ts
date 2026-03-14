import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AutomationExecution, AutomationExecutionDocument } from '../schemas/automation-execution.schema';

/**
 * In-Memory Automation Queue Service
 * Uses simple in-memory queue instead of Redis/BullMQ
 * 
 * Features:
 * - Synchronous job processing
 * - No external dependencies
 * - Execution tracking via MongoDB
 */

export interface AutomationJobData {
  executionId: string;
  ruleId: string;
  tenantId: string;
  event: string;
  module: string;
  entityType: string;
  entityId: string;
  payload: Record<string, any>;
  userId?: string;
  metadata?: Record<string, any>;
  priority?: number;
  delayMs?: number;
}

interface QueuedJob {
  id: string;
  data: AutomationJobData;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  createdAt: Date;
  processedAt?: Date;
  error?: string;
}

@Injectable()
export class AutomationQueueService {
  private readonly logger = new Logger(AutomationQueueService.name);
  
  private queue: QueuedJob[] = [];
  private processing = false;
  private jobCounter = 0;
  
  // In-memory stats
  private stats = {
    totalJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
  };

  constructor(
    @InjectModel(AutomationExecution.name)
    private executionModel: Model<AutomationExecutionDocument>,
  ) {
    this.logger.log('Using in-memory queue (Redis disabled)');
  }

  /**
   * Add a job to the in-memory queue
   */
  async addJob(data: AutomationJobData): Promise<{ id: string }> {
    const jobId = `job_${++this.jobCounter}_${Date.now()}`;
    
    const job: QueuedJob = {
      id: jobId,
      data,
      status: 'pending',
      attempts: 0,
      createdAt: new Date(),
    };

    this.queue.push(job);
    this.stats.totalJobs++;
    
    this.logger.log(`Job ${jobId} added to in-memory queue for rule ${data.ruleId}`);
    
    // Update execution status to queued
    await this.executionModel.updateOne(
      { executionId: data.executionId },
      { 
        $set: { 
          status: 'queued',
          queuedAt: new Date(),
          'metadata.jobId': jobId,
        }
      }
    );

    // Process queue asynchronously
    setImmediate(() => this.processQueue());

    return { id: jobId };
  }

  /**
   * Process jobs from the queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const job = this.queue.find(j => j.status === 'pending');
      if (!job) break;

      job.status = 'processing';
      job.attempts++;
      job.processedAt = new Date();

      try {
        // Emit event for execution
        // The actual execution is handled by AutomationEngineService
        this.logger.log(`Processing job ${job.id} for execution ${job.data.executionId}`);
        
        // Mark as completed (actual work done by event listener)
        job.status = 'completed';
        this.stats.completedJobs++;
        
      } catch (error: any) {
        this.logger.error(`Job ${job.id} failed: ${error.message}`);
        job.error = error.message;
        
        if (job.attempts < 3) {
          job.status = 'pending'; // Retry
        } else {
          job.status = 'failed';
          this.stats.failedJobs++;
        }
      }
    }

    this.processing = false;
  }

  /**
   * Add multiple jobs in batch
   */
  async addJobsBatch(dataArray: AutomationJobData[]): Promise<{ id: string }[]> {
    const results: { id: string }[] = [];
    
    for (const data of dataArray) {
      const result = await this.addJob(data);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Schedule a job for future execution
   */
  async scheduleJob(
    data: AutomationJobData,
    scheduledTime: Date
  ): Promise<{ id: string }> {
    const delayMs = scheduledTime.getTime() - Date.now();
    
    if (delayMs <= 0) {
      // Immediate execution
      return this.addJob(data);
    }

    // Schedule with delay
    setTimeout(() => {
      this.addJob(data);
    }, delayMs);

    return this.addJob(data);
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<{ 
    state: string; 
    progress: number; 
    attemptsMade: number;
  } | null> {
    const job = this.queue.find(j => j.id === jobId);
    if (!job) return null;

    return {
      state: job.status,
      progress: job.status === 'completed' ? 100 : job.status === 'processing' ? 50 : 0,
      attemptsMade: job.attempts,
    };
  }

  /**
   * Update job progress
   */
  async updateProgress(jobId: string, progress: number): Promise<void> {
    const job = this.queue.find(j => j.id === jobId);
    if (job) {
      // Progress tracking could be added here
      this.logger.debug(`Job ${jobId} progress: ${progress}%`);
    }
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<boolean> {
    const job = this.queue.find(j => j.id === jobId);
    if (!job) return false;

    if (job.status === 'failed') {
      job.status = 'pending';
      job.attempts = 0;
      job.error = undefined;
      
      setImmediate(() => this.processQueue());
      return true;
    }
    return false;
  }

  /**
   * Remove a job from queue
   */
  async removeJob(jobId: string): Promise<boolean> {
    const index = this.queue.findIndex(j => j.id === jobId);
    if (index > -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  }> {
    const waiting = this.queue.filter(j => j.status === 'pending').length;
    const active = this.queue.filter(j => j.status === 'processing').length;
    const completed = this.stats.completedJobs;
    const failed = this.stats.failedJobs;

    return { 
      waiting, 
      active, 
      completed, 
      failed, 
      delayed: 0, 
      paused: 0 
    };
  }

  /**
   * Pause/resume queue (no-op for in-memory)
   */
  async pauseQueue(): Promise<void> {
    this.logger.log('Queue pause requested (in-memory queue)');
  }

  async resumeQueue(): Promise<void> {
    this.logger.log('Queue resume requested (in-memory queue)');
    setImmediate(() => this.processQueue());
  }

  /**
   * Clean old jobs
   */
  async cleanOldJobs(olderThanHours: number = 24): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const initialLength = this.queue.length;
    
    this.queue = this.queue.filter(j => 
      j.status === 'pending' || 
      j.status === 'processing' || 
      (j.processedAt && j.processedAt > cutoff)
    );

    const removed = initialLength - this.queue.length;
    this.logger.log(`Cleaned ${removed} old jobs`);
    return removed;
  }

  /**
   * Get job logs (stored in execution record)
   */
  async getJobLogs(jobId: string): Promise<string[]> {
    // Logs are stored in the execution record, not on the job itself
    return [];
  }

  /**
   * Clear all jobs
   */
  async clearAllJobs(): Promise<void> {
    this.queue = [];
    this.logger.warn('All automation jobs cleared');
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }
}
