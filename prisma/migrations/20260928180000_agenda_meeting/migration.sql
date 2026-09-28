-- CreateEnum
CREATE TYPE "AgendaMeetingKind" AS ENUM ('MEETING', 'PODCAST', 'OTHER');

-- CreateTable
CREATE TABLE "AgendaMeeting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "meetingUrl" TEXT,
    "location" TEXT,
    "kind" "AgendaMeetingKind" NOT NULL DEFAULT 'MEETING',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgendaMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgendaMeeting_startsAt_idx" ON "AgendaMeeting"("startsAt");

-- CreateIndex
CREATE INDEX "AgendaMeeting_createdById_idx" ON "AgendaMeeting"("createdById");

-- AddForeignKey
ALTER TABLE "AgendaMeeting" ADD CONSTRAINT "AgendaMeeting_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Reunião interna da equipe. Cliente externo não lê nem grava.
-- app_rls_active() = false → migrations, seed e scripts admin passam sem recorte.
ALTER TABLE "AgendaMeeting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgendaMeeting" FORCE ROW LEVEL SECURITY;
CREATE POLICY internal_only ON "AgendaMeeting" FOR ALL
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
