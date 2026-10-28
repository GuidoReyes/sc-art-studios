-- AlterTable
ALTER TABLE `CostSettings` ADD COLUMN `usImportDutyReviewedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- Las versiones que ya existen se tomaron como revisadas cuando se guardaron, no hoy.
UPDATE `CostSettings` SET `usImportDutyReviewedAt` = `updatedAt`;
