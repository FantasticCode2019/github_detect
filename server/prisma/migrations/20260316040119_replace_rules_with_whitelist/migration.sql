/*
  Warnings:

  - You are about to drop the `rule_executions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `rules` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "rule_executions" DROP CONSTRAINT "rule_executions_ruleId_fkey";

-- DropForeignKey
ALTER TABLE "rules" DROP CONSTRAINT "rules_repositoryId_fkey";

-- DropForeignKey
ALTER TABLE "rules" DROP CONSTRAINT "rules_userId_fkey";

-- DropTable
DROP TABLE "rule_executions";

-- DropTable
DROP TABLE "rules";

-- CreateTable
CREATE TABLE "whitelists" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "githubUsername" TEXT NOT NULL,
    "note" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whitelists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whitelists_repositoryId_githubUsername_key" ON "whitelists"("repositoryId", "githubUsername");

-- AddForeignKey
ALTER TABLE "whitelists" ADD CONSTRAINT "whitelists_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whitelists" ADD CONSTRAINT "whitelists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
