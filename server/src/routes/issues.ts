import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Get single issue
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const issue = await prisma.issue.findUnique({
      where: { id },
      include: {
        repository: {
          select: {
            id: true,
            fullName: true,
          },
        },
        detections: true,
        comments: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!issue) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Issue not found',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        issue: {
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
          ai_indicators: issue.detections[0]?.indicators,
          comments_count: issue.commentsCount,
          html_url: issue.htmlUrl,
          comments: issue.comments.map(c => ({
            id: c.id,
            body: c.body,
            author_login: c.authorLogin,
            ai_detected: c.aiDetected,
            created_at: c.createdAt,
          })),
          detection_result: issue.detections[0] ? {
            id: issue.detections[0].id,
            is_ai_generated: issue.detections[0].isAiGenerated,
            confidence_score: issue.detections[0].confidenceScore,
            indicators: issue.detections[0].indicators,
          } : null,
          created_at: issue.createdAt,
          updated_at: issue.updatedAt,
          closed_at: issue.closedAt,
        },
      },
    });
  } catch (error: any) {
    console.error('Get issue error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to get issue',
      },
    });
  }
});

// Add label to issue
router.post('/:id/label', async (req, res) => {
  try {
    const { id } = req.params;
    const { label } = req.body;

    const issue = await prisma.issue.findUnique({
      where: { id },
    });

    if (!issue) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Issue not found',
        },
      });
      return;
    }

    const updatedLabels = [...new Set([...issue.labels, label])];

    await prisma.issue.update({
      where: { id },
      data: { labels: updatedLabels },
    });

    res.json({
      success: true,
      data: { message: 'Label added' },
    });
  } catch (error: any) {
    console.error('Add label error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to add label',
      },
    });
  }
});

// Remove label from issue
router.delete('/:id/label/:label', async (req, res) => {
  try {
    const { id, label } = req.params;

    const issue = await prisma.issue.findUnique({
      where: { id },
    });

    if (!issue) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Issue not found',
        },
      });
      return;
    }

    const updatedLabels = issue.labels.filter(l => l !== label);

    await prisma.issue.update({
      where: { id },
      data: { labels: updatedLabels },
    });

    res.json({
      success: true,
      data: { message: 'Label removed' },
    });
  } catch (error: any) {
    console.error('Remove label error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to remove label',
      },
    });
  }
});

// Bulk action on issues
router.post('/bulk-action', async (req, res) => {
  try {
    const { issue_ids, action, params } = req.body;

    if (!Array.isArray(issue_ids) || issue_ids.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Issue IDs array is required',
        },
      });
      return;
    }

    // Perform bulk action
    switch (action) {
      case 'label':
        if (params?.label) {
          for (const issueId of issue_ids) {
            const issue = await prisma.issue.findUnique({ where: { id: issueId } });
            if (issue) {
              const updatedLabels = [...new Set([...issue.labels, params.label])];
              await prisma.issue.update({
                where: { id: issueId },
                data: { labels: updatedLabels },
              });
            }
          }
        }
        break;
      case 'close':
        await prisma.issue.updateMany({
          where: { id: { in: issue_ids } },
          data: { state: 'closed', closedAt: new Date() },
        });
        break;
      default:
        res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Unknown action',
          },
        });
        return;
    }

    res.json({
      success: true,
      data: { message: 'Bulk action completed', affected_count: issue_ids.length },
    });
  } catch (error: any) {
    console.error('Bulk action error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to perform bulk action',
      },
    });
  }
});

export default router;
