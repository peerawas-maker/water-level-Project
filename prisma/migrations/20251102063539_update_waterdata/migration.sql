/*
  Warnings:

  - You are about to drop the `airdata` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `airdata`;

-- CreateTable
CREATE TABLE `waterdata` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `water` INTEGER NOT NULL,
    `createat` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
