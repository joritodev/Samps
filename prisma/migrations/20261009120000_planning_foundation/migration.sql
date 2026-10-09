-- Planejamento semanal de produção (Design e Vídeo). Fatia 1: fundação.
-- Spec: docs/superpowers/specs/2026-10-09-planejamento-semanal-design.md

-- CreateEnum
CREATE TYPE "PlanCardStatus" AS ENUM ('NAO_ALOCADO', 'PROGRAMADO', 'EM_EDICAO', 'REVISAO', 'CONCLUIDO');

-- CreateTable
CREATE TABLE "PlanMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#1d4ed8',
    "defaultCapacityHours" DECIMAL(4,2) NOT NULL DEFAULT 6,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanTemplate" (
    "id" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "clientId" TEXT,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Outro',
    "durationHours" DECIMAL(7,4) NOT NULL,
    "weeklyQuantity" INTEGER NOT NULL DEFAULT 1,
    "preferredMemberId" TEXT,
    "preferredWeekday" SMALLINT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanCard" (
    "id" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "isoYear" INTEGER NOT NULL,
    "isoWeek" INTEGER NOT NULL,
    "weekday" SMALLINT,
    "memberId" TEXT,
    "kind" TEXT NOT NULL,
    "clientId" TEXT,
    "clientName" TEXT,
    "demandId" TEXT,
    "templateId" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Outro',
    "durationHours" DECIMAL(7,4) NOT NULL,
    "status" "PlanCardStatus" NOT NULL DEFAULT 'NAO_ALOCADO',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" DATE,
    "notes" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanDayBlock" (
    "id" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "isoYear" INTEGER NOT NULL,
    "isoWeek" INTEGER NOT NULL,
    "weekday" SMALLINT NOT NULL,
    "memberId" TEXT,
    "reason" TEXT NOT NULL DEFAULT 'Bloqueado',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanDayBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanCapacityOverride" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "weekday" SMALLINT,
    "isoYear" INTEGER,
    "isoWeek" INTEGER,
    "hours" DECIMAL(4,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanCapacityOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanPreset" (
    "id" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "hours" DECIMAL(6,4) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlanPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanMember_userId_key" ON "PlanMember"("userId");

-- CreateIndex
CREATE INDEX "PlanMember_sectorId_active_sortOrder_idx" ON "PlanMember"("sectorId", "active", "sortOrder");

-- CreateIndex
CREATE INDEX "PlanTemplate_sectorId_active_sortOrder_idx" ON "PlanTemplate"("sectorId", "active", "sortOrder");

-- CreateIndex
CREATE INDEX "PlanCard_sectorId_isoYear_isoWeek_idx" ON "PlanCard"("sectorId", "isoYear", "isoWeek");

-- CreateIndex
CREATE INDEX "PlanCard_memberId_isoYear_isoWeek_idx" ON "PlanCard"("memberId", "isoYear", "isoWeek");

-- CreateIndex
CREATE INDEX "PlanCard_demandId_idx" ON "PlanCard"("demandId");

-- CreateIndex
CREATE INDEX "PlanDayBlock_sectorId_isoYear_isoWeek_idx" ON "PlanDayBlock"("sectorId", "isoYear", "isoWeek");

-- CreateIndex
CREATE INDEX "PlanCapacityOverride_memberId_idx" ON "PlanCapacityOverride"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanPreset_sectorId_label_key" ON "PlanPreset"("sectorId", "label");

-- AddForeignKey
ALTER TABLE "PlanMember" ADD CONSTRAINT "PlanMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanMember" ADD CONSTRAINT "PlanMember_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanTemplate" ADD CONSTRAINT "PlanTemplate_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanTemplate" ADD CONSTRAINT "PlanTemplate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanTemplate" ADD CONSTRAINT "PlanTemplate_preferredMemberId_fkey" FOREIGN KEY ("preferredMemberId") REFERENCES "PlanMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCard" ADD CONSTRAINT "PlanCard_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCard" ADD CONSTRAINT "PlanCard_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "PlanMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCard" ADD CONSTRAINT "PlanCard_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCard" ADD CONSTRAINT "PlanCard_demandId_fkey" FOREIGN KEY ("demandId") REFERENCES "Demand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCard" ADD CONSTRAINT "PlanCard_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PlanTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCard" ADD CONSTRAINT "PlanCard_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanDayBlock" ADD CONSTRAINT "PlanDayBlock_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanDayBlock" ADD CONSTRAINT "PlanDayBlock_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "PlanMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCapacityOverride" ADD CONSTRAINT "PlanCapacityOverride_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "PlanMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanPreset" ADD CONSTRAINT "PlanPreset_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Integridade: dia 1-6 (seg-sáb), semana ISO válida, durações e capacidades dentro de 0-24h.
ALTER TABLE "PlanMember" ADD CONSTRAINT "PlanMember_capacity_check" CHECK ("defaultCapacityHours" >= 0 AND "defaultCapacityHours" <= 24);
ALTER TABLE "PlanTemplate" ADD CONSTRAINT "PlanTemplate_values_check" CHECK (
  "durationHours" > 0 AND "durationHours" <= 24
  AND "weeklyQuantity" >= 1
  AND ("preferredWeekday" IS NULL OR "preferredWeekday" BETWEEN 1 AND 6)
);
ALTER TABLE "PlanCard" ADD CONSTRAINT "PlanCard_values_check" CHECK (
  "durationHours" > 0 AND "durationHours" <= 24
  AND "isoWeek" BETWEEN 1 AND 53
  AND "isoYear" BETWEEN 2020 AND 2100
  AND ("weekday" IS NULL OR "weekday" BETWEEN 1 AND 6)
);
ALTER TABLE "PlanDayBlock" ADD CONSTRAINT "PlanDayBlock_values_check" CHECK (
  "weekday" BETWEEN 1 AND 6
  AND "isoWeek" BETWEEN 1 AND 53
  AND "isoYear" BETWEEN 2020 AND 2100
);
ALTER TABLE "PlanCapacityOverride" ADD CONSTRAINT "PlanCapacityOverride_values_check" CHECK (
  "hours" >= 0 AND "hours" <= 24
  AND ("weekday" IS NULL OR "weekday" BETWEEN 1 AND 6)
  AND (("isoYear" IS NULL) = ("isoWeek" IS NULL))
  AND ("isoWeek" IS NULL OR "isoWeek" BETWEEN 1 AND 53)
);
ALTER TABLE "PlanPreset" ADD CONSTRAINT "PlanPreset_hours_check" CHECK ("hours" > 0 AND "hours" <= 24);

-- Permissões do planejamento semanal.
--   planning.view   : ver o quadro (todo papel interno)
--   planning.edit   : criar, editar e mover cards (todo papel interno)
--   planning.manage : excluir cards, equipe, capacidade, bloqueios, modelos e presets (gestão)

INSERT INTO "Permission" ("id", "code", "name", "createdAt")
SELECT 'perm_planning_view', 'planning.view', 'Ver planejamento semanal', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE "code" = 'planning.view');

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp_plv_' || substr(md5(r."id"), 1, 16), r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."code" = 'planning.view'
  AND r."name" IN ('Administrador', 'Gestão', 'Social Media', 'Designer', 'Videomaker', 'Editor de Vídeo', 'Colaborador')
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp
    WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );

