import type { ApiResponse } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ApiClient {
  private baseUrl: string;
  private token: string | null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('access_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          this.setToken(null);
          window.location.href = '/login';
        }
        throw new Error(data.error?.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth
  async githubLogin(code: string, redirectUri?: string) {
    return this.request<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
      user: any;
    }>('/auth/github', {
      method: 'POST',
      body: JSON.stringify({ code, redirect_uri: redirectUri })
    });
  }

  async refreshToken(refreshToken: string) {
    return this.request<{
      access_token: string;
      expires_in: number;
    }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken })
    });
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  async getMe() {
    return this.request<{ user: any }>('/auth/me');
  }

  // Repositories
  async getRepositories(params?: {
    page?: number;
    per_page?: number;
    sort?: string;
    order?: string;
    q?: string;
    ai_detected_only?: boolean;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value));
      });
    }
    return this.request<{
      repositories: any[];
    }>(`/repositories?${queryParams.toString()}`);
  }

  async getRepository(id: string) {
    return this.request<{ repository: any }>(`/repositories/${id}`);
  }

  async addRepository(githubFullName: string, settings?: any) {
    return this.request<{ repository: any }>('/repositories', {
      method: 'POST',
      body: JSON.stringify({
        github_full_name: githubFullName,
        settings
      })
    });
  }

  async updateRepository(id: string, settings: any) {
    return this.request<{ repository: any }>(`/repositories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ settings })
    });
  }

  async deleteRepository(id: string) {
    return this.request(`/repositories/${id}`, { method: 'DELETE' });
  }

  async syncRepository(id: string, syncType: 'full' | 'incremental' = 'incremental') {
    return this.request<{ sync_id: string; status: string }>(
      `/repositories/${id}/sync`,
      {
        method: 'POST',
        body: JSON.stringify({ sync_type: syncType })
      }
    );
  }

  async getRepositoryStats(id: string, period: '7d' | '30d' | '90d' = '30d') {
    return this.request<{ stats: any }>(
      `/repositories/${id}/stats?period=${period}`
    );
  }

  // Issues
  async getIssues(repositoryId: string, params?: {
    state?: string;
    ai_detected?: boolean;
    min_confidence?: number;
    page?: number;
    per_page?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value));
      });
    }
    return this.request<{
      issues: any[];
    }>(`/repositories/${repositoryId}/issues?${queryParams.toString()}`);
  }

  async getIssue(id: string) {
    return this.request<{ issue: any }>(`/issues/${id}`);
  }

  async addIssueLabel(id: string, label: string) {
    return this.request(`/issues/${id}/label`, {
      method: 'POST',
      body: JSON.stringify({ label })
    });
  }

  async removeIssueLabel(id: string, label: string) {
    return this.request(`/issues/${id}/label/${label}`, { method: 'DELETE' });
  }

  async bulkActionOnIssues(issueIds: string[], action: string, params?: any) {
    return this.request('/issues/bulk-action', {
      method: 'POST',
      body: JSON.stringify({
        issue_ids: issueIds,
        action,
        params
      })
    });
  }

  // Pull Requests
  async getPullRequests(repositoryId: string, params?: {
    state?: string;
    ai_detected?: boolean;
    min_confidence?: number;
    page?: number;
    per_page?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value));
      });
    }
    return this.request<{
      pull_requests: any[];
    }>(`/repositories/${repositoryId}/pulls?${queryParams.toString()}`);
  }

  async getPullRequest(id: string) {
    return this.request<{ pull_request: any }>(`/pulls/${id}`);
  }

  async closePullRequest(id: string) {
    return this.request(`/pulls/${id}/close`, { method: 'POST' });
  }

  async getPullRequestFiles(id: string) {
    return this.request<{ files: any[] }>(`/pulls/${id}/files`);
  }

  async submitPullRequestReview(
    id: string,
    event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT',
    body?: string,
    comments?: any[]
  ) {
    return this.request(`/pulls/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ event, body, comments })
    });
  }

  // AI Detections
  async getDetections(params?: {
    repository_id?: string;
    target_type?: string;
    min_confidence?: number;
    max_confidence?: number;
    date_from?: string;
    date_to?: string;
    page?: number;
    per_page?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value));
      });
    }
    return this.request<{
      detections: any[];
    }>(`/detections?${queryParams.toString()}`);
  }

  async getDetection(id: string) {
    return this.request<{ detection: any }>(`/detections/${id}`);
  }

  async submitDetectionFeedback(
    id: string,
    isAiGenerated: boolean,
    comment?: string
  ) {
    return this.request(`/detections/${id}/feedback`, {
      method: 'POST',
      body: JSON.stringify({
        is_ai_generated: isAiGenerated,
        comment
      })
    });
  }

  async getDetectionStats(params?: {
    repository_id?: string;
    period?: '7d' | '30d' | '90d';
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value));
      });
    }
    return this.request<{ stats: any }>(
      `/detections/stats?${queryParams.toString()}`
    );
  }

  async analyzeContent(content: string, contentType: 'text' | 'code' | 'markdown') {
    return this.request<{ result: any }>('/detections/analyze', {
      method: 'POST',
      body: JSON.stringify({
        content,
        content_type: contentType
      })
    });
  }

  // Whitelist
  async getWhitelist(repositoryId: string) {
    return this.request<{ whitelist: any[] }>(`/whitelist?repository_id=${repositoryId}`);
  }

  async addToWhitelist(repositoryId: string, githubUsername: string, note?: string) {
    return this.request<{ entry: any }>('/whitelist', {
      method: 'POST',
      body: JSON.stringify({ repository_id: repositoryId, github_username: githubUsername, note }),
    });
  }

  async removeFromWhitelist(id: string) {
    return this.request(`/whitelist/${id}`, { method: 'DELETE' });
  }

  async scanWhitelist(repositoryId: string) {
    return this.request<{ scanned: number; created: number }>(`/whitelist/scan/${repositoryId}`, {
      method: 'POST',
    });
  }

  async resolveDetection(detectionId: string, note?: string) {
    return this.request(`/whitelist/resolve/${detectionId}`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  }

  async bulkCloseDetections(detectionIds: string[]) {
    return this.request<{ results: any[]; closed: number }>('/detections/bulk-close', {
      method: 'POST',
      body: JSON.stringify({ detection_ids: detectionIds }),
    });
  }

  // Rules (kept for compatibility)
  async getRules(repositoryId: string, isActive?: boolean) {
    const queryParams = new URLSearchParams();
    queryParams.append('repository_id', repositoryId);
    if (isActive !== undefined) queryParams.append('is_active', String(isActive));
    return this.request<{ rules: any[] }>(`/rules?${queryParams.toString()}`);
  }

  async createRule(ruleData: any) {
    return this.request<{ rule: any }>('/rules', {
      method: 'POST',
      body: JSON.stringify(ruleData)
    });
  }

  async getRule(id: string) {
    return this.request<{ rule: any }>(`/rules/${id}`);
  }

  async updateRule(id: string, updates: any) {
    return this.request<{ rule: any }>(`/rules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  async deleteRule(id: string) {
    return this.request(`/rules/${id}`, { method: 'DELETE' });
  }

  async testRule(id: string, testData: any) {
    return this.request<{
      would_trigger: boolean;
      matched_conditions: string[];
      actions_would_execute: string[];
    }>(`/rules/${id}/test`, {
      method: 'POST',
      body: JSON.stringify({ test_data: testData })
    });
  }

  async getRuleExecutions(id: string, page: number = 1, perPage: number = 20) {
    return this.request<{
      executions: any[];
    }>(`/rules/${id}/executions?page=${page}&per_page=${perPage}`);
  }

  // Analytics
  async getAnalyticsOverview(params?: {
    repository_id?: string;
    period?: '7d' | '30d' | '90d';
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value));
      });
    }
    return this.request<{ overview: any }>(
      `/analytics/overview?${queryParams.toString()}`
    );
  }

  async getAITrends(params?: {
    repository_id?: string;
    period?: '7d' | '30d' | '90d';
    group_by?: 'day' | 'week' | 'month';
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value));
      });
    }
    return this.request<{ trends: any[] }>(
      `/analytics/ai-trends?${queryParams.toString()}`
    );
  }

  async getContributors(params?: {
    repository_id?: string;
    period?: '7d' | '30d' | '90d';
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value));
      });
    }
    return this.request<{ contributors: any[] }>(
      `/analytics/contributors?${queryParams.toString()}`
    );
  }

  async generateReport(reportData: any) {
    return this.request<{ report_id: string; status: string }>(
      '/analytics/reports',
      {
        method: 'POST',
        body: JSON.stringify(reportData)
      }
    );
  }

  // Notifications
  async getNotifications(params?: {
    is_read?: boolean;
    type?: string;
    page?: number;
    per_page?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value));
      });
    }
    return this.request<{
      notifications: any[];
      unread_count: number;
    }>(`/notifications?${queryParams.toString()}`);
  }

  async markNotificationsAsRead(notificationIds?: string[], markAll?: boolean) {
    return this.request('/notifications', {
      method: 'POST',
      body: JSON.stringify({
        notification_ids: notificationIds,
        mark_all: markAll
      })
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
