import { prisma } from './index.js';

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // Create sample repositories
    const repos = await Promise.all([
      prisma.repository.create({
        data: {
          githubId: '123456',
          name: 'ai-detector',
          fullName: 'acme/ai-detector',
          description: 'AI-powered code detection tool',
          private: false,
          language: 'TypeScript',
          starsCount: 245,
          forksCount: 32,
          openIssuesCount: 12,
          openPrsCount: 5,
          aiDetectedCount: 15,
          settings: {
            aiDetectionEnabled: true,
            autoLabeling: true,
            notificationChannels: ['email', 'slack'],
            reviewRules: ['require-ai-review'],
          },
        },
      }),
      prisma.repository.create({
        data: {
          githubId: '123457',
          name: 'web-dashboard',
          fullName: 'acme/web-dashboard',
          description: 'React dashboard application',
          private: false,
          language: 'TypeScript',
          starsCount: 89,
          forksCount: 12,
          openIssuesCount: 8,
          openPrsCount: 3,
          aiDetectedCount: 8,
          settings: {
            aiDetectionEnabled: true,
            autoLabeling: false,
            notificationChannels: ['email'],
            reviewRules: [],
          },
        },
      }),
      prisma.repository.create({
        data: {
          githubId: '123458',
          name: 'backend-api',
          fullName: 'acme/backend-api',
          description: 'REST API service',
          private: true,
          language: 'Python',
          starsCount: 45,
          forksCount: 5,
          openIssuesCount: 15,
          openPrsCount: 7,
          aiDetectedCount: 22,
          settings: {
            aiDetectionEnabled: true,
            autoLabeling: true,
            notificationChannels: ['email', 'slack', 'webhook'],
            reviewRules: ['require-ai-review', 'require-human-approval'],
          },
        },
      }),
    ]);

    console.log(`✅ Created ${repos.length} repositories`);

    // Create sample issues for each repository
    for (const repo of repos) {
      const issues = await Promise.all([
        prisma.issue.create({
          data: {
            githubId: `${repo.githubId}${1000 + 1}`,
            number: 1,
            title: 'AI-detected pattern in authentication module',
            body: 'This issue appears to contain AI-generated code patterns that need review.',
            state: 'open',
            authorLogin: 'developer1',
            authorType: 'User',
            labels: ['ai-detected', 'needs-review'],
            assignees: ['reviewer1'],
            aiDetected: true,
            aiConfidence: 0.87,
            commentsCount: 3,
            htmlUrl: `https://github.com/${repo.fullName}/issues/1`,
            repositoryId: repo.id,
          },
        }),
        prisma.issue.create({
          data: {
            githubId: `${repo.githubId}${1000 + 2}`,
            number: 2,
            title: 'Bug: Memory leak in data processing',
            body: 'Reported memory leak issue in the data processing pipeline.',
            state: 'open',
            authorLogin: 'developer2',
            authorType: 'User',
            labels: ['bug'],
            assignees: [],
            aiDetected: false,
            commentsCount: 1,
            htmlUrl: `https://github.com/${repo.fullName}/issues/2`,
            repositoryId: repo.id,
          },
        }),
      ]);

      // Create detections for AI-detected issues
      await prisma.detection.create({
        data: {
          targetType: 'issue',
          targetId: issues[0].id,
          isAiGenerated: true,
          confidenceScore: 0.87,
          indicators: {
            writingPatternScore: 0.85,
            templateSimilarity: 0.92,
            responseTimeAnomaly: 0.15,
          },
          modelVersion: 'v2.1.0',
          repositoryId: repo.id,
          issueId: issues[0].id,
        },
      });

      console.log(`✅ Created ${issues.length} issues for ${repo.fullName}`);
    }

    // Create sample pull requests
    for (const repo of repos) {
      const prs = await Promise.all([
        prisma.pullRequest.create({
          data: {
            githubId: `${repo.githubId}${10000 + 1}`,
            number: 1,
            title: 'Add AI detection for Python code',
            body: 'This PR adds AI detection capabilities for Python code patterns.',
            state: 'open',
            authorLogin: 'developer1',
            authorType: 'User',
            headRef: 'feature/ai-detection',
            baseRef: 'main',
            isDraft: false,
            additions: 1250,
            deletions: 320,
            changedFiles: 15,
            commits: 8,
            aiDetected: true,
            aiConfidence: 0.91,
            merged: false,
            htmlUrl: `https://github.com/${repo.fullName}/pull/1`,
            repositoryId: repo.id,
            files: {
              create: [
                {
                  filename: 'src/detector/python.ts',
                  status: 'modified',
                  additions: 450,
                  deletions: 120,
                  changes: 570,
                  aiScore: 0.88,
                },
                {
                  filename: 'tests/detector.test.ts',
                  status: 'added',
                  additions: 200,
                  deletions: 0,
                  changes: 200,
                  aiScore: 0.75,
                },
              ],
            },
          },
        }),
        prisma.pullRequest.create({
          data: {
            githubId: `${repo.githubId}${10000 + 2}`,
            number: 2,
            title: 'Update dependencies',
            body: 'Regular dependency updates.',
            state: 'closed',
            authorLogin: 'developer3',
            authorType: 'User',
            headRef: 'chore/deps',
            baseRef: 'main',
            isDraft: false,
            additions: 45,
            deletions: 30,
            changedFiles: 2,
            commits: 1,
            aiDetected: false,
            merged: true,
            mergedAt: new Date(),
            mergedBy: 'maintainer1',
            htmlUrl: `https://github.com/${repo.fullName}/pull/2`,
            repositoryId: repo.id,
          },
        }),
      ]);

      // Create detections for AI-detected PRs
      await prisma.detection.create({
        data: {
          targetType: 'pr',
          targetId: prs[0].id,
          isAiGenerated: true,
          confidenceScore: 0.91,
          indicators: {
            writingPatternScore: 0.88,
            templateSimilarity: 0.95,
            codePatternScore: 0.92,
            commitMessagePattern: 0.78,
          },
          modelVersion: 'v2.1.0',
          repositoryId: repo.id,
          pullRequestId: prs[0].id,
        },
      });

      console.log(`✅ Created ${prs.length} PRs for ${repo.fullName}`);
    }

    // Create sample whitelist entries
    const seedUser = await prisma.user.upsert({
      where: { username: 'seed-admin' },
      update: {},
      create: {
        email: 'seed-admin@example.com',
        username: 'seed-admin',
        displayName: 'Seed Admin',
        role: 'ADMIN',
      },
    });

    for (const repo of repos) {
      const entries = await Promise.all([
        prisma.whitelist.upsert({
          where: { repositoryId_githubUsername: { repositoryId: repo.id, githubUsername: 'octocat' } },
          update: {},
          create: {
            githubUsername: 'octocat',
            note: 'Core maintainer',
            repositoryId: repo.id,
            userId: seedUser.id,
          },
        }),
        prisma.whitelist.upsert({
          where: { repositoryId_githubUsername: { repositoryId: repo.id, githubUsername: 'dependabot' } },
          update: {},
          create: {
            githubUsername: 'dependabot',
            note: 'Trusted bot',
            repositoryId: repo.id,
            userId: seedUser.id,
          },
        }),
      ]);

      console.log(`✅ Created ${entries.length} whitelist entries for ${repo.fullName}`);
    }

    console.log('✅ Database seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
