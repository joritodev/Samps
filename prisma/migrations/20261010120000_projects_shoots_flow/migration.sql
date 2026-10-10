-- Fluxo de projetos e captações: pedido fora do contrato, captação ligada a projeto,
-- material entregue ao concluir e demanda de edição ligada à captação. Só colunas novas
-- e opcionais; nada existente é alterado ou apagado. As policies client_scope de
-- Project, Shoot e Demand continuam valendo (nenhuma tabela nova).

ALTER TABLE "Project" ADD COLUMN "outsideContract" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Shoot" ADD COLUMN "projectId" TEXT;
ALTER TABLE "Shoot" ADD COLUMN "materialUrl" TEXT;
ALTER TABLE "Shoot" ADD COLUMN "completedAt" TIMESTAMP(3);

ALTER TABLE "Demand" ADD COLUMN "shootId" TEXT;

ALTER TABLE "Shoot" ADD CONSTRAINT "Shoot_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Demand" ADD CONSTRAINT "Demand_shootId_fkey"
  FOREIGN KEY ("shootId") REFERENCES "Shoot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Shoot_clientId_date_idx" ON "Shoot"("clientId", "date");
CREATE INDEX "Shoot_projectId_idx" ON "Shoot"("projectId");
CREATE INDEX "Demand_projectId_idx" ON "Demand"("projectId");
CREATE INDEX "Demand_shootId_idx" ON "Demand"("shootId");
