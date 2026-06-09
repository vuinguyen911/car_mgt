import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v4 as uuid } from 'uuid';
import { IMPORT_QUEUE } from './import.constants';
import type { ImportJobData } from './import.processor';

@Injectable()
export class ImportService {
  constructor(@InjectQueue(IMPORT_QUEUE) private queue: Queue) {}

  async queueCsvImport(
    tenantId: string,
    branchId: string,
    userId: string,
    buffer: Buffer,
  ) {
    const importId = uuid();
    const job = await this.queue.add(
      'csv-import',
      {
        tenantId,
        branchId,
        userId,
        csvBuffer: Array.from(buffer),
        importId,
      } satisfies ImportJobData,
      {
        attempts: 2,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );

    return { importId, jobId: job.id, status: 'queued' };
  }

  async getJobStatus(jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) return null;
    const state = await job.getState();
    return {
      jobId,
      state,
      progress: job.progress,
      result: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);
    return { waiting, active, completed, failed };
  }
}
