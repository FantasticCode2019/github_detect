import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticateToken } from '../middleware/auth.js';
import { closePullRequest } from '../utils/github.js';

const router = Router();

router.use(authenticateToken);

// Get single pull request
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const pr = await prisma.pullRequest.findUnique({
      where: { id },
      include: {
        repository: {
          select: {
            id: true,
            fullName: true,
          },
        },
        detections: true,
        files: true,
        comments: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!pr) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Pull request not found',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        pull_request: {
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
          ai_indicators: pr.detections[0]?.indicators,
          merged: pr.merged,
          mergeable: pr.mergeable,
          merged_by: pr.mergedBy,
          merged_at: pr.mergedAt,
          closed_at: pr.closedAt,
          html_url: pr.htmlUrl,
          files: pr.files.map(f => ({
            filename: f.filename,
            status: f.status,
            additions: f.additions,
            deletions: f.deletions,
            changes: f.changes,
            patch: f.patch,
            ai_score: f.aiScore,
          })),
          comments: pr.comments.map(c => ({
            id: c.id,
            body: c.body,
            author_login: c.authorLogin,
            ai_detected: c.aiDetected,
            created_at: c.createdAt,
          })),
          detection_result: pr.detections[0] ? {
            id: pr.detections[0].id,
            is_ai_generated: pr.detections[0].isAiGenerated,
            confidence_score: pr.detections[0].confidenceScore,
            indicators: pr.detections[0].indicators,
            code_ai_score: pr.detections[0].indicators?.codePatternScore,
            description_ai_score: pr.detections[0].indicators?.writingPatternScore,
          } : null,
          created_at: pr.createdAt,
          updated_at: pr.updatedAt,
        },
      },
    });
  } catch (error: any) {
    console.error('Get pull request error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to get pull request',
      },
    });
  }
});

// Get PR files
router.get('/:id/files', async (req, res) => {
  try {
    const { id } = req.params;

    const pr = await prisma.pullRequest.findUnique({
      where: { id },
      include: {
        files: true,
      },
    });

    if (!pr) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Pull request not found',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        files: pr.files.map(f => ({
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          changes: f.changes,
          patch: f.patch,
          ai_score: f.aiScore,
        })),
      },
    });
  } catch (error: any) {
    console.error('Get PR files error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to get pull request files',
      },
    });
  }
});

// Submit PR review
router.post('/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { event, body, comments } = req.body;

    const pr = await prisma.pullRequest.findUnique({
      where: { id },
    });

    if (!pr) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Pull request not found',
        },
      });
      return;
    }

    // In a real app, this would call GitHub API to submit review
    // For now, just return success
    res.json({
      success: true,
      data: {
        message: 'Review submitted successfully',
        event,
        body,
        comments_count: comments?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('Submit review error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to submit review',
      },
    });
  }
});

// Close pull request
router.post('/:id/close', async (req, res) => {
  try {
    const { id } = req.params;

    const pr = await prisma.pullRequest.findUnique({
      where: { id },
      include: {
        repository: { select: { fullName: true } },
      },
    });

    if (!pr) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Pull request not found' },
      });
      return;
    }

    if (pr.state === 'closed' || pr.merged) {
      res.status(400).json({
        success: false,
        error: { code: 'ALREADY_CLOSED', message: 'Pull request is already closed or merged' },
      });
      return;
    }

    // Get user's GitHub token
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

    const [owner, repo] = pr.repository.fullName.split('/');

    // Call GitHub API to close the PR
    await closePullRequest(user.githubToken, owner, repo, pr.number);

    // Update local DB
    await prisma.pullRequest.update({
      where: { id },
      data: {
        state: 'closed',
        closedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: { message: 'Pull request closed successfully' },
    });
  } catch (error: any) {
    console.error('Close PR error:', error);
    const status = error.message?.includes('Permission denied') ? 403 : 500;
    res.status(status).json({
      success: false,
      error: {
        code: status === 403 ? 'FORBIDDEN' : 'INTERNAL_ERROR',
        message: error.message || 'Failed to close pull request',
      },
    });
  }
});

export default router;
