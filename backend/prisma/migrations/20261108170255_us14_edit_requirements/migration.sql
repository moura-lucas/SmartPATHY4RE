-- AlterTable
ALTER TABLE `Persona` ADD COLUMN `lastFunctionalNumber` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `lastNonFunctionalNumber` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `Requirement` ADD COLUMN `edited` BOOLEAN NOT NULL DEFAULT false;


-- AC14.4: start from the highest numbers in use today.
UPDATE `Persona` p SET
  `lastFunctionalNumber` = COALESCE((
    SELECT MAX(CAST(SUBSTRING(r.`code`, 3) AS UNSIGNED))
    FROM `Requirement` r WHERE r.`personaId` = p.`id` AND r.`type` = 'functional'
  ), 0),
  `lastNonFunctionalNumber` = COALESCE((
    SELECT MAX(CAST(SUBSTRING(r.`code`, 4) AS UNSIGNED))
    FROM `Requirement` r WHERE r.`personaId` = p.`id` AND r.`type` = 'non_functional'
  ), 0);
