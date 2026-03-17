-- GitGuard AI Database Schema
-- PostgreSQL 14+
-- Generated from Prisma Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE "UserRole" AS ENUM ('SUPERADMIN', 'ADMIN', 'USER', 'VIEWER');
CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TYPE "RepositoryRole" AS ENUM ('OWNER', 'MAINTAINER', 'DEVELOPER', 'VIEWER');

-- Users Table
CREATE TABLE "users" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "username" VARCHAR(255) UNIQUE NOT NULL,
    "displayName" VARCHAR(255),
    "avatarUrl" TEXT,
    "role" "UserRole" DEFAULT 'USER',
    "settings" JSONB DEFAULT '{}',
    "githubId" VARCHAR(255) UNIQUE,
    "githubToken" TEXT,
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

-- Organizations Table
CREATE TABLE "organizations" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "githubId" INTEGER UNIQUE NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "login" VARCHAR(255) UNIQUE NOT NULL,
    "avatarUrl" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

-- Organization Members Table
CREATE TABLE "organization_members" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "OrganizationRole" NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("organizationId", "userId"),
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Repositories Table
CREATE TABLE "repositories" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "githubId" INTEGER UNIQUE NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "fullName" VARCHAR(255) UNIQUE NOT NULL,
    "description" TEXT,
    "private" BOOLEAN DEFAULT false,
    "language" VARCHAR(50),
    "starsCount" INTEGER DEFAULT 0,
    "forksCount" INTEGER DEFAULT 0,
    "openIssuesCount" INTEGER DEFAULT 0,
    "openPrsCount" INTEGER DEFAULT 0,
    "aiDetectedCount" INTEGER DEFAULT 0,
    "settings" JSONB DEFAULT '{}',
    "webhookUrl" TEXT,
    "webhookSecret" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "organizationId" UUID,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL
);

-- Repository Members Table
CREATE TABLE "repository_members" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "repositoryId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "RepositoryRole" NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("repositoryId", "userId"),
    FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Issues Table
CREATE TABLE "issues" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "githubId" INTEGER UNIQUE NOT NULL,
    "number" INTEGER NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "body" TEXT,
    "state" VARCHAR(20) DEFAULT 'open',
    "authorLogin" VARCHAR(255) NOT NULL,
    "authorType" VARCHAR(20) DEFAULT 'User',
    "labels" TEXT[] DEFAULT '{}',
    "assignees" TEXT[] DEFAULT '{}',
    "aiDetected" BOOLEAN DEFAULT false,
    "aiConfidence" REAL,
    "commentsCount" INTEGER DEFAULT 0,
    "htmlUrl" TEXT,
    "repositoryId" UUID NOT NULL,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("repositoryId", "number"),
    FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE
);

-- Pull Requests Table
CREATE TABLE "pull_requests" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "githubId" INTEGER UNIQUE NOT NULL,
    "number" INTEGER NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "body" TEXT,
    "state" VARCHAR(20) DEFAULT 'open',
    "authorLogin" VARCHAR(255) NOT NULL,
    "authorType" VARCHAR(20) DEFAULT 'User',
    "headRef" VARCHAR(255),
    "baseRef" VARCHAR(255),
    "isDraft" BOOLEAN DEFAULT false,
    "additions" INTEGER DEFAULT 0,
    "deletions" INTEGER DEFAULT 0,
    "changedFiles" INTEGER DEFAULT 0,
    "commits" INTEGER DEFAULT 0,
    "aiDetected" BOOLEAN DEFAULT false,
    "aiConfidence" REAL,
    "merged" BOOLEAN DEFAULT false,
    "mergeable" BOOLEAN,
    "mergedBy" VARCHAR(255),
    "mergedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "htmlUrl" TEXT,
    "repositoryId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("repositoryId", "number"),
    FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE
);

-- PR Files Table
CREATE TABLE "pr_files" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "filename" VARCHAR(500) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "additions" INTEGER DEFAULT 0,
    "deletions" INTEGER DEFAULT 0,
    "changes" INTEGER DEFAULT 0,
    "patch" TEXT,
    "aiScore" REAL,
    "pullRequestId" UUID NOT NULL,
    FOREIGN KEY ("pullRequestId") REFERENCES "pull_requests"("id") ON DELETE CASCADE
);

