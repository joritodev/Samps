-- CreateEnum
CREATE TYPE "KpiMetric" AS ENUM ('COMPLETED', 'ON_TIME_RATE', 'OVERDUE', 'REWORK_RATE', 'ADJUSTMENTS', 'WORKED_HOURS', 'AVG_LEAD_TIME_DAYS', 'UNASSIGNED_OPEN');

-- CreateEnum
CREATE TYPE "GoalScope" AS ENUM ('AGENCY', 'SECTOR', 'USER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'GOAL_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'GOAL_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'GOAL_DELETED';

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "metric" "KpiMetric" NOT NULL,
    "scope" "GoalScope" NOT NULL,
    "sectorId" TEXT,
    "userId" TEXT,
    "target" DOUBLE PRECISION NOT NULL,
    "warnMargin" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "startsOn" TIMESTAMP(3) NOT NULL,
    "endsOn" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Goal_scope_sectorId_idx" ON "Goal"("scope", "sectorId");

-- CreateIndex
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");

-- CreateIndex
CREATE INDEX "Goal_startsOn_endsOn_idx" ON "Goal"("startsOn", "endsOn");

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Integridade: escopo e vínculo andam juntos; período e valores válidos.
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_scope_link_check" CHECK (
  ("scope" = 'AGENCY' AND "sectorId" IS NULL AND "userId" IS NULL)
  OR ("scope" = 'SECTOR' AND "sectorId" IS NOT NULL AND "userId" IS NULL)
  OR ("scope" = 'USER' AND "userId" IS NOT NULL AND "sectorId" IS NULL)
);
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_values_check" CHECK (
  "target" >= 0 AND "warnMargin" >= 0 AND "warnMargin" <= 1 AND "endsOn" >= "startsOn"
);

-- Permissão goals.manage: criar, editar e apagar metas (e OKRs, nas próximas fatias)
INSERT INTO "Permission" ("id", "code", "name", "createdAt")
SELECT
  'perm_goals_manage',
  'goals.manage',
  'Gerenciar metas e OKRs',
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "Permission" WHERE "code" = 'goals.manage'
);

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT
  'rp_gm_' || substr(md5(r."id"), 1, 16),
  r."id",
  p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."code" = 'goals.manage'
  AND r."name" IN ('Administrador', 'Gestão')
  AND NOT EXISTS (
    SELECT 1
    FROM "RolePermission" rp
    WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );

-- Meta é dado interno da equipe. Cliente externo não lê nem grava.
-- app_rls_active() = false → migrations, seed e scripts admin passam sem recorte.
ALTER TABLE "Goal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Goal" FORCE ROW LEVEL SECURITY;
CREATE POLICY internal_only ON "Goal" FOR ALL
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
