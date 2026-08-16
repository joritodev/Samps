-- Repara boardColumn de fluxo de setor/demandas sobrescrito pela migration
-- 20260816180000 (UPDATE indiscriminado list:{id} em todo Demand com listId).

UPDATE "Demand"
SET "boardColumn" = 'production'
WHERE "boardColumn" LIKE 'list:%' AND status = 'IN_PRODUCTION';

UPDATE "Demand"
SET "boardColumn" = 'review'
WHERE "boardColumn" LIKE 'list:%' AND status = 'IN_REVIEW';

UPDATE "Demand"
SET "boardColumn" = 'adjustments'
WHERE "boardColumn" LIKE 'list:%' AND status = 'ADJUSTMENTS';

UPDATE "Demand"
SET "boardColumn" = 'available'
WHERE "boardColumn" LIKE 'list:%'
  AND status IN ('AVAILABLE', 'DEMANDED', 'APPROVED', 'SCHEDULED');

UPDATE "Demand"
SET "boardColumn" = 'assigned'
WHERE "boardColumn" LIKE 'list:%'
  AND status = 'OPEN'
  AND "assigneeId" IS NOT NULL;
