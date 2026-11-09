-- AlterTable
ALTER TABLE `User` ADD COLUMN `geminiKeyEncrypted` TEXT NULL,
    ADD COLUMN `geminiKeyLast4` VARCHAR(4) NULL;

-- CreateTable
CREATE TABLE `GenerationUsage` (
    `userId` VARCHAR(191) NOT NULL,
    `day` DATE NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`userId`, `day`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `GenerationUsage` ADD CONSTRAINT `GenerationUsage_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

