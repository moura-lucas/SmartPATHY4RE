/*
  Warnings:

  - You are about to drop the column `doDimension` on the `Persona` table. All the data in the column will be lost.
  - You are about to drop the column `feelThinkBelieve` on the `Persona` table. All the data in the column will be lost.
  - You are about to drop the column `needs` on the `Persona` table. All the data in the column will be lost.
  - You are about to drop the column `techExperience` on the `Persona` table. All the data in the column will be lost.
  - You are about to alter the column `problems` on the `Persona` table. The data in that column could be lost. The data in that column will be cast from `Text` to `Json`.
  - You are about to alter the column `existingSolutions` on the `Persona` table. The data in that column could be lost. The data in that column will be cast from `Text` to `Json`.
  - Added the required column `age` to the `Persona` table without a default value. This is not possible if the table is not empty.
  - Added the required column `context` to the `Persona` table without a default value. This is not possible if the table is not empty.
  - Added the required column `experienceWithTechnology` to the `Persona` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Persona` table without a default value. This is not possible if the table is not empty.
  - Added the required column `techExperienceLevel` to the `Persona` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Persona` table without a default value. This is not possible if the table is not empty.
  - Added the required column `who` to the `Persona` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Persona` DROP COLUMN `doDimension`,
    DROP COLUMN `feelThinkBelieve`,
    DROP COLUMN `needs`,
    DROP COLUMN `techExperience`,
    ADD COLUMN `age` INTEGER NOT NULL,
    ADD COLUMN `context` JSON NOT NULL,
    ADD COLUMN `experienceWithTechnology` JSON NOT NULL,
    ADD COLUMN `name` VARCHAR(80) NOT NULL,
    ADD COLUMN `techExperienceLevel` VARCHAR(16) NOT NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    ADD COLUMN `who` JSON NOT NULL,
    MODIFY `problems` JSON NOT NULL,
    MODIFY `existingSolutions` JSON NOT NULL;
