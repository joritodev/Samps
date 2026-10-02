-- CreateTable
CREATE TABLE "ReportSeen" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportSeen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReportSeen_userId_day_key" ON "ReportSeen"("userId", "day");

-- AddForeignKey
ALTER TABLE "ReportSeen" ADD CONSTRAINT "ReportSeen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Dado pessoal: a pessoa só vê e grava as próprias linhas.
-- app_rls_active() = false → migrations, seed e scripts admin passam sem recorte.
ALTER TABLE "ReportSeen" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReportSeen" FORCE ROW LEVEL SECURITY;
CREATE POLICY own_rows ON "ReportSeen" FOR ALL
  USING (NOT app_rls_active() OR "userId" = app_current_user_id())
  WITH CHECK (NOT app_rls_active() OR "userId" = app_current_user_id());
