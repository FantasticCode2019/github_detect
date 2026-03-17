import { prisma } from '../index.js';
import { fetchGitHubIssues, fetchGitHubPullRequests } from '../utils/github.js';

export interface SyncOptions {
  repositoryId: string;
  owner: string;
  repo: string;
  githubToken: string;
  syncType: 'full' | 'incremental';
}

export interface SyncResult {
  issuesSynced: number;
  pullRequestsSynced: number;
  commentsSynced: number;
  errors: string[];
}

export class SyncService {
  async syncRepository(options: SyncOptions): Promise<SyncResult> {
    const { repositoryId, owner, repo, githubToken, syncType } = options;
    const result: SyncResult = {
      issuesSynced: 0,
      pullRequestsSynced: 0,
      commentsSynced: 0,
      errors: [],
    };

    console.log(`[SyncService] Starting ${syncType} sync for ${owner}/${repo}`);

    try {
      // Sync issues
      const issuesResult = await this.syncIssues(repositoryId, owner, repo, githubToken, syncType);
      result.issuesSynced = issuesResult.count;
      if (issuesResult.error) result.errors.push(issuesResult.error);

      // Sync pull requests
      const prResult = await this.syncPullRequests(repositoryId, owner, repo, githubToken, syncType);
      result.pullRequestsSynced = prResult.count;
      if (prResult.error) result.errors.push(prResult.error);

      // Update repository stats
      await this.updateRepositoryStats(repositoryId);

      console.log(`[SyncService] Completed sync for ${owner}/${repo}:`, result);
      return result;
    } catch (error: any) {
      console.error(`[SyncService] Sync failed:`, error);
      result.errors.push(error.message);
      return result;
    }
  }

  private async syncIssues(
    repositoryId: string,
    owner: string,
    repo: string,
    githubToken: string,
    syncType: 'full' | 'incremental'
  ): Promise<{ count: number; error?: string }> {
    try {
      const states = syncType === 'full' ? ['open', 'closed'] : ['open'];
      let allIssues: any[] = [];

      for (const state of states) {
        let page = 1;
        while (true) {
          const issues = await fetchGitHubIssues(githubToken, owner, repo, page, 100, state);
          if (!issues || issues.length === 0) break;
          // GitHub /issues API includes PRs; filter them out
          const issuesOnly = issues.filter((i: any) => !i.pull_request);
          allIssues = allIssues.concat(issuesOnly);
          if (issues.length < 100) break;
          page++;
        }
      }

      // Remove duplicates (in case an issue changes state between requests)
      const uniqueIssues = allIssues.filter((issue, index, self) =>
        index === self.findIndex((i) => i.id === issue.id)
      );

      console.log(`[SyncService] Fetched ${uniqueIssues.length} unique issues`);

      // Upsert issues to database
      for (const issue of uniqueIssues) {
        await this.upsertIssue(repositoryId, issue);
      }

      return { count: uniqueIssues.length };
    } catch (error: any) {
      console.error(`[SyncService] Issues sync error:`, error);
      return { count: 0, error: `Issues sync failed: ${error.message}` };
    }
  }

  private async upsertIssue(repositoryId: string, issue: any) {
    const issueData = {
      githubId: String(issue.id),
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state,
      authorLogin: issue.user?.login || 'unknown',
      authorType: issue.user?.type || 'User',
      labels: issue.labels?.map((l: any) => l.name) || [],
      assignees: issue.assignees?.map((a: any) => a.login) || [],
      commentsCount: issue.comments || 0,
      htmlUrl: issue.html_url,
      repositoryId: repositoryId,
      closedAt: issue.closed_at ? new Date(issue.closed_at) : null,
      createdAt: new Date(issue.created_at),
      updatedAt: new Date(issue.updated_at),
    };

    await prisma.issue.upsert({
      where: { githubId: String(issue.id) },
      update: issueData,
      create: issueData,
    });
  }

