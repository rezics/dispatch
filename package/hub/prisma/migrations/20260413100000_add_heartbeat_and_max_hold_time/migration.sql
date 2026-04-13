-- AlterTable
ALTER TABLE "Project" ADD COLUMN "maxTaskHoldTime" INTEGER;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "maxHoldExpiresAt" TIMESTAMP(3);
