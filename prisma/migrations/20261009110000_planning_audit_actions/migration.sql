-- Ações de auditoria do planejamento semanal.
-- ADD VALUE fica em migration própria: o Postgres não deixa usar um valor novo de enum na mesma transação em que ele nasce.

ALTER TYPE "AuditAction" ADD VALUE 'PLAN_CARD_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PLAN_CARD_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PLAN_CARD_MOVED';
ALTER TYPE "AuditAction" ADD VALUE 'PLAN_CARD_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'PLAN_WEEK_GENERATED';
ALTER TYPE "AuditAction" ADD VALUE 'PLAN_WEEK_DUPLICATED';
ALTER TYPE "AuditAction" ADD VALUE 'PLAN_DISTRIBUTION_APPLIED';
ALTER TYPE "AuditAction" ADD VALUE 'PLAN_SETTINGS_UPDATED';