  private async syncPullRequests(
    repositoryId: string,
    owner: string,
    repo: string,
    githubToken: string,
    syncType: 'full' | 'incremental'
  ): Promise<{ count: number; error?: string }> {
    try {
      const states = syncType === 'full' ? ['open', 'closed'] : ['open'];
      let allPRs: any[] = [];

      for (const state of states) {
        let page = 1;
        while (true) {
          const prs = await fetchGitHubPullRequests(githubToken, owner, repo, page, 100, state);
          if (!prs || prs.length === 0) break;
          allPRs = allPRs.concat(prs);
          if (prs.length < 100) break;
          page++;
        }
      }

      // Remove duplicates
      const uniquePRs = allPRs.filter((pr, index, self) =>
        index === self.findIndex((p) => p.id === pr.id)
      );

      console.log(`[SyncService] Fetched ${uniquePRs.length} unique pull requests`);

      // Upsert pull requests to database and check whitelist
      for (const pr of uniquePRs) {
        await this.upsertPullRequest(repositoryId, pr);
        await this.checkWhitelistAndDetect(repositoryId, pr);
      }

      return { count: uniquePRs.length };
    } catch (error: any) {
      console.error(`[SyncService] Pull requests sync error:`, error);
      return { count: 0, error: `Pull requests sync failed: ${error.message}` };
    }
  }

  private async upsertPullRequest(repositoryId: string, pr: any) {
    const prData = {
      githubId: String(pr.id),
      number: pr.number,
      title: pr.title,
      body: pr.body,
      state: pr.state,
      authorLogin: pr.user?.login || 'unknown',
      authorType: pr.user?.type || 'User',
      headRef: pr.head?.ref,
      baseRef: pr.base?.ref,
      isDraft: pr.draft || false,
      additions: pr.additions || 0,
      deletions: pr.deletions || 0,
      changedFiles: pr.changed_files || 0,
      commits: pr.commits || 0,
      merged: pr.merged || false,
      mergeable: pr.mergeable,
      mergedBy: pr.merged_by?.login,
      mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
      closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
      htmlUrl: pr.html_url,
      repositoryId: repositoryId,
      createdAt: new Date(pr.created_at),
      updatedAt: new Date(pr.updated_at),
    };

    await prisma.pullRequest.upsert({
      where: { githubId: String(pr.id) },
      update: prData,
      create: prData,
    });
  }

  private async checkWhitelistAndDetect(repositoryId: string, pr: any) {
    const authorLogin = (pr.user?.login || 'unknown').toLowerCase();

    const whitelistEntry = await prisma.whitelist.findUnique({
      where: {
        repositoryId_githubUsername: {
          repositoryId,
          githubUsername: authorLogin,
        },
      },
    });

    if (whitelistEntry) return; // Author is trusted, skip

    // Find the stored PR record
    const storedPR = await prisma.pullRequest.findUnique({
      where: { githubId: String(pr.id) },
    });

    if (!storedPR) return;

    // Only create a detection if one doesn't already exist for this PR
    const existing = await prisma.detection.findFirst({
      where: { pullRequestId: storedPR.id, targetType: 'pr' },
    });

    if (existing) return;

    await prisma.detection.create({
      data: {
        targetType: 'pr',
        targetId: storedPR.id,
        isAiGenerated: false,
        confidenceScore: 0,
        indicators: { reason: 'author_not_in_whitelist', authorLogin },
        modelVersion: 'whitelist-v1',
        repositoryId,
        pullRequestId: storedPR.id,
      },
    });

    // Also mark the PR as detected
    await prisma.pullRequest.update({
      where: { id: storedPR.id },
      data: { aiDetected: true },
    });

    console.log(`[SyncService] Created detection for non-whitelisted PR author: ${authorLogin} (PR #${pr.number})`);
  }

  private async updateRepositoryStats(repositoryId: string) {
    // Count issues and PRs
    const [openIssues, closedIssues, openPRs, closedPRs] = await Promise.all([
      prisma.issue.count({ where: { repositoryId, state: 'open' } }),
      prisma.issue.count({ where: { repositoryId, state: 'closed' } }),
      prisma.pullRequest.count({ where: { repositoryId, state: 'open' } }),
      prisma.pullRequest.count({ where: { repositoryId, state: 'closed' } }),
    ]);

    await prisma.repository.update({
      where: { id: repositoryId },
      data: {
        openIssuesCount: openIssues,
        openPrsCount: openPRs,
      },
    });

    console.log(`[SyncService] Updated stats: ${openIssues} open issues, ${openPRs} open PRs`);
  }
}

export const syncService = new SyncService();
