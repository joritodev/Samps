-- AlterTable
ALTER TABLE "ContentType" ADD COLUMN "requiresDuration" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ContentType" ADD COLUMN "requiresFormat" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ContentType" ADD COLUMN "requiresCaption" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ContentType" ADD COLUMN "requiresReference" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ContentType" ADD COLUMN "requiresRawDelivery" BOOLEAN NOT NULL DEFAULT false;
