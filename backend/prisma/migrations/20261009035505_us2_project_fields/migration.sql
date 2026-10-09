/*
  Warnings:

  - You are about to drop the column `notes` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `targetProfile` on the `Project` table. All the data in the column will be lost.
  - You are about to alter the column `name` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(120)`.
  - You are about to alter the column `techExperienceLevel` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(16)`.
  - Added the required column `domain` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Project` DROP COLUMN `notes`,
    DROP COLUMN `targetProfile`,
    ADD COLUMN `additionalContext` TEXT NULL,
    ADD COLUMN `domain` VARCHAR(80) NOT NULL,
    ADD COLUMN `personaAge` INTEGER NULL,
    ADD COLUMN `personaName` VARCHAR(80) NULL,
    MODIFY `name` VARCHAR(120) NOT NULL,
    MODIFY `description` TEXT NOT NULL,
    MODIFY `techExperienceLevel` VARCHAR(16) NOT NULL;
