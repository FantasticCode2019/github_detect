import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useAuthStore } from '@/store';
import { api } from '@/lib/api';
import type { WhitelistEntry, Repository } from '@/types';
import {
  ShieldCheck,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  ScanLine,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

export function Whitelist() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState('');
  const [entries, setEntries] = useState<WhitelistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [newUsername, setNewUsername] = useState('');
  const [newNote, setNewNote] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadRepositories();
  }, [isAuthenticated]);

  const loadRepositories = async () => {
    try {
      const res = await api.getRepositories();
      if (res.success) {
        const repos = res.data?.repositories || [];
        setRepositories(repos);
        if (repos.length > 0 && !selectedRepoId) {
          setSelectedRepoId(repos[0].id);
        }
      }
    } catch (e: any) {
      toast.error('Failed to load repositories');
    }
  };

  const fetchEntries = useCallback(async () => {
    if (!selectedRepoId) return;
    setIsLoading(true);
    try {
      const res = await api.getWhitelist(selectedRepoId);
      if (res.success) {
        setEntries(res.data?.whitelist || []);
      }
    } catch (e: any) {
      toast.error('Failed to load whitelist');
    } finally {
      setIsLoading(false);
    }
  }, [selectedRepoId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleAdd = async () => {
    if (!newUsername.trim() || !selectedRepoId) return;
    setIsAdding(true);
    try {
      const res = await api.addToWhitelist(
        selectedRepoId,
        newUsername.trim().replace(/^@/, ''),
        newNote.trim() || undefined
      );
      if (res.success) {
        toast.success(`@${newUsername.trim().replace(/^@/, '')} added to whitelist`);
        setNewUsername('');
        setNewNote('');
        await fetchEntries();
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to add username');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (id: string, username: string) => {
    setRemovingId(id);
    try {
      const res = await api.removeFromWhitelist(id);
      if (res.success) {
        toast.success(`@${username} removed from whitelist`);
        await fetchEntries();
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove entry');
    } finally {
      setRemovingId(null);
    }
  };

  const handleScan = async () => {
    if (!selectedRepoId) return;
    setIsScanning(true);
    try {
      const res = await api.scanWhitelist(selectedRepoId);
      if (res.success) {
        const { scanned, created } = res.data || { scanned: 0, created: 0 };
        toast.success(`Scanned ${scanned} PRs — ${created} new detection(s) created`);
      }
    } catch (e: any) {
      toast.error(e.message || 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  const selectedRepo = repositories.find(r => r.id === selectedRepoId);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Whitelist</h1>
          <p className="text-muted-foreground">
            Trusted GitHub usernames — PRs from these users will not be flagged
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleScan}
          disabled={isScanning || !selectedRepoId}
          title="Scan existing open PRs against current whitelist"
        >
          {isScanning ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <ScanLine className="h-4 w-4 mr-2" />
          )}
          Scan PRs
        </Button>
      </div>

      {/* Repository selector */}
      <div className="flex items-center gap-3">
        <Select value={selectedRepoId} onValueChange={setSelectedRepoId}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Select a repository" />
          </SelectTrigger>
          <SelectContent>
            {repositories.map(r => (
              <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={fetchEntries} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{entries.length}</div>
                <div className="text-sm text-muted-foreground">Trusted Users</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <User className="h-8 w-8 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{selectedRepo?.full_name || '—'}</div>
                <div className="text-sm text-muted-foreground">Selected Repository</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add new entry */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Username</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-48">
              <label className="text-sm font-medium mb-1 block">GitHub Username</label>
              <Input
                placeholder="@username"
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <div className="flex-1 min-w-48">
              <label className="text-sm font-medium mb-1 block">Note (optional)</label>
              <Input
                placeholder="e.g. Core maintainer"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <Button
              onClick={handleAdd}
              disabled={isAdding || !newUsername.trim() || !selectedRepoId}
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add to Whitelist
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Whitelist entries */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !selectedRepoId ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShieldCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Select a repository to manage its whitelist</p>
            </CardContent>
          </Card>
        ) : entries.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShieldCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No whitelisted users</h3>
              <p className="text-muted-foreground text-center max-w-md mt-2">
                Add trusted GitHub usernames above. All open PRs from unknown authors will be flagged.
              </p>
            </CardContent>
          </Card>
        ) : (
          entries.map(entry => (
            <Card key={entry.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100">
                      <ShieldCheck className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">@{entry.github_username}</span>
                        {entry.note && (
                          <Badge variant="secondary" className="text-xs">{entry.note}</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Added by {entry.added_by?.username || 'system'} ·{' '}
                        {new Date(entry.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemove(entry.id, entry.github_username)}
                    disabled={removingId === entry.id}
                  >
                    {removingId === entry.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    <span className="ml-1">Remove</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
