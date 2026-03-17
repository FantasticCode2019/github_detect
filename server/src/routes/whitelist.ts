import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// List whitelist entries for a repository
router.get('/', async (req, res) => {
  try {
    const repositoryId = req.query.repository_id as string;

    if (!repositoryId) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'repository_id is required' },
      });
      return;
    }

    const entries = await prisma.whitelist.findMany({
      where: { repositoryId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    res.json({
      success: true,
      data: {
        whitelist: entries.map(e => ({
          id: e.id,
          github_username: e.githubUsername,
          note: e.note,
          added_by: e.user,
          created_at: e.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error('List whitelist error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to list whitelist' },
    });
  }
});

// Add a username to the whitelist
router.post('/', async (req, res) => {
  try {
    const { repository_id, github_username, note } = req.body;

    if (!repository_id || !github_username) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'repository_id and github_username are required' },
      });
      return;
    }

    const entry = await prisma.whitelist.create({
      data: {
        repositoryId: repository_id,
        githubUsername: github_username.toLowerCase(),
        note: note || null,
        userId: req.user!.id,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        entry: {
          id: entry.id,
          github_username: entry.githubUsername,
          note: entry.note,
          created_at: entry.createdAt,
        },
      },
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Username already in whitelist for this repository' },
      });
      return;
    }
    console.error('Add whitelist error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to add to whitelist' },
    });
  }
});

// Get a single whitelist entry
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await prisma.whitelist.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    if (!entry) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Whitelist entry not found' },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        entry: {
          id: entry.id,
          github_username: entry.githubUsername,
          note: entry.note,
          added_by: entry.user,
          created_at: entry.createdAt,
        },
      },
    });
  } catch (error: any) {
    console.error('Get whitelist entry error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to get whitelist entry' },
    });
  }
});

// Update note for a whitelist entry
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const entry = await prisma.whitelist.update({
      where: { id },
      data: { note },
    });

    res.json({
      success: true,
      data: {
        entry: {
          id: entry.id,
          github_username: entry.githubUsername,
          note: entry.note,
          created_at: entry.createdAt,
        },
      },
    });
  } catch (error: any) {
    console.error('Update whitelist error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to update whitelist entry' },
    });
  }
});

// Remove a username from the whitelist
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.whitelist.delete({ where: { id } });

    res.json({
      success: true,
      data: { message: 'Whitelist entry removed' },
    });
  } catch (error: any) {
    console.error('Delete whitelist error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to remove whitelist entry' },
    });
  }
});

// Scan existing PRs against whitelist and create detections for non-whitelisted authors
router.post('/scan/:repositoryId', async (req, res) => {
  try {
    const { repositoryId } = req.params;

    const whitelistEntries = await prisma.whitelist.findMany({
      where: { repositoryId },
      select: { githubUsername: true },
    });
    const whitelistedUsernames = new Set(whitelistEntries.map(e => e.githubUsername.toLowerCase()));

    const openPRs = await prisma.pullRequest.findMany({
      where: { repositoryId, state: 'open', merged: false },
    });

    let created = 0;
    for (const pr of openPRs) {
      const author = pr.authorLogin.toLowerCase();
      if (whitelistedUsernames.has(author)) continue;

      const existing = await prisma.detection.findFirst({
        where: { pullRequestId: pr.id, targetType: 'pr' },
      });
      if (existing) continue;

      await prisma.detection.create({
        data: {
          targetType: 'pr',
          targetId: pr.id,
          isAiGenerated: false,
          confidenceScore: 0,
          indicators: { reason: 'author_not_in_whitelist', authorLogin: author },
          modelVersion: 'whitelist-v1',
          repositoryId,
          pullRequestId: pr.id,
        },
      });
      await prisma.pullRequest.update({
        where: { id: pr.id },
        data: { aiDetected: true },
      });
      created++;
    }

    res.json({
      success: true,
      data: { scanned: openPRs.length, created },
    });
  } catch (error: any) {
    console.error('Scan whitelist error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to scan' },
    });
  }
});

// Resolve: add author to whitelist and remove the detection
router.post('/resolve/:detectionId', async (req, res) => {
  try {
    const { detectionId } = req.params;
    const { note } = req.body;

    const detection = await prisma.detection.findUnique({
      where: { id: detectionId },
      include: { pullRequest: true },
    });

    if (!detection || detection.targetType !== 'pr' || !detection.pullRequest) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Detection not found or not a PR detection' },
      });
      return;
    }

    const authorLogin = detection.pullRequest.authorLogin.toLowerCase();

    await prisma.whitelist.upsert({
      where: {
        repositoryId_githubUsername: {
          repositoryId: detection.repositoryId,
          githubUsername: authorLogin,
        },
      },
      update: { note: note || null },
      create: {
        repositoryId: detection.repositoryId,
        githubUsername: authorLogin,
        note: note || null,
        userId: req.user!.id,
      },
    });

    await prisma.detection.delete({ where: { id: detectionId } });
    await prisma.pullRequest.update({
      where: { id: detection.pullRequest.id },
      data: { aiDetected: false },
    });

    res.json({
      success: true,
      data: { message: `@${authorLogin} added to whitelist and detection removed` },
    });
  } catch (error: any) {
    console.error('Resolve detection error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to resolve' },
    });
  }
});

export default router;
