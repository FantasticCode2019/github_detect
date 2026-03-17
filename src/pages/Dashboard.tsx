import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDashboardStore, useAuthStore } from '@/store';
import {
  GitBranch,
  Bot,
  AlertCircle,
  ListTodo,
  TrendingUp,
  ArrowRight,
  Clock
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export function Dashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { stats, recentDetections, isLoading, fetchDashboardData } = useDashboardStore();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }

    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated, authLoading]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Mock trend data - would come from API
  const trendData = [
    { date: 'Mon', detections: 12, highConfidence: 8 },
    { date: 'Tue', detections: 19, highConfidence: 12 },
    { date: 'Wed', detections: 15, highConfidence: 10 },
    { date: 'Thu', detections: 25, highConfidence: 18 },
    { date: 'Fri', detections: 22, highConfidence: 15 },
    { date: 'Sat', detections: 8, highConfidence: 5 },
    { date: 'Sun', detections: 10, highConfidence: 7 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor AI activity across your repositories
          </p>
        </div>
        <Button onClick={() => navigate('/repositories/new')}>
          Add Repository
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monitored Repositories
            </CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalRepositories || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active monitoring
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              AI Detections
            </CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.aiDetections || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Review
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingReviews || 0}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Rules
            </CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeRules || 0}</div>
            <p className="text-xs text-muted-foreground">
              Auto-processing
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              AI Detection Trends (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="detections"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="Total Detections"
                  />
                  <Line
                    type="monotone"
                    dataKey="highConfidence"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name="High Confidence"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Recent AI Detections
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/detections')}
            >
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentDetections.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No recent detections
                </div>
              ) : (
                recentDetections.slice(0, 5).map((detection) => (
                  <div
                    key={detection.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/detections/${detection.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        detection.confidence_score >= 0.8
                          ? 'bg-red-500'
                          : detection.confidence_score >= 0.5
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`} />
                      <div>
                        <p className="font-medium text-sm">
                          {detection.target_type === 'pr' ? 'PR' : 'Issue'} detected
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {detection.repository?.full_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        detection.confidence_score >= 0.8
                          ? 'destructive'
                          : detection.confidence_score >= 0.5
                          ? 'default'
                          : 'secondary'
                      }>
                        {(detection.confidence_score * 100).toFixed(0)}%
                      </Badge>
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(detection.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* High Risk Repositories */}
      <Card>
        <CardHeader>
          <CardTitle>High Risk Repositories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: 'org/frontend-app', risk: 85, detections: 45 },
              { name: 'org/backend-api', risk: 62, detections: 28 },
              { name: 'org/mobile-app', risk: 45, detections: 15 },
            ].map((repo) => (
              <div
                key={repo.name}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-4">
                  <GitBranch className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{repo.name}</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Risk Score:</span>
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          repo.risk >= 80
                            ? 'bg-red-500'
                            : repo.risk >= 60
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${repo.risk}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{repo.risk}%</span>
                  </div>
                  <Badge variant="secondary">
                    {repo.detections} detections
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
