-- CreateEnum
CREATE TYPE "ReportKind" AS ENUM ('LEADER_DAILY', 'MANAGEMENT_WEEKLY');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "ReportDelivery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ReportKind" NOT NULL,
    "periodKey" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportDelivery_createdAt_idx" ON "ReportDelivery"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReportDelivery_userId_kind_periodKey_key" ON "ReportDelivery"("userId", "kind", "periodKey");

-- AddForeignKey
ALTER TABLE "ReportDelivery" ADD CONSTRAINT "ReportDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Operacional interno. Cliente externo não lê nem grava.
-- app_rls_active() = false → migrations, seed e scripts admin passam sem recorte.
ALTER TABLE "ReportDelivery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReportDelivery" FORCE ROW LEVEL SECURITY;
CREATE POLICY internal_only ON "ReportDelivery" FOR ALL
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
