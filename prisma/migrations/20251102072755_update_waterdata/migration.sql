/*
  Warnings:

  - You are about to alter the column `distance_cm` on the `waterdata` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Double`.
  - You are about to alter the column `level_cm` on the `waterdata` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Double`.
  - You are about to alter the column `percent` on the `waterdata` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Double`.

*/
-- AlterTable
ALTER TABLE `waterdata` MODIFY `distance_cm` DOUBLE NOT NULL,
    MODIFY `level_cm` DOUBLE NOT NULL,
    MODIFY `percent` DOUBLE NOT NULL,
    MODIFY `ts` VARCHAR(191) NULL;
