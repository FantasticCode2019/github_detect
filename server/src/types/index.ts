import { User, Repository, Issue, PullRequest, Detection, Whitelist, Notification } from '@prisma/client';

export type { User, Repository, Issue, PullRequest, Detection, Whitelist, Notification };

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

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface GitHubUser {
  id: number;
  login: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

export interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

export interface GitHubRepoInfo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  html_url: string;
  clone_url: string;
  default_branch: string;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
  };
}

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
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
