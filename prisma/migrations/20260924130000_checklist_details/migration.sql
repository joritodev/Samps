-- Checklist ganha descrição e prioridade opcionais.
ALTER TABLE "Checklist" ADD COLUMN "description" TEXT;
ALTER TABLE "Checklist" ADD COLUMN "priorityId" TEXT;

CREATE INDEX "Checklist_priorityId_idx" ON "Checklist"("priorityId");

ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_priorityId_fkey"
  FOREIGN KEY ("priorityId") REFERENCES "PriorityLevel"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
