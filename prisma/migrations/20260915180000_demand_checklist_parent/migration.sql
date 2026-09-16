-- AlterTable: checklist multi-responsável via demandas filhas
ALTER TABLE "Demand" ADD COLUMN IF NOT EXISTS "parentDemandId" TEXT;
ALTER TABLE "Demand" ADD COLUMN IF NOT EXISTS "checklistOrder" INTEGER;
ALTER TABLE "Demand" ADD COLUMN IF NOT EXISTS "isChecklistItem" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Demand_parentDemandId_idx" ON "Demand"("parentDemandId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Demand_parentDemandId_fkey'
  ) THEN
    ALTER TABLE "Demand"
      ADD CONSTRAINT "Demand_parentDemandId_fkey"
      FOREIGN KEY ("parentDemandId") REFERENCES "Demand"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
