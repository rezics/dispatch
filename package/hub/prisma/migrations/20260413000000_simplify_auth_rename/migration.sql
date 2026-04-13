-- AlterTable: Rename trustLevel to verification on Project
ALTER TABLE "Project" RENAME COLUMN "trustLevel" TO "verification";

-- Update existing "full" values to "none"
UPDATE "Project" SET "verification" = 'none' WHERE "verification" = 'full';

-- AlterTable: Drop permissions column from TrustPolicy
ALTER TABLE "TrustPolicy" DROP COLUMN "permissions";
