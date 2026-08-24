-- RLS para tabelas de dados internos da agência: Announcement e Absence.
--
-- Nenhuma delas tem clientId — são dados globais da agência, não por cliente.
-- A política aqui é mais simples: apenas usuários internos (não EXTERNAL_CLIENT)
-- podem acessar esses registros. O recorte por cliente (app_can_access_client)
-- não se aplica; usamos a mesma guarda de usuário interno que WorkSession usa.
--
-- app_rls_active() = false → migrations, seed e scripts admin passam sem recorte.

-- Announcement: comunicados internos da agência
ALTER TABLE "Announcement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Announcement" FORCE ROW LEVEL SECURITY;
CREATE POLICY internal_only ON "Announcement" FOR ALL
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

-- Absence: ausências dos colaboradores
-- Clientes externos não devem ver dados de RH da equipe.
ALTER TABLE "Absence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Absence" FORCE ROW LEVEL SECURITY;
CREATE POLICY internal_only ON "Absence" FOR ALL
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
