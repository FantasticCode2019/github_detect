import type { GitHubTokenResponse, GitHubUser, GitHubRepoInfo } from '../types/index.js';
import createHttpsProxyAgent from 'https-proxy-agent';
import fetch, { type RequestInit as NodeFetchRequestInit } from 'node-fetch';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const HTTP_PROXY = process.env.HTTP_PROXY || process.env.http_proxy || '';
const HTTPS_PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || '';

// Create proxy agent singleton
const proxyUrl = HTTPS_PROXY || HTTP_PROXY;
const proxyAgent = proxyUrl ? createHttpsProxyAgent(proxyUrl) : undefined;
console.log(`[Proxy] Proxy configured: ${proxyUrl || 'none'}`);

// Wrapper for fetch with proxy support
async function fetchWithProxy(url: string, options: NodeFetchRequestInit = {}): Promise<any> {
  // Add timeout signal
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const fetchOptions: NodeFetchRequestInit = {
      ...options,
      signal: controller.signal as any,
      ...(proxyAgent ? { agent: proxyAgent as any } : {}),
    };

    if (proxyAgent) {
      console.log(`[Proxy] Fetching ${url} with proxy`);
    }
    return await fetch(url, fetchOptions);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout: ${url}`);
    }
    console.error(`[Proxy] Fetch error for ${url}:`, error.message);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function exchangeGitHubCode(code: string, redirectUri?: string): Promise<GitHubTokenResponse> {
  console.log(`[GitHub] Exchanging code for token, redirectUri: ${redirectUri}`);

  const response = await fetchWithProxy('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[GitHub] Token exchange failed:`, {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
      clientId: GITHUB_CLIENT_ID,
      redirectUri: redirectUri
    });
    throw new Error(`GitHub OAuth error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json() as GitHubTokenResponse;

  if (!data.access_token) {
    throw new Error('Failed to get access token from GitHub');
  }

  return data;
}

export async function getGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetchWithProxy('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'GitGuard-AI',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get GitHub user: ${error}`);
  }

  return response.json() as Promise<GitHubUser>;
}

export async function getGitHubUserEmails(accessToken: string): Promise<Array<{ email: string; primary: boolean; verified: boolean }>> {
  const response = await fetchWithProxy('https://api.github.com/user/emails', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'GitGuard-AI',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[GitHub] Failed to fetch emails:`, {
      status: response.status,
      statusText: response.statusText,
      error: errorText
    });
    return [];
  }

  return response.json() as Promise<Array<{ email: string; primary: boolean; verified: boolean }>>;
}

export async function fetchGitHubRepositories(accessToken: string, page = 1, perPage = 30) {
  const response = await fetchWithProxy(`https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=updated`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'GitGuard-AI',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch repositories: ${error}`);
  }

  return response.json();
}

export async function fetchGitHubRepoInfo(accessToken: string, owner: string, repo: string): Promise<GitHubRepoInfo> {
  const response = await fetchWithProxy(
    `https://api.github.com/repos/${owner}/${repo}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitGuard-AI',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Repository not found on GitHub');
    }
    const error = await response.text();
    throw new Error(`Failed to fetch repository info: ${error}`);
  }

  return response.json() as Promise<GitHubRepoInfo>;
}

export async function fetchGitHubIssues(accessToken: string, owner: string, repo: string, page = 1, perPage = 30, state = 'open') {
  const response = await fetchWithProxy(
    `https://api.github.com/repos/${owner}/${repo}/issues?state=${state}&per_page=${perPage}&page=${page}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitGuard-AI',
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch issues: ${error}`);
  }

  return response.json();
}

export async function closePullRequest(accessToken: string, owner: string, repo: string, pullNumber: number) {
  const response = await fetchWithProxy(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitGuard-AI',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ state: 'closed' }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 403) {
      throw new Error('Permission denied: write access required to close pull requests');
    }
    throw new Error(`Failed to close pull request: ${error}`);
  }

  return response.json();
}

export async function fetchGitHubPullRequests(accessToken: string, owner: string, repo: string, page = 1, perPage = 30, state = 'open') {
  const response = await fetchWithProxy(
    `https://api.github.com/repos/${owner}/${repo}/pulls?state=${state}&per_page=${perPage}&page=${page}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitGuard-AI',
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch pull requests: ${error}`);
  }

  return response.json();
}
