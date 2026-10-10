-- Ações de auditoria de projetos e captações.
-- ADD VALUE fica em migration própria: o Postgres não deixa usar um valor novo de enum na mesma transação em que ele nasce.

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PROJECT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SHOOT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SHOOT_COMPLETED';
