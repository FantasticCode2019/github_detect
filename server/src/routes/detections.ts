import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Get all detections
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 20;
    const repositoryId = req.query.repository_id as string;
    const targetType = req.query.target_type as string;
    const minConfidence = req.query.min_confidence
      ? parseFloat(req.query.min_confidence as string)
      : undefined;
    const maxConfidence = req.query.max_confidence
      ? parseFloat(req.query.max_confidence as string)
      : undefined;
    const dateFrom = req.query.date_from as string;
    const dateTo = req.query.date_to as string;

    const where: any = {};

    if (repositoryId) {
      where.repositoryId = repositoryId;
    }

    if (targetType) {
      where.targetType = targetType;
    }

    if (minConfidence !== undefined) {
      where.confidenceScore = { ...where.confidenceScore, gte: minConfidence };
    }

    if (maxConfidence !== undefined) {
      where.confidenceScore = { ...where.confidenceScore, lte: maxConfidence };
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [detections, total] = await Promise.all([
      prisma.detection.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          repository: {
            select: {
              id: true,
              fullName: true,
            },
          },
          issue: true,
          pullRequest: true,
        },
      }),
      prisma.detection.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        detections: detections.map(d => ({
          id: d.id,
          target_type: d.targetType,
          target: d.issue || d.pullRequest,
          repository: d.repository ? { id: d.repository.id, full_name: d.repository.fullName } : null,
          is_ai_generated: d.isAiGenerated,
          confidence_score: d.confidenceScore,
          indicators: d.indicators,
          model_version: d.modelVersion,
          created_at: d.createdAt,
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
    console.error('Get detections error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to get detections',
      },
    });
  }
});

// Get detection stats — must be before /:id
router.get('/stats/overview', async (req, res) => {
  try {
    const repositoryId = req.query.repository_id as string;
    const period = (req.query.period as string) || '30d';
    const daysAgo = parseInt(period) || 30;
    const since = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    const where: any = {
      createdAt: { gte: since },
    };

    if (repositoryId) {
      where.repositoryId = repositoryId;
    }

    const [
      totalAnalyzed,
      aiDetectedCount,
      byType,
      byDay,
    ] = await Promise.all([
      prisma.detection.count({ where }),
      prisma.detection.count({ where: { ...where, isAiGenerated: true } }),
      prisma.detection.groupBy({
        by: ['targetType'],
        where: { ...where, isAiGenerated: true },
        _count: { id: true },
      }),
      prisma.detection.groupBy({
        by: ['createdAt'],
        where: { ...where, isAiGenerated: true },
        _count: { id: true },
      }),
    ]);

    const averageConfidence = await prisma.detection.aggregate({
      where: { ...where, isAiGenerated: true },
      _avg: { confidenceScore: true },
    });

    res.json({
      success: true,
      data: {
        stats: {
          total_analyzed: totalAnalyzed,
          ai_detected_count: aiDetectedCount,
          detection_rate: totalAnalyzed > 0 ? (aiDetectedCount / totalAnalyzed) * 100 : 0,
          average_confidence: averageConfidence._avg.confidenceScore || 0,
          by_type: byType.reduce((acc, curr) => ({
            ...acc,
            [curr.targetType]: curr._count.id,
          }), {}),
          by_period: byDay.map(d => ({
            date: d.createdAt.toISOString().split('T')[0],
            count: d._count.id,
          })),
        },
      },
    });
  } catch (error: any) {
    console.error('Get detection stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to get detection stats',
      },
    });
  }
});

// Analyze content — must be before /:id
router.post('/analyze', async (req, res) => {
  try {
    const { content, content_type } = req.body;

    if (!content) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Content is required',
        },
      });
      return;
    }

    const mockAnalysis = {
      is_ai_generated: Math.random() > 0.5,
      confidence_score: Math.random() * 100,
      indicators: {
        writingPatternScore: Math.random() * 100,
        templateSimilarity: Math.random() * 100,
        responseTimeAnomaly: Math.random() * 100,
        codePatternScore: content_type === 'code' ? Math.random() * 100 : undefined,
      },
      model_version: 'v2.1.0',
    };

    res.json({
      success: true,
      data: { result: mockAnalysis },
    });
  } catch (error: any) {
    console.error('Analyze content error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to analyze content',
      },
    });
  }
});

// Bulk close PRs from detections — must be before /:id
router.post('/bulk-close', async (req, res) => {
  try {
    const { detection_ids } = req.body;

    if (!Array.isArray(detection_ids) || detection_ids.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'detection_ids array is required' },
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { githubToken: true },
    });

    if (!user?.githubToken) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_GITHUB_TOKEN', message: 'GitHub account not connected' },
      });
      return;
    }

    const detections = await prisma.detection.findMany({
      where: { id: { in: detection_ids }, targetType: 'pr' },
      include: {
        pullRequest: {
          include: { repository: { select: { fullName: true } } },
        },
      },
    });

    const results: { id: string; status: 'closed' | 'skipped' | 'error'; message?: string }[] = [];

    for (const detection of detections) {
      const pr = detection.pullRequest;
      if (!pr || pr.state === 'closed' || pr.merged) {
        results.push({ id: detection.id, status: 'skipped', message: 'Already closed or merged' });
        continue;
      }

      try {
        const { closePullRequest } = await import('../utils/github.js');
        const [owner, repo] = pr.repository.fullName.split('/');
        await closePullRequest(user.githubToken, owner, repo, pr.number);
        await prisma.pullRequest.update({
          where: { id: pr.id },
          data: { state: 'closed', closedAt: new Date() },
        });
        results.push({ id: detection.id, status: 'closed' });
      } catch (err: any) {
        results.push({ id: detection.id, status: 'error', message: err.message });
      }
    }

    res.json({
      success: true,
      data: { results, closed: results.filter(r => r.status === 'closed').length },
    });
  } catch (error: any) {
    console.error('Bulk close error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to bulk close' },
    });
  }
});

// Get single detection
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const detection = await prisma.detection.findUnique({
      where: { id },
      include: {
        repository: {
          select: {
            id: true,
            fullName: true,
          },
        },
        issue: {
          include: {
            comments: true,
          },
        },
        pullRequest: {
          include: {
            files: true,
            comments: true,
          },
        },
      },
    });

    if (!detection) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Detection not found',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        detection: {
          id: detection.id,
          target_type: detection.targetType,
          target: detection.issue || detection.pullRequest,
          repository: detection.repository ? { id: detection.repository.id, full_name: detection.repository.fullName } : null,
          is_ai_generated: detection.isAiGenerated,
          confidence_score: detection.confidenceScore,
          indicators: detection.indicators,
          model_version: detection.modelVersion,
          feedback_is_ai: detection.feedbackIsAi,
          feedback_comment: detection.feedbackComment,
          created_at: detection.createdAt,
        },
      },
    });
  } catch (error: any) {
    console.error('Get detection error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to get detection',
      },
    });
  }
});

// Submit detection feedback
router.post('/:id/feedback', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_ai_generated, comment } = req.body;

    const detection = await prisma.detection.findUnique({
      where: { id },
    });

    if (!detection) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Detection not found',
        },
      });
      return;
    }

    await prisma.detection.update({
      where: { id },
      data: {
        feedbackIsAi: is_ai_generated,
        feedbackComment: comment,
      },
    });

    res.json({
      success: true,
      data: { message: 'Feedback submitted' },
    });
  } catch (error: any) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to submit feedback',
      },
    });
  }
});

export default router;
