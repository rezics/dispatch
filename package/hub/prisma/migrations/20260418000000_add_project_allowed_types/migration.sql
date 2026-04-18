-- AlterTable: Add allowedTypes to Project
ALTER TABLE "Project" ADD COLUMN "allowedTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