-- Comments Table
CREATE TABLE "comments" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "githubId" INTEGER UNIQUE NOT NULL,
    "body" TEXT NOT NULL,
    "authorLogin" VARCHAR(255) NOT NULL,
    "aiDetected" BOOLEAN DEFAULT false,
    "aiConfidence" REAL,
    "issueId" UUID,
    "pullRequestId" UUID,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE,
    FOREIGN KEY ("pullRequestId") REFERENCES "pull_requests"("id") ON DELETE CASCADE
);

-- Detections Table
CREATE TABLE "detections" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "targetType" VARCHAR(20) NOT NULL,
    "targetId" VARCHAR(255) NOT NULL,
    "isAiGenerated" BOOLEAN NOT NULL,
    "confidenceScore" REAL NOT NULL,
    "indicators" JSONB DEFAULT '{}',
    "modelVersion" VARCHAR(20) DEFAULT 'v1.0.0',
    "repositoryId" UUID NOT NULL,
    "userId" UUID,
    "feedbackIsAi" BOOLEAN,
    "feedbackComment" TEXT,
    "issueId" UUID,
    "pullRequestId" UUID,
    "commentId" UUID,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL,
    FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE,
    FOREIGN KEY ("pullRequestId") REFERENCES "pull_requests"("id") ON DELETE CASCADE,
    FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE
);

-- Rules Table
CREATE TABLE "rules" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "conditions" JSONB NOT NULL,
    "priority" INTEGER DEFAULT 0,
    "isActive" BOOLEAN DEFAULT true,
    "triggeredCount" INTEGER DEFAULT 0,
    "lastTriggeredAt" TIMESTAMP(3),
    "actions" JSONB DEFAULT '[]',
    "repositoryId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Rule Executions Table
CREATE TABLE "rule_executions" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ruleId" UUID NOT NULL,
    "targetType" VARCHAR(20),
    "targetId" VARCHAR(255),
    "executionStatus" VARCHAR(20) DEFAULT 'pending',
    "executionResult" JSONB,
    "errorMessage" TEXT,
    "executedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("ruleId") REFERENCES "rules"("id") ON DELETE CASCADE
);

-- Notifications Table
CREATE TABLE "notifications" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT,
    "data" JSONB DEFAULT '{}',
    "isRead" BOOLEAN DEFAULT false,
    "readAt" TIMESTAMP(3),
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Sync Jobs Table
CREATE TABLE "sync_jobs" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "repositoryId" UUID NOT NULL,
    "syncType" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "stats" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX "idx_users_githubId" ON "users"("githubId");
CREATE INDEX "idx_users_email" ON "users"("email");
CREATE INDEX "idx_users_username" ON "users"("username");
CREATE INDEX "idx_organizations_githubId" ON "organizations"("githubId");
CREATE INDEX "idx_organizations_login" ON "organizations"("login");
CREATE INDEX "idx_repositories_githubId" ON "repositories"("githubId");
CREATE INDEX "idx_repositories_fullName" ON "repositories"("fullName");
CREATE INDEX "idx_repositories_orgId" ON "repositories"("organizationId");
CREATE INDEX "idx_issues_repoId" ON "issues"("repositoryId");
CREATE INDEX "idx_issues_state" ON "issues"("state");
CREATE INDEX "idx_issues_aiDetected" ON "issues"("aiDetected");
CREATE INDEX "idx_pull_requests_repoId" ON "pull_requests"("repositoryId");
CREATE INDEX "idx_pull_requests_state" ON "pull_requests"("state");
CREATE INDEX "idx_detections_repoId" ON "detections"("repositoryId");
CREATE INDEX "idx_rules_repoId" ON "rules"("repositoryId");
CREATE INDEX "idx_notifications_userId" ON "notifications"("userId");
CREATE INDEX "idx_sync_jobs_repoId" ON "sync_jobs"("repositoryId");

-- Update timestamps function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Update timestamps triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON "users"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON "organizations"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_repositories_updated_at BEFORE UPDATE ON "repositories"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON "issues"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pull_requests_updated_at BEFORE UPDATE ON "pull_requests"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
