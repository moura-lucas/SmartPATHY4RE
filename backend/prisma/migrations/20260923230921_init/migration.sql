-- CreateTable
CREATE TABLE `Project` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `targetProfile` VARCHAR(191) NOT NULL,
    `techExperienceLevel` VARCHAR(191) NOT NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Persona` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `doDimension` TEXT NOT NULL,
    `feelThinkBelieve` TEXT NOT NULL,
    `techExperience` TEXT NOT NULL,
    `problems` TEXT NOT NULL,
    `needs` TEXT NOT NULL,
    `existingSolutions` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Persona_projectId_key`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Requirement` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `priority` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Persona` ADD CONSTRAINT `Persona_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Requirement` ADD CONSTRAINT `Requirement_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
