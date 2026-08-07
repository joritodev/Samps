-- CreateEnum
CREATE TYPE "AbsenceKind" AS ENUM ('DAY_OFF', 'VACATION', 'OFFLINE', 'SICK_LEAVE');

-- CreateTable
CREATE TABLE "Absence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "AbsenceKind" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Absence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Absence_userId_startsAt_idx" ON "Absence"("userId", "startsAt");

-- CreateIndex
CREATE INDEX "Absence_startsAt_endsAt_idx" ON "Absence"("startsAt", "endsAt");

-- AddForeignKey
ALTER TABLE "Absence" ADD CONSTRAINT "Absence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
