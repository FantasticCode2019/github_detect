import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticateToken } from '../middleware/auth.js';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.js';
import { exchangeGitHubCode, getGitHubUser, getGitHubUserEmails } from '../utils/github.js';

const router = Router();

// GitHub OAuth callback
router.post('/github', async (req, res) => {
  try {
    const { code, redirect_uri } = req.body;

    if (!code) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Authorization code is required',
        },
      });
      return;
    }

    // Exchange code for access token
    const tokenData = await exchangeGitHubCode(code, redirect_uri);

    // Get GitHub user info
    const githubUser = await getGitHubUser(tokenData.access_token);

    // Get primary email if not provided
    let email = githubUser.email;
    console.log(`[Auth] GitHub user email from profile:`, email);

    if (!email) {
      console.log(`[Auth] Fetching emails from GitHub API...`);
      const emails = await getGitHubUserEmails(tokenData.access_token);
      console.log(`[Auth] Retrieved ${emails.length} emails:`, emails.map(e => ({ email: e.email, primary: e.primary, verified: e.verified })));

      const primaryEmail = emails.find(e => e.primary && e.verified);
      if (primaryEmail) {
        email = primaryEmail.email;
        console.log(`[Auth] Using primary verified email:`, email);
      } else if (emails.length > 0) {
        // Fallback to any email if no primary verified found
        email = emails[0].email;
        console.log(`[Auth] Using first available email:`, email);
      }
    }

    if (!email) {
      console.error(`[Auth] No email available for user ${githubUser.login} (ID: ${githubUser.id})`);
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Email is required from GitHub. Please ensure your GitHub account has a verified email and you granted email access permission.',
        },
      });
      return;
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { githubId: githubUser.id.toString() },
    });

    if (user) {
      // Update existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          email,
          username: githubUser.login,
          displayName: githubUser.name || githubUser.login,
          avatarUrl: githubUser.avatar_url,
          githubToken: tokenData.access_token,
          updatedAt: new Date(),
        },
      });
    } else {
      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        // Link GitHub account to existing user
        user = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            githubId: githubUser.id.toString(),
            githubToken: tokenData.access_token,
            avatarUrl: githubUser.avatar_url,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            email,
            username: githubUser.login,
            displayName: githubUser.name || githubUser.login,
            avatarUrl: githubUser.avatar_url,
            githubId: githubUser.id.toString(),
            githubToken: tokenData.access_token,
            role: 'USER',
            settings: {},
          },
        });
      }
    }

    // Generate JWT tokens
    const tokens = generateTokens(user);

    // Save refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refresh_token },
    });

    res.json({
      success: true,
      data: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          role: user.role,
          settings: user.settings,
        },
      },
    });
  } catch (error: any) {
    console.error('GitHub OAuth error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'OAUTH_ERROR',
        message: error.message || 'Failed to authenticate with GitHub',
      },
    });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Refresh token is required',
        },
      });
      return;
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refresh_token);

    if (payload.type !== 'refresh') {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid refresh token',
        },
      });
      return;
    }

    // Get user and verify refresh token
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || user.refreshToken !== refresh_token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired refresh token',
        },
      });
      return;
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    // Save new refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refresh_token },
    });

    res.json({
      success: true,
      data: {
        access_token: tokens.access_token,
        expires_in: tokens.expires_in,
      },
    });
  } catch (error: any) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired refresh token',
      },
    });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Clear refresh token
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { refreshToken: null },
    });

    res.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to logout',
      },
    });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = req.user!;

    // Get user's organizations
    const organizations = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      include: {
        organization: true,
      },
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          role: user.role,
          settings: user.settings,
          organizations: organizations.map(org => ({
            id: org.organization.id,
            name: org.organization.name,
            role: org.role,
          })),
        },
      },
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to get user',
      },
    });
  }
});

export default router;
