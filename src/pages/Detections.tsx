import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthStore } from '@/store';
import { api } from '@/lib/api';
import type { DetectionResult } from '@/types';
import {
  GitPullRequest,
  Search,
  Filter,
  Loader2,
  UserCheck,
  AlertTriangle,
  CheckSquare,
  Trash2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export function Detections() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkClosing, setIsBulkClosing] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [repositoryFilter, setRepositoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDetections = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { target_type: 'pr' };
      if (repositoryFilter && repositoryFilter !== 'all') params.repository_id = repositoryFilter;
      const response = await api.getDetections(params);
      if (response.success) {
        setDetections(response.data?.detections || []);
      }
    } catch (e: any) {
      console.error('Failed to fetch detections:', e);
    } finally {
      setIsLoading(false);
    }
  }, [repositoryFilter]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchDetections();
  }, [isAuthenticated, navigate, fetchDetections]);

  const filteredDetections = detections.filter(d => {
    const pr = d.target as any;
    const search = searchQuery.toLowerCase();
    return (
      !search ||
      pr?.title?.toLowerCase().includes(search) ||
      pr?.author_login?.toLowerCase().includes(search) ||
      d.repository?.full_name?.toLowerCase().includes(search)
    );
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredDetections.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDetections.map(d => d.id)));
    }
  };

  const handleClose = async (detectionId: string) => {
    setClosingId(detectionId);
    try {
      const res = await api.bulkCloseDetections([detectionId]);
      if (res.success) {
        toast.success('PR closed successfully');
        await fetchDetections();
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to close PR');
    } finally {
      setClosingId(null);
    }
  };

  const handleResolve = async (detectionId: string) => {
    setResolvingId(detectionId);
    try {
      const res = await api.resolveDetection(detectionId);
      if (res.success) {
        toast.success('Author added to whitelist');
        await fetchDetections();
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to add to whitelist');
    } finally {
      setResolvingId(null);
    }
  };

  const handleBulkClose = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkClosing(true);
    try {
      const res = await api.bulkCloseDetections(Array.from(selectedIds));
      if (res.success) {
        toast.success(`Closed ${res.data?.closed} PR(s)`);
        setSelectedIds(new Set());
        await fetchDetections();
      }
    } catch (e: any) {
      toast.error(e.message || 'Bulk close failed');
    } finally {
      setIsBulkClosing(false);
    }
  };

  const repositories = Array.from(
    new Map(
      detections
        .filter(d => d.repository)
        .map(d => [d.repository!.id, d.repository!])
    ).values()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Flagged Pull Requests</h1>
          <p className="text-muted-foreground">
            PRs submitted by users not in the whitelist — review and close or approve
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDetections} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{detections.length}</div>
                <div className="text-sm text-muted-foreground">Pending Review</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckSquare className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{selectedIds.size}</div>
                <div className="text-sm text-muted-foreground">Selected</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <GitPullRequest className="h-8 w-8 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{repositories.length}</div>
                <div className="text-sm text-muted-foreground">Repositories Affected</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, author, repo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={repositoryFilter} onValueChange={setRepositoryFilter}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All Repositories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Repositories</SelectItem>
              {repositories.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg border">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleBulkClose}
            disabled={isBulkClosing}
          >
            {isBulkClosing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Bulk Close PRs
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Cancel
          </Button>
        </div>
      )}

      {/* Select all row */}
      {filteredDetections.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            checked={selectedIds.size === filteredDetections.length && filteredDetections.length > 0}
            onCheckedChange={toggleSelectAll}
            id="select-all"
          />
          <label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer">
            Select all ({filteredDetections.length})
          </label>
        </div>
      )}

      {/* Detection cards */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredDetections.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckSquare className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-medium">No flagged PRs</h3>
              <p className="text-muted-foreground text-center max-w-md mt-2">
                {searchQuery || repositoryFilter
                  ? 'No results match your filters'
                  : 'All PR authors are whitelisted — nothing to review'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredDetections.map((detection) => {
            const pr = detection.target as any;
            const indicators = detection.indicators as any;
            const isSelected = selectedIds.has(detection.id);

            return (
              <Card
                key={detection.id}
                className={`transition-all ${
                  isSelected ? 'ring-2 ring-primary border-primary' : 'hover:shadow-md'
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(detection.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          <GitPullRequest className="h-3 w-3 mr-1" />
                          PR #{pr?.number}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {detection.repository?.full_name}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          @{pr?.author_login || indicators?.authorLogin || 'unknown'}
                        </Badge>
                      </div>
                      <h3 className="font-semibold truncate">{pr?.title || 'Pull Request'}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {pr?.additions !== undefined && (
                          <span className="text-green-600">+{pr.additions}</span>
                        )}
                        {pr?.deletions !== undefined && (
                          <span className="text-red-500">-{pr.deletions}</span>
                        )}
                        {pr?.changed_files !== undefined && (
                          <span>{pr.changed_files} files</span>
                        )}
                        {pr?.commits !== undefined && (
                          <span>{pr.commits} commits</span>
                        )}
                        <span>{new Date(detection.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="mt-2">
                        <Badge
                          variant="outline"
                          className="text-xs text-orange-600 border-orange-300 bg-orange-50"
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Not in whitelist
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolve(detection.id)}
                        disabled={resolvingId === detection.id}
                        title="Add author to whitelist and dismiss"
                      >
                        {resolvingId === detection.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                        <span className="ml-1 hidden sm:inline">Approve</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleClose(detection.id)}
                        disabled={closingId === detection.id}
                        title="Close this PR"
                      >
                        {closingId === detection.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        <span className="ml-1 hidden sm:inline">Close PR</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