INSERT INTO "Permission" ("id", "code", "name", "createdAt")
SELECT 'perm_planning_edit', 'planning.edit', 'Criar e mover cards no planejamento semanal', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE "code" = 'planning.edit');

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp_ple_' || substr(md5(r."id"), 1, 16), r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."code" = 'planning.edit'
  AND r."name" IN ('Administrador', 'Gestão', 'Social Media', 'Designer', 'Videomaker', 'Editor de Vídeo', 'Colaborador')
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp
    WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );

INSERT INTO "Permission" ("id", "code", "name", "createdAt")
SELECT 'perm_planning_manage', 'planning.manage', 'Gerenciar planejamento semanal', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE "code" = 'planning.manage');

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp_plm_' || substr(md5(r."id"), 1, 16), r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."code" = 'planning.manage'
  AND r."name" IN ('Administrador', 'Gestão')
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp
    WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );

-- Tipos de produção iniciais de cada setor (idempotente). Em produção o seed não roda,
-- então os tempos-padrão do Design e as durações do Vídeo nascem aqui.
INSERT INTO "PlanPreset" ("id", "sectorId", "label", "hours", "sortOrder")
SELECT 'plp_' || substr(md5(s."slug" || '|' || v."label"), 1, 24), s."id", v."label", v."hours"::numeric(6,4), v."sortOrder"
FROM "Sector" s
JOIN (VALUES
  ('video', '30 minutos', 0.5, 0),
  ('video', 'Reel simples', 1, 1),
  ('video', 'Vídeo intermediário', 2, 2),
  ('video', 'Vídeo complexo', 3, 3),
  ('video', 'Vídeo elaborado', 6, 4),
  ('design', 'Criativo estático (por criativo)', 0.25, 0),
  ('design', 'Carrossel (por slide)', 0.25, 1),
  ('design', 'PDF / apresentação (por página)', 0.0833, 2),
  ('design', 'Sequência de stories (~5)', 0.3333, 3),
  ('design', 'Landing page (6–7 seções)', 2.5, 4),
  ('design', 'Identidade visual simples', 1.5, 5),
  ('design', 'Identidade visual completa', 2.5, 6),
  ('design', 'Criação de template de vídeo', 0.3333, 7),
  ('design', 'Vídeo com template pronto (por vídeo)', 0.1167, 8),
  ('design', 'Adicional: sem identidade visual definida', 1.5, 9)
) AS v("slug", "label", "hours", "sortOrder") ON v."slug" = s."slug"
WHERE NOT EXISTS (
  SELECT 1 FROM "PlanPreset" p WHERE p."sectorId" = s."id" AND p."label" = v."label"
);

-- Dados internos da equipe: cliente externo não lê nem grava.
-- app_rls_active() = false → migrations, seed e scripts admin passam sem recorte.
ALTER TABLE "PlanMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlanMember" FORCE ROW LEVEL SECURITY;
CREATE POLICY internal_only ON "PlanMember" FOR ALL
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

ALTER TABLE "PlanTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlanTemplate" FORCE ROW LEVEL SECURITY;
CREATE POLICY internal_only ON "PlanTemplate" FOR ALL
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

ALTER TABLE "PlanCard" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlanCard" FORCE ROW LEVEL SECURITY;
CREATE POLICY internal_only ON "PlanCard" FOR ALL
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

ALTER TABLE "PlanDayBlock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlanDayBlock" FORCE ROW LEVEL SECURITY;
CREATE POLICY internal_only ON "PlanDayBlock" FOR ALL
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

ALTER TABLE "PlanCapacityOverride" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlanCapacityOverride" FORCE ROW LEVEL SECURITY;
CREATE POLICY internal_only ON "PlanCapacityOverride" FOR ALL
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

ALTER TABLE "PlanPreset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlanPreset" FORCE ROW LEVEL SECURITY;
CREATE POLICY internal_only ON "PlanPreset" FOR ALL
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
