import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../index.js';

const router = Router();

const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';

// Verify GitHub webhook signature
function verifySignature(payload: string, signature: string): boolean {
  if (!GITHUB_WEBHOOK_SECRET) {
    console.warn('GITHUB_WEBHOOK_SECRET not set, skipping verification');
    return true;
  }

  const hmac = crypto.createHmac('sha256', GITHUB_WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(digest),
    Buffer.from(signature)
  );
}

// GitHub webhook endpoint
router.post('/github', async (req, res) => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    const event = req.headers['x-github-event'] as string;
    const payload = JSON.stringify(req.body);

    // Verify signature
    if (signature && !verifySignature(payload, signature)) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid webhook signature',
        },
      });
      return;
    }

    console.log(`📬 Received GitHub webhook: ${event}`);

    // Handle different event types
    switch (event) {
      case 'issues':
        await handleIssueEvent(req.body);
        break;
      case 'pull_request':
        await handlePullRequestEvent(req.body);
        break;
      case 'issue_comment':
        await handleIssueCommentEvent(req.body);
        break;
      case 'push':
        await handlePushEvent(req.body);
        break;
      case 'ping':
        console.log('🏓 Webhook ping received');
        break;
      default:
        console.log(`⚠️ Unhandled event type: ${event}`);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to process webhook',
      },
    });
  }
});

async function handleIssueEvent(payload: any) {
  const { action, issue, repository } = payload;

  if (!repository || !issue) return;

  // Find or create repository
  let repo = await prisma.repository.findUnique({
    where: { fullName: repository.full_name },
  });

  if (!repo) {
    repo = await prisma.repository.create({
      data: {
        githubId: String(repository.id),
        name: repository.name,
        fullName: repository.full_name,
        description: repository.description,
        private: repository.private,
        language: repository.language,
        starsCount: repository.stargazers_count || 0,
        forksCount: repository.forks_count || 0,
        settings: {},
      },
    });
  }

  // Handle different issue actions
  switch (action) {
    case 'opened':
    case 'edited':
    case 'reopened':
      await prisma.issue.upsert({
        where: {
          repositoryId_number: {
            repositoryId: repo.id,
            number: issue.number,
          },
        },
        create: {
          githubId: String(issue.id),
          number: issue.number,
          title: issue.title,
          body: issue.body,
          state: issue.state,
          authorLogin: issue.user.login,
          authorType: issue.user.type,
          labels: issue.labels.map((l: any) => l.name),
          assignees: issue.assignees.map((a: any) => a.login),
          commentsCount: issue.comments,
          htmlUrl: issue.html_url,
          repositoryId: repo.id,
        },
        update: {
          title: issue.title,
          body: issue.body,
          state: issue.state,
          labels: issue.labels.map((l: any) => l.name),
          assignees: issue.assignees.map((a: any) => a.login),
          commentsCount: issue.comments,
          updatedAt: new Date(issue.updated_at),
        },
      });
      console.log(`📝 Issue #${issue.number} ${action}`);
      break;

    case 'closed':
      await prisma.issue.updateMany({
        where: {
          repositoryId: repo.id,
          number: issue.number,
        },
        data: {
          state: 'closed',
          closedAt: new Date(),
        },
      });
      console.log(`📝 Issue #${issue.number} closed`);
      break;

    case 'deleted':
      await prisma.issue.deleteMany({
        where: {
          repositoryId: repo.id,
          number: issue.number,
        },
      });
      console.log(`📝 Issue #${issue.number} deleted`);
      break;
  }
}

async function handlePullRequestEvent(payload: any) {
  const { action, pull_request, repository } = payload;

  if (!repository || !pull_request) return;

  let repo = await prisma.repository.findUnique({
    where: { fullName: repository.full_name },
  });

  if (!repo) {
    repo = await prisma.repository.create({
      data: {
        githubId: String(repository.id),
        name: repository.name,
        fullName: repository.full_name,
        description: repository.description,
        private: repository.private,
        language: repository.language,
        starsCount: repository.stargazers_count || 0,
        forksCount: repository.forks_count || 0,
        settings: {},
      },
    });
  }

  switch (action) {
    case 'opened':
    case 'edited':
    case 'reopened':
      await prisma.pullRequest.upsert({
        where: {
          repositoryId_number: {
            repositoryId: repo.id,
            number: pull_request.number,
          },
        },
        create: {
          githubId: String(pull_request.id),
          number: pull_request.number,
          title: pull_request.title,
          body: pull_request.body,
          state: pull_request.state,
          authorLogin: pull_request.user.login,
          authorType: pull_request.user.type,
          headRef: pull_request.head?.ref,
          baseRef: pull_request.base?.ref,
          isDraft: pull_request.draft,
          additions: pull_request.additions || 0,
          deletions: pull_request.deletions || 0,
          changedFiles: pull_request.changed_files || 0,
          commits: pull_request.commits || 0,
          merged: pull_request.merged,
          mergeable: pull_request.mergeable,
          mergedBy: pull_request.merged_by?.login,
          mergedAt: pull_request.merged_at ? new Date(pull_request.merged_at) : null,
          htmlUrl: pull_request.html_url,
          repositoryId: repo.id,
        },
        update: {
          title: pull_request.title,
          body: pull_request.body,
          state: pull_request.state,
          isDraft: pull_request.draft,
          merged: pull_request.merged,
          mergeable: pull_request.mergeable,
          updatedAt: new Date(pull_request.updated_at),
        },
      });
      console.log(`🔀 PR #${pull_request.number} ${action}`);
      break;

    case 'closed':
      await prisma.pullRequest.updateMany({
        where: {
          repositoryId: repo.id,
          number: pull_request.number,
        },
        data: {
          state: 'closed',
          closedAt: new Date(),
        },
      });
      console.log(`🔀 PR #${pull_request.number} closed`);
      break;
  }
}

async function handleIssueCommentEvent(payload: any) {
  const { action, comment, issue, repository } = payload;

  if (!repository || !issue || !comment) return;

  const repo = await prisma.repository.findUnique({
    where: { fullName: repository.full_name },
  });

  if (!repo) return;

  // Find the associated issue or PR
  const dbIssue = await prisma.issue.findFirst({
    where: {
      repositoryId: repo.id,
      number: issue.number,
    },
  });

  const dbPR = await prisma.pullRequest.findFirst({
    where: {
      repositoryId: repo.id,
      number: issue.number,
    },
  });

  if (action === 'created' || action === 'edited') {
    await prisma.comment.upsert({
      where: {
        githubId: String(comment.id),
      },
      create: {
        githubId: String(comment.id),
        body: comment.body,
        authorLogin: comment.user.login,
        issueId: dbIssue?.id,
        pullRequestId: dbPR?.id,
      },
      update: {
        body: comment.body,
        updatedAt: new Date(comment.updated_at),
      },
    });
    console.log(`💬 Comment ${action} on #${issue.number}`);
  }
}

async function handlePushEvent(payload: any) {
  const { repository, ref, commits } = payload;

  if (!repository || !commits) return;

  console.log(`🚀 Push to ${repository.full_name} on ${ref} (${commits.length} commits)`);
}

export default router;
