import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticateToken } from '../middleware/auth.js';
import { fetchGitHubRepositories, fetchGitHubIssues, fetchGitHubPullRequests, fetchGitHubRepoInfo } from '../utils/github.js';
import type { GitHubRepoInfo } from '../types/index.js';
import { syncWorker } from '../services/syncWorker.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all repositories
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 20;
    const search = req.query.q as string;
    const aiDetectedOnly = req.query.ai_detected_only === 'true';

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (aiDetectedOnly) {
      where.aiDetectedCount = { gt: 0 };
    }

    const [repositories, total] = await Promise.all([
      prisma.repository.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { updatedAt: 'desc' },
        include: {
          organization: true,
          _count: {
            select: {
              issues: true,
              pullRequests: true,
              detections: true,
            },
          },
        },
      }),
      prisma.repository.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        repositories: repositories.map(repo => ({
          id: repo.id,
          github_id: repo.githubId,
          name: repo.name,
          full_name: repo.fullName,
          description: repo.description,
          private: repo.private,
          language: repo.language,
          stars_count: repo.starsCount,
          forks_count: repo.forksCount,
          open_issues_count: repo._count.issues,
          open_prs_count: repo._count.pullRequests,
          ai_detected_count: repo.aiDetectedCount,
          settings: repo.settings as any,
          last_synced_at: repo.lastSyncedAt,
          created_at: repo.createdAt,
          updated_at: repo.updatedAt,
        })),
      },
      meta: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    });
  } catch (error: any) {
    console.error('Get repositories error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to get repositories',
      },
    });
  }
});

// Get single repository
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [repository, recentSyncJobs] = await Promise.all([
      prisma.repository.findUnique({
        where: { id },
        include: {
          organization: true,
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatarUrl: true,
                },
              },
            },
          },
          _count: {
            select: {
              issues: true,
              pullRequests: true,
              detections: true,
              whitelists: true,
            },
          },
        },
      }),
      prisma.syncJob.findMany({
        where: { repositoryId: id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    if (!repository) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Repository not found',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        repository: {
          id: repository.id,
          github_id: repository.githubId,
          name: repository.name,
          full_name: repository.fullName,
          description: repository.description,
          private: repository.private,
          language: repository.language,
          stars_count: repository.starsCount,
          forks_count: repository.forksCount,
          open_issues_count: repository._count.issues,
          open_prs_count: repository._count.pullRequests,
          ai_detected_count: repository.aiDetectedCount,
          settings: repository.settings as any,
          webhook_url: repository.webhookUrl,
          members: repository.members.map(m => ({
            id: m.user.id,
            username: m.user.username,
            avatar_url: m.user.avatarUrl,
            role: m.role,
          })),
          stats: {
            total_issues: repository._count.issues,
            total_prs: repository._count.pullRequests,
            ai_detections: repository._count.detections,
            active_rules: repository._count.whitelists,
          },
          last_synced_at: repository.lastSyncedAt,
          created_at: repository.createdAt,
          updated_at: repository.updatedAt,
        },
      },
    });
  } catch (error: any) {
    console.error('Get repository error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to get repository',
      },
    });
  }
});

// Add repository
router.post('/', async (req, res) => {
  try {
    const { github_full_name, settings } = req.body;

    if (!github_full_name) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'GitHub full name is required',
        },
      });
      return;
    }

    // Check if already exists
    const existing = await prisma.repository.findUnique({
      where: { fullName: github_full_name },
    });

    if (existing) {
      res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Repository already exists',
        },
      });
      return;
    }

    // Fetch repository info from GitHub API
    const [owner, repo] = github_full_name.split('/');
    if (!owner || !repo) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid repository format. Use: owner/repo-name',
        },
      });
      return;
    }

    // Get user's GitHub token
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { githubToken: true }
    });

    if (!user?.githubToken) {
      res.status(400).json({
        success: false,
        error: {
          code: 'NO_GITHUB_TOKEN',
          message: 'GitHub account not connected',
        },
      });
      return;
    }

    // Fetch from GitHub API
    try {
      const githubRepo: GitHubRepoInfo = await fetchGitHubRepoInfo(user.githubToken, owner, repo);

      // Check if repository already exists by githubId
      const existingById = await prisma.repository.findUnique({
        where: { githubId: String(githubRepo.id) },
      });

      if (existingById) {
        res.status(409).json({
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Repository already exists in your account',
          },
        });
        return;
      }

      // Create repository with member in transaction
      const repository = await prisma.$transaction(async (tx) => {
        // Create repository
        const repo = await tx.repository.create({
          data: {
            githubId: String(githubRepo.id),
            name: githubRepo.name,
            fullName: githubRepo.full_name,
            description: githubRepo.description,
            private: githubRepo.private,
            language: githubRepo.language,
            starsCount: githubRepo.stargazers_count || 0,
            forksCount: githubRepo.forks_count || 0,
            openIssuesCount: githubRepo.open_issues_count || 0,
            settings: settings || {},
          },
        });

        // Add current user as repository member (OWNER)
        await tx.repositoryMember.create({
          data: {
            repositoryId: repo.id,
            userId: req.user!.id,
            role: 'OWNER',
          },
        });

        // Create initial sync job
        await tx.syncJob.create({
          data: {
            repositoryId: repo.id,
            userId: req.user!.id,
            syncType: 'full',
            status: 'pending',
          },
        });

        return repo;
      });

      res.status(201).json({
        success: true,
        data: { repository },
      });
    } catch (githubError: any) {
      console.error('GitHub API error:', githubError);
      res.status(400).json({
        success: false,
        error: {
          code: 'GITHUB_API_ERROR',
          message: githubError.message || 'Failed to fetch repository from GitHub',
        },
      });
      return;
    }
  } catch (error: any) {
    console.error('Add repository error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to add repository',
      },
    });
  }
});

// Update repository settings
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { settings } = req.body;

    const repository = await prisma.repository.update({
      where: { id },
      data: {
        settings: settings,
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: { repository },
    });
  } catch (error: any) {
    console.error('Update repository error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to update repository',
      },
    });
  }
});

// Delete repository
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.repository.delete({
      where: { id },
    });

    res.json({
      success: true,
      data: { message: 'Repository deleted' },
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Repository not found',
        },
      });
      return;
    }
    console.error('Delete repository error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to delete repository',
      },
    });
  }
});

// Sync repository
router.post('/:id/sync', async (req, res) => {
  try {
    console.log(`[Sync] Received sync request:`, {
      repoId: req.params.id,
      body: req.body,
      user: req.user?.id,
      auth: req.headers.authorization ? 'Present' : 'Missing'
    });
    const { id } = req.params;
    const { sync_type = 'incremental' } = req.body;

    // Update last synced time
    await prisma.repository.update({
      where: { id },
      data: { lastSyncedAt: new Date() },
    });

    // Create sync job
    const syncJob = await prisma.syncJob.create({
      data: {
        repositoryId: id,
        userId: req.user!.id,
        syncType: sync_type,
        status: 'pending',
      },
    });

    console.log(`[Sync] Created sync job:`, { syncId: syncJob.id, repoId: id });

    // Get user's GitHub token
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { githubToken: true }
    });

    // Trigger immediate execution with user's token
    syncWorker.executeJobNow(syncJob.id, user?.githubToken || undefined).catch((err: any) => {
      console.error(`[Sync] Immediate execution failed:`, err);
    });

    res.json({
      success: true,
      data: {
        sync_id: syncJob.id,
        status: 'running',
        message: 'Sync started immediately',
      },
    });
  } catch (error: any) {
    console.error('[Sync] Repository sync error:', {
      error: error.message,
      code: error.code,
      repoId: req.params.id,
      user: req.user?.id
    });
    res.status(500).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'Failed to sync repository',
      },
    });
  }
});

