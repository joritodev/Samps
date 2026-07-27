-- Row Level Security por cliente.
--
-- Segunda barreira depois do escopo aplicado na aplicação (clientScopeFilter):
-- se um `where` for esquecido em alguma consulta, o banco ainda recorta as
-- linhas para os clientes do usuário do request.
--
-- O recorte só entra em vigor quando `app.user_id` está definido. Migrations,
-- seed e scripts administrativos rodam sem essa variável e seguem irrestritos.

CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS text
  LANGUAGE sql STABLE
  AS $$ SELECT NULLIF(current_setting('app.user_id', true), '') $$;

CREATE OR REPLACE FUNCTION app_rls_active() RETURNS boolean
  LANGUAGE sql STABLE
  AS $$ SELECT app_current_user_id() IS NOT NULL $$;

CREATE OR REPLACE FUNCTION app_sees_all_clients() RETURNS boolean
  LANGUAGE sql STABLE
  AS $$
    SELECT EXISTS (
      SELECT 1
      FROM "User" u
      JOIN "RolePermission" rp ON rp."roleId" = u."roleId"
      JOIN "Permission" p ON p.id = rp."permissionId"
      WHERE u.id = app_current_user_id()
        AND p.code = 'clients.view_all'
    )
  $$;

CREATE OR REPLACE FUNCTION app_can_access_client(target text) RETURNS boolean
  LANGUAGE sql STABLE
  AS $$
    SELECT NOT app_rls_active()
        OR target IS NULL
        OR app_sees_all_clients()
        OR EXISTS (
             SELECT 1
             FROM "UserClientLink" l
             WHERE l."userId" = app_current_user_id()
               AND l."clientId" = target
               AND l."isActive"
           )
  $$;

-- "Client" é recortado pelo próprio id; as demais tabelas pelo `clientId`.
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client" FORCE ROW LEVEL SECURITY;
CREATE POLICY client_scope ON "Client" FOR ALL
  USING (app_can_access_client(id))
  WITH CHECK (app_can_access_client(id));

ALTER TABLE "Contract" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contract" FORCE ROW LEVEL SECURITY;
CREATE POLICY client_scope ON "Contract" FOR ALL
  USING (app_can_access_client("clientId"))
  WITH CHECK (app_can_access_client("clientId"));

ALTER TABLE "Demand" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Demand" FORCE ROW LEVEL SECURITY;
CREATE POLICY client_scope ON "Demand" FOR ALL
  USING (app_can_access_client("clientId"))
  WITH CHECK (app_can_access_client("clientId"));

ALTER TABLE "ClientBoard" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClientBoard" FORCE ROW LEVEL SECURITY;
CREATE POLICY client_scope ON "ClientBoard" FOR ALL
  USING (app_can_access_client("clientId"))
  WITH CHECK (app_can_access_client("clientId"));

ALTER TABLE "ClientPortal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClientPortal" FORCE ROW LEVEL SECURITY;
CREATE POLICY client_scope ON "ClientPortal" FOR ALL
  USING (app_can_access_client("clientId"))
  WITH CHECK (app_can_access_client("clientId"));

ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" FORCE ROW LEVEL SECURITY;
CREATE POLICY client_scope ON "Project" FOR ALL
  USING (app_can_access_client("clientId"))
  WITH CHECK (app_can_access_client("clientId"));

ALTER TABLE "Shoot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Shoot" FORCE ROW LEVEL SECURITY;
CREATE POLICY client_scope ON "Shoot" FOR ALL
  USING (app_can_access_client("clientId"))
  WITH CHECK (app_can_access_client("clientId"));

ALTER TABLE "Attachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attachment" FORCE ROW LEVEL SECURITY;
CREATE POLICY client_scope ON "Attachment" FOR ALL
  USING (app_can_access_client("clientId"))
  WITH CHECK (app_can_access_client("clientId"));

ALTER TABLE "ExternalVisibility" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExternalVisibility" FORCE ROW LEVEL SECURITY;
CREATE POLICY client_scope ON "ExternalVisibility" FOR ALL
  USING (app_can_access_client("clientId"))
  WITH CHECK (app_can_access_client("clientId"));

-- "UserClientLink" fica deliberadamente fora: é a tabela que app_can_access_client
-- consulta, então uma policy nela recursaria sobre si mesma. Ela também alimenta
-- a coluna de equipe nas telas de cliente, que precisa enxergar todos os vínculos
-- do cliente já autorizado pelas policies acima.
