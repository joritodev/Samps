-- Amplia o RLS para Comment e WorkSession (Fase 1 Task 7).
-- Recorte via Demand.clientId; comentários INTERNAL ficam só para usuários internos;
-- WorkSession não é visível para EXTERNAL_CLIENT.

ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Comment" FORCE ROW LEVEL SECURITY;
CREATE POLICY client_scope ON "Comment" FOR ALL
  USING (
    NOT app_rls_active()
    OR app_sees_all_clients()
    OR (
      "demandId" IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM "Demand" d
        WHERE d.id = "Comment"."demandId"
          AND app_can_access_client(d."clientId")
      )
      AND (
        "visibility" = 'EXTERNAL'
        OR EXISTS (
          SELECT 1
          FROM "User" u
          WHERE u.id = app_current_user_id()
            AND u."userType" <> 'EXTERNAL_CLIENT'
        )
      )
    )
  )
  WITH CHECK (
    NOT app_rls_active()
    OR app_sees_all_clients()
    OR (
      "demandId" IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM "Demand" d
        WHERE d.id = "Comment"."demandId"
          AND app_can_access_client(d."clientId")
      )
    )
  );

ALTER TABLE "WorkSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkSession" FORCE ROW LEVEL SECURITY;
CREATE POLICY client_scope ON "WorkSession" FOR ALL
  USING (
    NOT app_rls_active()
    OR app_sees_all_clients()
    OR (
      EXISTS (
        SELECT 1
        FROM "User" u
        WHERE u.id = app_current_user_id()
          AND u."userType" <> 'EXTERNAL_CLIENT'
      )
      AND EXISTS (
        SELECT 1
        FROM "Demand" d
        WHERE d.id = "WorkSession"."demandId"
          AND app_can_access_client(d."clientId")
      )
    )
  )
  WITH CHECK (
    NOT app_rls_active()
    OR app_sees_all_clients()
    OR (
      EXISTS (
        SELECT 1
        FROM "User" u
        WHERE u.id = app_current_user_id()
          AND u."userType" <> 'EXTERNAL_CLIENT'
      )
      AND EXISTS (
        SELECT 1
        FROM "Demand" d
        WHERE d.id = "WorkSession"."demandId"
          AND app_can_access_client(d."clientId")
      )
    )
  );