// Get repository stats
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const period = (req.query.period as string) || '30d';

    const repository = await prisma.repository.findUnique({
      where: { id },
      include: {
        detections: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - parsePeriod(period)),
            },
          },
        },
        _count: {
          select: {
            issues: true,
            pullRequests: true,
            detections: true,
          },
        },
      },
    });

    if (!repository) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Repository not found',
        },
      });
      return;
    }

    const stats = {
      total_issues: repository._count.issues,
      total_prs: repository._count.pullRequests,
      ai_detections: repository._count.detections,
      detection_rate: repository._count.issues > 0
        ? (repository._count.detections / repository._count.issues) * 100
        : 0,
      period,
    };

    res.json({
      success: true,
      data: { stats },
    });
  } catch (error: any) {
    console.error('Get repository stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to get repository stats',
      },
    });
  }
});

// Get repository issues
router.get('/:id/issues', async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 20;
    const state = (req.query.state as string) || 'open';
    const aiDetected = req.query.ai_detected === 'true';
    const minConfidence = req.query.min_confidence
      ? parseFloat(req.query.min_confidence as string)
      : undefined;

    const where: any = { repositoryId: id };

    if (state !== 'all') {
      where.state = state;
    }

    if (aiDetected) {
      where.aiDetected = true;
    }

    if (minConfidence !== undefined) {
      where.aiConfidence = { gte: minConfidence };
    }

    const [issues, total] = await Promise.all([
      prisma.issue.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.issue.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        issues: issues.map(issue => ({
          id: issue.id,
          github_id: issue.githubId,
          number: issue.number,
          title: issue.title,
          body: issue.body,
          state: issue.state,
          author_login: issue.authorLogin,
          author_type: issue.authorType,
          labels: issue.labels,
          assignees: issue.assignees,
          ai_detected: issue.aiDetected,
          ai_confidence: issue.aiConfidence,
          comments_count: issue.commentsCount,
          html_url: issue.htmlUrl,
          created_at: issue.createdAt,
          updated_at: issue.updatedAt,
          closed_at: issue.closedAt,
        })),
      },
      meta: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    });
  } catch (error: any) {
    console.error('Get repository issues error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to get issues',
      },
    });
  }
});

// Get repository pull requests
router.get('/:id/pulls', async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 20;
    const state = (req.query.state as string) || 'open';
    const aiDetected = req.query.ai_detected === 'true';
    const minConfidence = req.query.min_confidence
      ? parseFloat(req.query.min_confidence as string)
      : undefined;

    const where: any = { repositoryId: id };

    if (state !== 'all') {
      where.state = state;
    }

    if (aiDetected) {
      where.aiDetected = true;
    }

    if (minConfidence !== undefined) {
      where.aiConfidence = { gte: minConfidence };
    }

    const [pullRequests, total] = await Promise.all([
      prisma.pullRequest.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.pullRequest.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        pull_requests: pullRequests.map(pr => ({
          id: pr.id,
          github_id: pr.githubId,
          number: pr.number,
          title: pr.title,
          body: pr.body,
          state: pr.state,
          author_login: pr.authorLogin,
          author_type: pr.authorType,
          head_ref: pr.headRef,
          base_ref: pr.baseRef,
          is_draft: pr.isDraft,
          additions: pr.additions,
          deletions: pr.deletions,
          changed_files: pr.changedFiles,
          commits: pr.commits,
          ai_detected: pr.aiDetected,
          ai_confidence: pr.aiConfidence,
          merged: pr.merged,
          mergeable: pr.mergeable,
          merged_by: pr.mergedBy,
          merged_at: pr.mergedAt,
          closed_at: pr.closedAt,
          html_url: pr.htmlUrl,
          created_at: pr.createdAt,
          updated_at: pr.updatedAt,
        })),
      },
      meta: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    });
  } catch (error: any) {
    console.error('Get repository PRs error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to get pull requests',
      },
    });
  }
});

function parsePeriod(period: string): number {
  const match = period.match(/(\d+)([d])/);
  if (!match) return 30 * 24 * 60 * 60 * 1000; // default 30 days
  const days = parseInt(match[1], 10);
  return days * 24 * 60 * 60 * 1000;
}

export default router;
