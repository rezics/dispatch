-- AlterTable: Add recurrence and priority fields to Task
ALTER TABLE "Task" ADD COLUMN "basePriority" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "Task" ADD COLUMN "recurrenceInterval" INTEGER;
ALTER TABLE "Task" ADD COLUMN "recurrenceJitter" INTEGER;

-- AlterTable: Add aging fields to Project
ALTER TABLE "Project" ADD COLUMN "agingRate" DOUBLE PRECISION;
ALTER TABLE "Project" ADD COLUMN "agingMaxPriority" INTEGER DEFAULT 1000;

-- Backfill: Set basePriority to match existing priority for all rows
UPDATE "Task" SET "basePriority" = "priority";
