-- AlterTable
ALTER TABLE "comments" ALTER COLUMN "githubId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "issues" ALTER COLUMN "githubId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "organizations" ALTER COLUMN "githubId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "pull_requests" ALTER COLUMN "githubId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "repositories" ALTER COLUMN "githubId" SET DATA TYPE TEXT;
