-- Cartões que já saíram da produção antes da fatia 3.0 não tinham productionCompletedAt.
UPDATE "Demand"
SET "productionCompletedAt" = "updatedAt"
WHERE "productionCompletedAt" IS NULL
  AND status IN (
    'IN_REVIEW',
    'ADJUSTMENTS',
    'APPROVED',
    'SCHEDULED',
    'PUBLISHED',
    'DELIVERED',
    'DONE'
  );
