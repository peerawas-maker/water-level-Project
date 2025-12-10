/*
  Warnings:

  - You are about to drop the column `water` on the `waterdata` table. All the data in the column will be lost.
  - Added the required column `distance_cm` to the `waterdata` table without a default value. This is not possible if the table is not empty.
  - Added the required column `level_cm` to the `waterdata` table without a default value. This is not possible if the table is not empty.
  - Added the required column `percent` to the `waterdata` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ts` to the `waterdata` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `waterdata` DROP COLUMN `water`,
    ADD COLUMN `distance_cm` INTEGER NOT NULL,
    ADD COLUMN `level_cm` INTEGER NOT NULL,
    ADD COLUMN `percent` INTEGER NOT NULL,
    ADD COLUMN `ts` DATETIME(3) NOT NULL;
