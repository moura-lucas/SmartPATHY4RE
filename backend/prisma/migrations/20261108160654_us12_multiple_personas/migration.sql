-- A project can now have several personas. The foreign key needs an index on
-- projectId before the unique one is dropped.
CREATE INDEX `Persona_projectId_idx` ON `Persona`(`projectId`);
DROP INDEX `Persona_projectId_key` ON `Persona`;

-- Requirements now belong to a persona. Until this migration each project had
-- at most one, so every existing requirement belongs to that one.
ALTER TABLE `Requirement` ADD COLUMN `personaId` VARCHAR(191) NULL;
UPDATE `Requirement` r
  INNER JOIN `Persona` p ON p.`projectId` = r.`projectId`
  SET r.`personaId` = p.`id`;
ALTER TABLE `Requirement` MODIFY `personaId` VARCHAR(191) NOT NULL;

-- Same order: the projectId foreign key depends on the old unique index.
CREATE INDEX `Requirement_projectId_idx` ON `Requirement`(`projectId`);
DROP INDEX `Requirement_projectId_code_key` ON `Requirement`;
CREATE UNIQUE INDEX `Requirement_personaId_code_key` ON `Requirement`(`personaId`, `code`);

ALTER TABLE `Requirement` ADD CONSTRAINT `Requirement_personaId_fkey`
  FOREIGN KEY (`personaId`) REFERENCES `Persona`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
