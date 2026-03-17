import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useRepositoryStore, useAuthStore } from '@/store';
import { api } from '@/lib/api';
import {
  GitBranch,
  Star,
  Search,
  Plus,
  MoreVertical,
  RefreshCw,
  Settings,
  Trash2,
  Bot,
  Loader2
} from 'lucide-react';

export function Repositories() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { repositories, isLoading, fetchRepositories } = useRepositoryStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchRepositories();
  }, [isAuthenticated]);

  const handleAddRepository = async () => {
    if (!newRepoName.trim()) return;

    setIsAdding(true);
    try {
      const response = await api.addRepository(newRepoName.trim());
      if (response.success) {
        setShowAddDialog(false);
        setNewRepoName('');
        fetchRepositories();
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleSyncRepository = async (id: string) => {
    try {
      const response = await api.syncRepository(id);
      if (response.success) {
        console.log('[Repositories] Sync started:', response.data?.sync_id);
        // Refresh the repository list to show updated sync status
        fetchRepositories();
      } else {
        console.error('[Repositories] Sync failed:', response.error);
      }
    } catch (error: any) {
      console.error('[Repositories] Sync error:', error);
    }
  };

  const filteredRepos = repositories.filter(repo =>
    repo.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Repositories</h1>
          <p className="text-muted-foreground">
            Manage your monitored GitHub repositories
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Repository
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Repository</DialogTitle>
              <DialogDescription>
                Enter the full name of the GitHub repository (e.g., owner/repo-name)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Repository Name</label>
                <Input
                  placeholder="owner/repository"
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRepository()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddRepository}
                disabled={isAdding || !newRepoName.trim()}
              >
                {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Repository
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => fetchRepositories()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredRepos.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No repositories found</h3>
              <p className="text-muted-foreground text-center max-w-md mt-2">
                {searchQuery
                  ? 'No repositories match your search query'
                  : 'Start by adding a GitHub repository to monitor AI activity'}
              </p>
              {!searchQuery && (
                <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Repository
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredRepos.map((repo) => (
            <Card key={repo.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <GitBranch className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3
                          className="font-semibold text-lg cursor-pointer hover:text-primary"
                          onClick={() => navigate(`/repositories/${repo.id}`)}
                        >
                          {repo.full_name}
                        </h3>
                        {repo.private && (
                          <Badge variant="secondary">Private</Badge>
                        )}
                        {repo.ai_detected_count > 0 && (
                          <Badge variant="destructive" className="gap-1">
                            <Bot className="h-3 w-3" />
                            {repo.ai_detected_count}
                          </Badge>
                        )}
                      </div>
                      {repo.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {repo.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4" />
                          {repo.stars_count}
                        </span>
                        <span>{repo.language || 'Unknown'}</span>
                        <span>{repo.open_issues_count} open issues</span>
                        <span>{repo.open_prs_count} open PRs</span>
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => navigate(`/repositories/${repo.id}`)}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleSyncRepository(repo.id)}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Sync Now
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={async () => {
                          await api.deleteRepository(repo.id);
                          fetchRepositories();
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
