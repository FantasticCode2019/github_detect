// User types
export interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'USER' | 'VIEWER';
  settings: Record<string, any>;
  organizations?: OrganizationMember[];
}

export interface OrganizationMember {
  id: string;
  name: string;
  role: string;
}

// Repository types
export interface Repository {
  id: string;
  github_id: number;
  name: string;
  full_name: string;
  description?: string;
  private: boolean;
  language?: string;
  stars_count: number;
  forks_count: number;
  open_issues_count: number;
  open_prs_count: number;
  ai_detected_count: number;
  settings: RepositorySettings;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RepositoryDetail extends Repository {
  webhook_url: string;
  members: RepositoryMember[];
  stats: {
    total_issues: number;
    total_prs: number;
    ai_detections: number;
    active_rules: number;
  };
}

export interface RepositorySettings {
  aiDetectionEnabled: boolean;
  autoLabeling: boolean;
  notificationChannels: string[];
  reviewRules: string[];
}

export interface RepositoryMember {
  id: string;
  username: string;
  avatar_url?: string;
  role: string;
}

// Issue types
export interface Issue {
  id: string;
  github_id: number;
  number: number;
  title: string;
  body?: string;
  state: string;
  author_login: string;
  author_type: string;
  labels: string[];
  assignees: string[];
  ai_detected: boolean;
  ai_confidence?: number;
  comments_count: number;
  html_url?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
}

export interface IssueDetail extends Issue {
  ai_indicators?: DetectionIndicators;
  comments: Comment[];
  detection_result?: DetectionResult;
}

// Pull Request types
export interface PullRequest {
  id: string;
  github_id: number;
  number: number;
  title: string;
  body?: string;
  state: string;
  author_login: string;
  author_type: string;
  head_ref?: string;
  base_ref?: string;
  is_draft: boolean;
  additions: number;
  deletions: number;
  changed_files: number;
  commits: number;
  ai_detected: boolean;
  ai_confidence?: number;
  merged: boolean;
  mergeable?: boolean;
  merged_by?: string;
  merged_at?: string;
  closed_at?: string;
  html_url?: string;
  created_at: string;
  updated_at: string;
}

export interface PullRequestDetail extends PullRequest {
  ai_indicators?: DetectionIndicators;
  code_ai_score?: number;
  description_ai_score?: number;
  files: PRFile[];
  comments: Comment[];
  detection_result?: DetectionResult;
}

export interface PRFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  ai_score?: number;
}

// Comment types
export interface Comment {
  id: string;
  body: string;
  author_login: string;
  ai_detected: boolean;
  created_at: string;
}

// AI Detection types
export interface DetectionResult {
  id: string;
  target_type: 'issue' | 'pr' | 'comment' | 'code';
  target?: Issue | PullRequest;
  repository?: {
    id: string;
    full_name: string;
  };
  is_ai_generated: boolean;
  confidence_score: number;
  indicators: DetectionIndicators;
  model_version: string;
  created_at: string;
}

export interface DetectionIndicators {
  writingPatternScore?: number;
  templateSimilarity?: number;
  responseTimeAnomaly?: number;
  codePatternScore?: number;
  commitMessagePattern?: number;
  accountAgeSignal?: number;
  [key: string]: number | undefined;
}

export interface DetectionStats {
  total_analyzed: number;
  ai_detected_count: number;
  detection_rate: number;
  average_confidence: number;
  by_type: Record<string, number>;
  by_period: Array<{ date: string; count: number }>;
}

// Whitelist types
export interface WhitelistEntry {
  id: string;
  github_username: string;
  note?: string;
  added_by?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  created_at: string;
}

// Detection indicator for whitelist-based detections
export interface WhitelistDetectionIndicators {
  reason: string;
  authorLogin: string;
  [key: string]: string | number | undefined;
}

// Rule types
export interface Rule {
  id: string;
  name: string;
  description?: string;
  conditions: RuleCondition;
  priority: number;
  is_active: boolean;
  triggered_count: number;
  last_triggered_at?: string;
  actions: RuleAction[];
  execution_count?: number;
  created_at: string;
  updated_at: string;
}

export interface RuleCondition {
  operator: 'AND' | 'OR';
  conditions: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
}

export interface RuleAction {
  id: string;
  action_type: string;
  action_config: Record<string, any>;
  execution_order: number;
  is_active?: boolean;
}

export interface RuleExecution {
  id: string;
  target_type?: string;
  target_id?: string;
  execution_status: string;
  execution_result?: any;
  error_message?: string;
  executed_at: string;
}

// Notification types
export interface Notification {
  id: string;
  type: string;
  title: string;
  message?: string;
  data?: Record<string, any>;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

// Analytics types
export interface AnalyticsOverview {
  total_repositories: number;
  total_issues: number;
  total_prs: number;
  ai_detection_rate: number;
  active_rules: number;
  rules_triggered: number;
  ai_detected_issues: number;
  ai_detected_prs: number;
}

export interface AITrendPoint {
  date: string;
  total_detected: number;
  high_confidence: number;
  by_type: Record<string, number>;
}

export interface ContributorStats {
  login: string;
  avatar_url?: string;
  issues: number;
  prs: number;
  contributions: number;
  ai_generated: number;
  ai_percentage: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

// Auth types
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

// UI types
export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export interface DashboardStats {
  totalRepositories: number;
  aiDetections: number;
  pendingReviews: number;
  activeRules: number;
}

export interface ActivityItem {
  id: string;
  type: 'ai_detected' | 'rule_triggered' | 'issue_created' | 'pr_created';
  title: string;
  description: string;
  timestamp: string;
  repository: string;
  confidence?: number;
}
