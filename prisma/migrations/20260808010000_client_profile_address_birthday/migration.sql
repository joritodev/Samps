-- AlterTable
ALTER TABLE "User" ADD COLUMN "birthDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Client" ADD COLUMN "birthDate" TIMESTAMP(3),
ADD COLUMN "addressZip" TEXT,
ADD COLUMN "addressStreet" TEXT,
ADD COLUMN "addressNumber" TEXT,
ADD COLUMN "addressComplement" TEXT,
ADD COLUMN "addressDistrict" TEXT,
ADD COLUMN "addressCity" TEXT,
ADD COLUMN "addressState" TEXT,
ADD COLUMN "contractDocUrl" TEXT,
ADD COLUMN "studyDocUrl" TEXT;
