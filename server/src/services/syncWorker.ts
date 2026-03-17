import { prisma } from '../index.js';
import { syncService } from './syncService.js';

// Sync worker that processes pending sync jobs
export class SyncWorker {
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;

  // Start the worker
  start(intervalMs = 10000) {
    console.log('[SyncWorker] Starting sync worker...');
    this.intervalId = setInterval(() => {
      this.processJobs();
    }, intervalMs);
  }

  // Stop the worker
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isRunning = false;
  }

  // Execute a job immediately (public method for API calls)
  async executeJobNow(jobId: string, fallbackToken?: string): Promise<void> {
    console.log(`[SyncWorker] Immediate execution requested for job ${jobId}`);
    await this.executeJob(jobId, fallbackToken);
  }

  // Process pending jobs
  private async processJobs() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      // Find pending or failed jobs
      const pendingJobs = await prisma.syncJob.findMany({
        where: {
          status: { in: ['pending', 'failed'] },
        },
        take: 5, // Process 5 jobs at a time
        orderBy: { createdAt: 'asc' },
      });

      if (pendingJobs.length > 0) {
        console.log(`[SyncWorker] Found ${pendingJobs.length} pending jobs`);
      }

      for (const job of pendingJobs) {
        await this.executeJob(job.id);
      }
    } catch (error) {
      console.error('[SyncWorker] Error processing jobs:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Execute a single job
  async executeJob(jobId: string, fallbackToken?: string) {
    console.log(`[SyncWorker] Executing job ${jobId}`);

    try {
      // Update job status to running
      await prisma.syncJob.update({
        where: { id: jobId },
        data: {
          status: 'running',
          startedAt: new Date(),
        },
      });

      // Get job details
      const job = await prisma.syncJob.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new Error('Job not found');
      }

      // Get repository details
      const repository = await prisma.repository.findUnique({
        where: { id: job.repositoryId },
      });

      if (!repository) {
        throw new Error('Repository not found');
      }

      // Get user's GitHub token from repository members
      let githubToken: string | undefined = fallbackToken;

      if (!githubToken) {
        // First try the userId stored in the job
        if (job.userId) {
          const user = await prisma.user.findUnique({
            where: { id: job.userId },
            select: { githubToken: true },
          });
          githubToken = user?.githubToken || undefined;
        }
        // Fall back to any repository member
        if (!githubToken) {
          const repoMember = await prisma.repositoryMember.findFirst({
            where: { repositoryId: job.repositoryId },
            include: { user: { select: { githubToken: true } } },
          });
          githubToken = repoMember?.user?.githubToken || undefined;
        }
      }

      if (!githubToken) {
        throw new Error('No GitHub token found for repository');
      }

      // Execute sync using SyncService
      const [owner, repo] = repository.fullName.split('/');
      if (!owner || !repo) {
        throw new Error('Invalid repository full name');
      }

      const result = await syncService.syncRepository({
        repositoryId: job.repositoryId,
        owner,
        repo,
        githubToken,
        syncType: job.syncType as 'full' | 'incremental',
      });

      // Update job status based on result
      if (result.errors.length === 0) {
        await prisma.syncJob.update({
          where: { id: jobId },
          data: {
            status: 'completed',
            completedAt: new Date(),
            stats: {
              issuesSynced: result.issuesSynced,
              pullRequestsSynced: result.pullRequestsSynced,
              commentsSynced: result.commentsSynced,
            },
          },
        });
        console.log(`[SyncWorker] Job ${jobId} completed successfully`);
      } else {
        await prisma.syncJob.update({
          where: { id: jobId },
          data: {
            status: 'failed',
            completedAt: new Date(),
            errorMessage: result.errors.join('; '),
            stats: {
              issuesSynced: result.issuesSynced,
              pullRequestsSynced: result.pullRequestsSynced,
              commentsSynced: result.commentsSynced,
            },
          },
        });
        console.error(`[SyncWorker] Job ${jobId} failed:`, result.errors);
      }
    } catch (error: any) {
      console.error(`[SyncWorker] Job ${jobId} failed:`, error);

      // Mark job as failed
      await prisma.syncJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorMessage: error.message || 'Unknown error',
        },
      });
    }
  }
}

// Singleton instance
export const syncWorker = new SyncWorker();
