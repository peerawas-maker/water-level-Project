-- CreateTable
CREATE TABLE `airdata` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `voltage` DOUBLE NOT NULL,
    `dust` DOUBLE NOT NULL,
    `ts` INTEGER NOT NULL,
    `createat` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
