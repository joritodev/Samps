-- AlterEnum: colunas livres (CUSTOM) no quadro do cliente
ALTER TYPE "BoardListType" ADD VALUE 'CUSTOM';

-- DropUnique: várias colunas CUSTOM (e nomes livres) por quadro
DROP INDEX IF EXISTS "BoardList_boardId_type_key";

-- Indexes para ordenação e filtro de ativas
CREATE INDEX IF NOT EXISTS "BoardList_boardId_sortOrder_idx" ON "BoardList"("boardId", "sortOrder");
CREATE INDEX IF NOT EXISTS "BoardList_boardId_active_idx" ON "BoardList"("boardId", "active");

-- boardColumn estável por listId (evita colisão entre várias CUSTOM)
UPDATE "Demand" d
SET "boardColumn" = 'list:' || d."listId"
WHERE d."listId" IS NOT NULL;

-- Permissão boards.manage_lists
INSERT INTO "Permission" ("id", "code", "name", "createdAt")
SELECT
  'perm_boards_manage_lists',
  'boards.manage_lists',
  'Gerenciar colunas do quadro',
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "Permission" WHERE "code" = 'boards.manage_lists'
);

-- Admin, Gestão e Social Media (líder de conta) recebem a permissão
INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT
  'rp_bml_' || substr(md5(r."id"), 1, 16),
  r."id",
  p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."code" = 'boards.manage_lists'
  AND r."name" IN ('Administrador', 'Gestão', 'Social Media')
  AND NOT EXISTS (
    SELECT 1
    FROM "RolePermission" rp
    WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );
