/*
  Warnings:

  - You are about to drop the column `parentReport` on the `SessionNote` table. All the data in the column will be lost.
  - You are about to drop the column `patientSession` on the `SessionNote` table. All the data in the column will be lost.

  Os dados já foram migrados para a nova coluna `content` pelo script
  prisma/migrate-note-content.ts antes desta migration ser aplicada.

*/
-- AlterTable
ALTER TABLE "SessionNote" DROP COLUMN "parentReport",
DROP COLUMN "patientSession";
