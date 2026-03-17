import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GitBranch,
  GitPullRequest,
  CircleDot,
  ArrowLeft,
  RefreshCw,
  Star,
  GitFork,
  Bot,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
} from 'lucide-react';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function ConfidenceBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return null;
  const pct = Math.round(score * 100);
  const color =
    pct >= 80
      ? 'bg-red-100 text-red-700 border-red-200'
      : pct >= 50
      ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
      : 'bg-green-100 text-green-700 border-green-200';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}
    >
      <Bot className="h-3 w-3" />
      {pct}%
    </span>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function RepositoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [repo, setRepo] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [prs, setPrs] = useState<any[]>([]);
  const [isLoadingRepo, setIsLoadingRepo] = useState(true);
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);
  const [isLoadingPrs, setIsLoadingPrs] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [issueState, setIssueState] = useState<'open' | 'closed' | 'all'>('open');
  const [prState, setPrState] = useState<'open' | 'closed' | 'all'>('open');
  const [issueAiOnly, setIssueAiOnly] = useState(false);
  const [prAiOnly, setPrAiOnly] = useState(false);

  const [issuePage, setIssuePage] = useState(1);
  const [prPage, setPrPage] = useState(1);
  const [issueMeta, setIssueMeta] = useState<any>(null);
  const [prMeta, setPrMeta] = useState<any>(null);

  const perPage = 20;

  useEffect(() => {
    if (!id) return;
    setIsLoadingRepo(true);
    api.getRepository(id)
      .then(res => res.success && setRepo(res.data?.repository))
      .finally(() => setIsLoadingRepo(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setIsLoadingIssues(true);
    api.getIssues(id, { state: issueState, ai_detected: issueAiOnly || undefined, page: issuePage, per_page: perPage })
      .then(res => {
        if (res.success) {
          setIssues(res.data?.issues || []);
          setIssueMeta((res as any).meta);
        }
      })
      .finally(() => setIsLoadingIssues(false));
  }, [id, issueState, issueAiOnly, issuePage]);

  useEffect(() => {
    if (!id) return;
    setIsLoadingPrs(true);
    api.getPullRequests(id, { state: prState, ai_detected: prAiOnly || undefined, page: prPage, per_page: perPage })
      .then(res => {
        if (res.success) {
          setPrs(res.data?.pull_requests || []);
          setPrMeta((res as any).meta);
        }
      })
      .finally(() => setIsLoadingPrs(false));
  }, [id, prState, prAiOnly, prPage]);

  const [closingPrId, setClosingPrId] = useState<string | null>(null);

  const handleClosePr = async (prId: string) => {
    setClosingPrId(prId);
    try {
      await api.closePullRequest(prId);
      setPrs(prev => prev.map(p => p.id === prId ? { ...p, state: 'closed', closed_at: new Date().toISOString() } : p));
    } catch (error: any) {
      console.error('Close PR error:', error);
    } finally {
      setClosingPrId(null);
    }
  };

  const handleSync = async () => {
    if (!id) return;
    setIsSyncing(true);
    try {
      await api.syncRepository(id, 'full');
      const res = await api.getRepository(id);
      if (res.success) setRepo(res.data?.repository);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoadingRepo) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!repo) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Repository not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/repositories')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{repo.full_name}</h1>
              {repo.private && <Badge variant="secondary">Private</Badge>}
              {repo.language && (
                <Badge variant="outline" className="font-normal">{repo.language}</Badge>
              )}
            </div>
            {repo.description && (
              <p className="text-muted-foreground mt-1 text-sm max-w-2xl">{repo.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5" />{repo.stars_count ?? 0}
              </span>
              <span className="flex items-center gap-1">
                <GitFork className="h-3.5 w-3.5" />{repo.forks_count ?? 0}
              </span>
              {repo.last_synced_at && (
                <span>Last synced: {formatDate(repo.last_synced_at)}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {repo.html_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={`https://github.com/${repo.full_name}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" />
                GitHub
              </a>
            </Button>
          )}
          <Button size="sm" onClick={handleSync} disabled={isSyncing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<CircleDot className="h-5 w-5" />}
          label="Open Issues"
          value={repo.stats?.total_issues ?? 0}
        />
        <StatCard
          icon={<GitPullRequest className="h-5 w-5" />}
          label="Pull Requests"
          value={repo.stats?.total_prs ?? 0}
        />
        <StatCard
          icon={<Bot className="h-5 w-5" />}
          label="AI Detections"
          value={repo.stats?.ai_detections ?? 0}
        />
        <StatCard
          icon={<GitBranch className="h-5 w-5" />}
          label="Active Rules"
          value={repo.stats?.active_rules ?? 0}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="issues">
        <TabsList>
          <TabsTrigger value="issues">
            <CircleDot className="h-4 w-4 mr-1" />
            Issues
          </TabsTrigger>
          <TabsTrigger value="pulls">
            <GitPullRequest className="h-4 w-4 mr-1" />
            Pull Requests
          </TabsTrigger>
        </TabsList>

        {/* ── Issues Tab ── */}
        <TabsContent value="issues" className="space-y-4 mt-4">
          <div className="flex items-center gap-2 flex-wrap">
            {(['open', 'closed', 'all'] as const).map(s => (
              <Button
                key={s}
                size="sm"
                variant={issueState === s ? 'default' : 'outline'}
                onClick={() => { setIssueState(s); setIssuePage(1); }}
                className="capitalize"
              >
                {s}
              </Button>
            ))}
            <Button
              size="sm"
              variant={issueAiOnly ? 'default' : 'outline'}
              onClick={() => { setIssueAiOnly(v => !v); setIssuePage(1); }}
              className="gap-1"
            >
              <Bot className="h-3.5 w-3.5" />
              AI Only
            </Button>
          </div>

          {isLoadingIssues ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : issues.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CircleDot className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No issues found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {issues.map(issue => (
                <Card key={issue.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {issue.state === 'open' ? (
                          <CircleDot className="h-4 w-4 text-green-500" />
                        ) : (
                          <CircleDot className="h-4 w-4 text-purple-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <a
                              href={issue.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium hover:text-primary hover:underline line-clamp-1"
                            >
                              {issue.title}
                            </a>
                            {issue.ai_detected && (
                              <ConfidenceBadge score={issue.ai_confidence} />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">#{issue.number}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />{issue.author_login}
                          </span>
                          <span>{formatDate(issue.created_at)}</span>
                          {issue.comments_count > 0 && (
                            <span>{issue.comments_count} comments</span>
                          )}
                          {issue.labels?.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {issue.labels.map((l: string) => (
                                <span key={l} className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{l}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {issueMeta && issueMeta.total_pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-muted-foreground">
                Page {issueMeta.page} of {issueMeta.total_pages} ({issueMeta.total} total)
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm" variant="outline"
                  disabled={issuePage <= 1}
                  onClick={() => setIssuePage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm" variant="outline"
                  disabled={issuePage >= issueMeta.total_pages}
                  onClick={() => setIssuePage(p => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Pull Requests Tab ── */}
        <TabsContent value="pulls" className="space-y-4 mt-4">
          <div className="flex items-center gap-2 flex-wrap">
            {(['open', 'closed', 'all'] as const).map(s => (
              <Button
                key={s}
                size="sm"
                variant={prState === s ? 'default' : 'outline'}
                onClick={() => { setPrState(s); setPrPage(1); }}
                className="capitalize"
              >
                {s}
              </Button>
            ))}
            <Button
              size="sm"
              variant={prAiOnly ? 'default' : 'outline'}
              onClick={() => { setPrAiOnly(v => !v); setPrPage(1); }}
              className="gap-1"
            >
              <Bot className="h-3.5 w-3.5" />
              AI Only
            </Button>
          </div>

          {isLoadingPrs ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : prs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <GitPullRequest className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No pull requests found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {prs.map(pr => (
                <Card key={pr.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {pr.merged ? (
                          <GitPullRequest className="h-4 w-4 text-purple-500" />
                        ) : pr.state === 'open' ? (
                          <GitPullRequest className="h-4 w-4 text-green-500" />
                        ) : (
                          <GitPullRequest className="h-4 w-4 text-red-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <a
                              href={pr.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium hover:text-primary hover:underline line-clamp-1"
                            >
                              {pr.title}
                            </a>
                            {pr.is_draft && (
                              <Badge variant="outline" className="text-xs">Draft</Badge>
                            )}
                            {pr.ai_detected && (
                              <ConfidenceBadge score={pr.ai_confidence} />
                            )}
                            {pr.merged && (
                              <Badge className="text-xs bg-purple-100 text-purple-700 border-purple-200 border">Merged</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground">#{pr.number}</span>
                            {pr.state === 'open' && !pr.merged && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
                                disabled={closingPrId === pr.id}
                                onClick={() => handleClosePr(pr.id)}
                              >
                                {closingPrId === pr.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : 'Close'}
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />{pr.author_login}
                          </span>
                          <span>{formatDate(pr.created_at)}</span>
                          {pr.head_ref && pr.base_ref && (
                            <span className="font-mono">{pr.head_ref} → {pr.base_ref}</span>
                          )}
                          {(pr.additions !== undefined || pr.deletions !== undefined) && (
                            <span>
                              <span className="text-green-600">+{pr.additions}</span>
                              {' / '}
                              <span className="text-red-500">-{pr.deletions}</span>
                            </span>
                          )}
                          {pr.changed_files > 0 && (
                            <span>{pr.changed_files} files</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {prMeta && prMeta.total_pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-muted-foreground">
                Page {prMeta.page} of {prMeta.total_pages} ({prMeta.total} total)
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm" variant="outline"
                  disabled={prPage <= 1}
                  onClick={() => setPrPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm" variant="outline"
                  disabled={prPage >= prMeta.total_pages}
                  onClick={() => setPrPage(p => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
