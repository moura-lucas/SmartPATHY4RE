-- AlterTable
ALTER TABLE `Requirement` ADD COLUMN `code` VARCHAR(16) NOT NULL,
    ADD COLUMN `derivedFrom` JSON NOT NULL,
    ADD COLUMN `moscow` VARCHAR(8) NOT NULL,
    ADD COLUMN `position` INTEGER NOT NULL,
    MODIFY `type` VARCHAR(16) NOT NULL,
    MODIFY `priority` VARCHAR(8) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Requirement_projectId_code_key` ON `Requirement`(`projectId`, `code`);
