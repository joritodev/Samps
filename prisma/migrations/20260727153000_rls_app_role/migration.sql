-- A role de conexão do Neon (`neondb_owner`) tem BYPASSRLS, então as policies
-- do passo anterior nunca chegavam a ser avaliadas. `app_user` existe só para
-- ser assumida via SET LOCAL ROLE dentro de uma transação com escopo: ela não
-- faz login e não tem bypass, então o RLS passa a valer de fato.
--
-- Migrations, seed e scripts continuam rodando como owner, sem recorte.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOLOGIN NOBYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Tabelas e sequences criadas por migrations futuras herdam os mesmos grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;

-- Permite que a role de conexão faça SET ROLE app_user.
GRANT app_user TO CURRENT_USER;
