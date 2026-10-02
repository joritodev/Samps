-- CreateEnum
CREATE TYPE "ObjectiveStatus" AS ENUM ('ACTIVE', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "KeyResultKind" AS ENUM ('KPI', 'MANUAL');

-- CreateEnum
CREATE TYPE "Confidence" AS ENUM ('ON_TRACK', 'AT_RISK', 'OFF_TRACK');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'OBJECTIVE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'OBJECTIVE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'OBJECTIVE_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'KEY_RESULT_CHECKED_IN';

-- CreateTable
CREATE TABLE "Objective" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "scope" "GoalScope" NOT NULL,
    "sectorId" TEXT,
    "userId" TEXT,
    "parentId" TEXT,
    "startsOn" TIMESTAMP(3) NOT NULL,
    "endsOn" TIMESTAMP(3) NOT NULL,
    "status" "ObjectiveStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Objective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeyResult" (
    "id" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "KeyResultKind" NOT NULL,
    "metric" "KpiMetric",
    "unit" TEXT,
    "startValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeyResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeyResultCheckIn" (
    "id" TEXT NOT NULL,
    "keyResultId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "confidence" "Confidence" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeyResultCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Objective_scope_sectorId_idx" ON "Objective"("scope", "sectorId");

-- CreateIndex
CREATE INDEX "Objective_userId_idx" ON "Objective"("userId");

-- CreateIndex
CREATE INDEX "Objective_ownerId_idx" ON "Objective"("ownerId");

-- CreateIndex
CREATE INDEX "Objective_parentId_idx" ON "Objective"("parentId");

-- CreateIndex
CREATE INDEX "Objective_startsOn_endsOn_idx" ON "Objective"("startsOn", "endsOn");

-- CreateIndex
CREATE INDEX "KeyResult_objectiveId_sortOrder_idx" ON "KeyResult"("objectiveId", "sortOrder");

-- CreateIndex
CREATE INDEX "KeyResultCheckIn_keyResultId_createdAt_idx" ON "KeyResultCheckIn"("keyResultId", "createdAt");

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Objective"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeyResult" ADD CONSTRAINT "KeyResult_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeyResultCheckIn" ADD CONSTRAINT "KeyResultCheckIn_keyResultId_fkey" FOREIGN KEY ("keyResultId") REFERENCES "KeyResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeyResultCheckIn" ADD CONSTRAINT "KeyResultCheckIn_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Integridade: escopo e vínculo andam juntos; período válido; tipo e indicador coerentes.
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_scope_link_check" CHECK (
  ("scope" = 'AGENCY' AND "sectorId" IS NULL AND "userId" IS NULL)
  OR ("scope" = 'SECTOR' AND "sectorId" IS NOT NULL AND "userId" IS NULL)
  OR ("scope" = 'USER' AND "userId" IS NOT NULL AND "sectorId" IS NULL)
);
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_period_check" CHECK ("endsOn" >= "startsOn");
ALTER TABLE "KeyResult" ADD CONSTRAINT "KeyResult_kind_check" CHECK (
  ("kind" = 'KPI' AND "metric" IS NOT NULL)
  OR ("kind" = 'MANUAL' AND "metric" IS NULL)
);
ALTER TABLE "KeyResult" ADD CONSTRAINT "KeyResult_target_check" CHECK ("targetValue" <> "startValue");

-- Dado interno da equipe. Cliente externo não lê nem grava.
-- app_rls_active() = false → migrations, seed e scripts admin passam sem recorte.
ALTER TABLE "Objective" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Objective" FORCE ROW LEVEL SECURITY;
CREATE POLICY internal_only ON "Objective" FOR ALL
  USING (
    NOT app_rls_active()
    OR EXISTS (
      SELECT 1
      FROM "User" u
      WHERE u.id = app_current_user_id()
        AND u."userType" <> 'EXTERNAL_CLIENT'
    )
  )
  WITH CHECK (
    NOT app_rls_active()
    OR EXISTS (
      SELECT 1
      FROM "User" u
      WHERE u.id = app_current_user_id()
        AND u."userType" <> 'EXTERNAL_CLIENT'
    )
  );

-- Dado interno da equipe. Cliente externo não lê nem grava.
-- app_rls_active() = false → migrations, seed e scripts admin passam sem recorte.
ALTER TABLE "KeyResult" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KeyResult" FORCE ROW LEVEL SECURITY;
CREATE POLICY internal_only ON "KeyResult" FOR ALL
  USING (
    NOT app_rls_active()
    OR EXISTS (
      SELECT 1
      FROM "User" u
      WHERE u.id = app_current_user_id()
        AND u."userType" <> 'EXTERNAL_CLIENT'
    )
  )
  WITH CHECK (
    NOT app_rls_active()
    OR EXISTS (
      SELECT 1
      FROM "User" u
      WHERE u.id = app_current_user_id()
        AND u."userType" <> 'EXTERNAL_CLIENT'
    )
  );

-- Dado interno da equipe. Cliente externo não lê nem grava.
-- app_rls_active() = false → migrations, seed e scripts admin passam sem recorte.
ALTER TABLE "KeyResultCheckIn" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KeyResultCheckIn" FORCE ROW LEVEL SECURITY;
CREATE POLICY internal_only ON "KeyResultCheckIn" FOR ALL
  USING (
    NOT app_rls_active()
    OR EXISTS (
      SELECT 1
      FROM "User" u
      WHERE u.id = app_current_user_id()
        AND u."userType" <> 'EXTERNAL_CLIENT'
    )
  )
  WITH CHECK (
    NOT app_rls_active()
    OR EXISTS (
      SELECT 1
      FROM "User" u
      WHERE u.id = app_current_user_id()
        AND u."userType" <> 'EXTERNAL_CLIENT'
    )
  );
