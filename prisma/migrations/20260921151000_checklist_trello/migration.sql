-- CreateTable
CREATE TABLE "Checklist" (
    "id" TEXT NOT NULL,
    "demandId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Checklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "assigneeId" TEXT,
    "dueDate" TIMESTAMP(3),
    "linkedDemandId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Checklist_demandId_idx" ON "Checklist"("demandId");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistItem_linkedDemandId_key" ON "ChecklistItem"("linkedDemandId");

-- CreateIndex
CREATE INDEX "ChecklistItem_checklistId_idx" ON "ChecklistItem"("checklistId");

-- CreateIndex
CREATE INDEX "ChecklistItem_assigneeId_idx" ON "ChecklistItem"("assigneeId");

-- AddForeignKey
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_demandId_fkey" FOREIGN KEY ("demandId") REFERENCES "Demand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_linkedDemandId_fkey" FOREIGN KEY ("linkedDemandId") REFERENCES "Demand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Um Checklist "Checklist" por pai que já tem filhos isChecklistItem
INSERT INTO "Checklist" ("id", "demandId", "title", "sortOrder", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text),
  d."parentDemandId",
  'Checklist',
  0,
  NOW(),
  NOW()
FROM "Demand" d
WHERE d."isChecklistItem" = true
  AND d."parentDemandId" IS NOT NULL
GROUP BY d."parentDemandId";

INSERT INTO "ChecklistItem" (
  "id", "checklistId", "title", "isDone", "sortOrder",
  "assigneeId", "dueDate", "linkedDemandId", "createdAt", "updatedAt"
)
SELECT
  md5(random()::text || clock_timestamp()::text || d.id),
  c.id,
  d.title,
  d.status IN ('DONE', 'PUBLISHED', 'DELIVERED'),
  COALESCE(d."checklistOrder", 0),
  d."assigneeId",
  d."dueDate",
  d.id,
  NOW(),
  NOW()
FROM "Demand" d
JOIN "Checklist" c ON c."demandId" = d."parentDemandId" AND c.title = 'Checklist'
WHERE d."isChecklistItem" = true
  AND d."parentDemandId" IS NOT NULL;
