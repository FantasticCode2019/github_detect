import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Get analytics overview
router.get('/overview', async (req, res) => {
  try {
    const repositoryId = req.query.repository_id as string;
    const period = (req.query.period as string) || '30d';
    const daysAgo = parseInt(period) || 30;
    const since = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    const repoWhere: any = {};
    if (repositoryId) {
      repoWhere.id = repositoryId;
    }

    const detectionWhere: any = {
      createdAt: { gte: since },
    };
    if (repositoryId) {
      detectionWhere.repositoryId = repositoryId;
    }

    const [
      totalRepositories,
      totalIssues,
      totalPRs,
      aiDetectedIssues,
      aiDetectedPRs,
      whitelistEntries,
      flaggedPRs,
    ] = await Promise.all([
      prisma.repository.count({ where: repoWhere }),
      prisma.issue.count({ where: repositoryId ? { repositoryId } : undefined }),
      prisma.pullRequest.count({ where: repositoryId ? { repositoryId } : undefined }),
      prisma.detection.count({
        where: { ...detectionWhere, targetType: 'issue', isAiGenerated: true },
      }),
      prisma.detection.count({
        where: { ...detectionWhere, targetType: 'pr' },
      }),
      prisma.whitelist.count({
        where: repositoryId ? { repositoryId } : undefined,
      }),
      prisma.detection.count({
        where: {
          ...detectionWhere,
          targetType: 'pr',
          modelVersion: 'whitelist-v1',
        },
      }),
    ]);

    const totalAnalyzed = aiDetectedIssues + aiDetectedPRs;

    res.json({
      success: true,
      data: {
        overview: {
          total_repositories: totalRepositories,
          total_issues: totalIssues,
          total_prs: totalPRs,
          ai_detection_rate: totalIssues + totalPRs > 0
            ? (totalAnalyzed / (totalIssues + totalPRs)) * 100
            : 0,
          whitelist_entries: whitelistEntries,
          flagged_prs: flaggedPRs,
          ai_detected_issues: aiDetectedIssues,
          ai_detected_prs: aiDetectedPRs,
        },
      },
    });
  } catch (error: any) {
    console.error('Get analytics overview error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to get analytics overview',
      },
    });
  }
});

// Get AI trends
router.get('/ai-trends', async (req, res) => {
  try {
    const repositoryId = req.query.repository_id as string;
    const period = (req.query.period as string) || '30d';
    const groupBy = (req.query.group_by as string) || 'day';
    const daysAgo = parseInt(period) || 30;
    const since = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    const where: any = {
      isAiGenerated: true,
      createdAt: { gte: since },
    };

    if (repositoryId) {
      where.repositoryId = repositoryId;
    }

    const detections = await prisma.detection.findMany({
      where,
      select: {
        createdAt: true,
        confidenceScore: true,
        targetType: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group data by date
    const trendsMap = new Map<string, any>();

    detections.forEach(d => {
      let dateKey: string;
      const date = new Date(d.createdAt);

      if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        dateKey = weekStart.toISOString().split('T')[0];
      } else if (groupBy === 'month') {
        dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        dateKey = date.toISOString().split('T')[0];
      }

      if (!trendsMap.has(dateKey)) {
        trendsMap.set(dateKey, {
          date: dateKey,
          total_detected: 0,
          high_confidence: 0,
          by_type: { issue: 0, pr: 0, comment: 0, code: 0 },
        });
      }

      const trend = trendsMap.get(dateKey);
      trend.total_detected++;
      if (d.confidenceScore >= 0.8) {
        trend.high_confidence++;
      }
      trend.by_type[d.targetType] = (trend.by_type[d.targetType] || 0) + 1;
    });

    const trends = Array.from(trendsMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    res.json({
      success: true,
      data: { trends },
    });
  } catch (error: any) {
    console.error('Get AI trends error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to get AI trends',
      },
    });
  }
});

// Get contributors
router.get('/contributors', async (req, res) => {
  try {
    const repositoryId = req.query.repository_id as string;
    const period = (req.query.period as string) || '30d';
    const daysAgo = parseInt(period) || 30;
    const since = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    // Get issues and PRs to calculate contributor stats
    const [issues, pullRequests] = await Promise.all([
      prisma.issue.findMany({
        where: {
          createdAt: { gte: since },
          ...(repositoryId ? { repositoryId } : {}),
        },
        select: {
          authorLogin: true,
          aiDetected: true,
        },
      }),
      prisma.pullRequest.findMany({
        where: {
          createdAt: { gte: since },
          ...(repositoryId ? { repositoryId } : {}),
        },
        select: {
          authorLogin: true,
          aiDetected: true,
        },
      }),
    ]);

    // Aggregate contributor stats
    const contributorsMap = new Map<string, any>();

    issues.forEach(issue => {
      const login = issue.authorLogin;
      if (!contributorsMap.has(login)) {
        contributorsMap.set(login, {
          login,
          issues: 0,
          prs: 0,
          contributions: 0,
          ai_generated: 0,
        });
      }
      const stats = contributorsMap.get(login);
      stats.issues++;
      stats.contributions++;
      if (issue.aiDetected) {
        stats.ai_generated++;
      }
    });

    pullRequests.forEach(pr => {
      const login = pr.authorLogin;
      if (!contributorsMap.has(login)) {
        contributorsMap.set(login, {
          login,
          issues: 0,
          prs: 0,
          contributions: 0,
          ai_generated: 0,
        });
      }
      const stats = contributorsMap.get(login);
      stats.prs++;
      stats.contributions++;
      if (pr.aiDetected) {
        stats.ai_generated++;
      }
    });

    const contributors = Array.from(contributorsMap.values())
      .map(c => ({
        ...c,
        ai_percentage: c.contributions > 0 ? (c.ai_generated / c.contributions) * 100 : 0,
      }))
      .sort((a, b) => b.contributions - a.contributions)
      .slice(0, 50);

    res.json({
      success: true,
      data: { contributors },
    });
  } catch (error: any) {
    console.error('Get contributors error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to get contributors',
      },
    });
  }
});

// Generate report
router.post('/reports', async (req, res) => {
  try {
    const { name, type, period, repository_ids, format } = req.body;

    // Create a report job (simplified)
    const reportJob = {
      id: `report_${Date.now()}`,
      status: 'pending',
      name,
      type,
      period,
      format: format || 'pdf',
      created_at: new Date().toISOString(),
    };

    // In a real app, this would queue a background job to generate the report

    res.json({
      success: true,
      data: {
        report_id: reportJob.id,
        status: reportJob.status,
      },
    });
  } catch (error: any) {
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to generate report',
      },
    });
  }
});

export default router;
