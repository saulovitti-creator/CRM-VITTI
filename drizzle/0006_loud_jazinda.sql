CREATE TABLE `account_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','seller','viewer') NOT NULL DEFAULT 'seller',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `account_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_account_members_account_user` UNIQUE(`accountId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('agency','client') NOT NULL DEFAULT 'client',
	`parentAccountId` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
INSERT INTO `accounts` (`id`, `name`, `type`, `parentAccountId`, `isActive`)
VALUES (1, 'Vitti Soluções', 'agency', NULL, true)
ON DUPLICATE KEY UPDATE
	`name` = VALUES(`name`),
	`type` = VALUES(`type`),
	`parentAccountId` = VALUES(`parentAccountId`),
	`isActive` = VALUES(`isActive`);
--> statement-breakpoint
ALTER TABLE `tags` DROP INDEX `tags_name_unique`;--> statement-breakpoint
ALTER TABLE `contacts` ADD `accountId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `custom_field_definitions` ADD `accountId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `accountId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `pipeline_stages` ADD `accountId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `pipelines` ADD `accountId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `tags` ADD `accountId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `tags` ADD CONSTRAINT `uq_tags_name_account` UNIQUE(`name`,`accountId`);--> statement-breakpoint
ALTER TABLE `account_members` ADD CONSTRAINT `account_members_accountId_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `account_members` ADD CONSTRAINT `account_members_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_parentAccountId_accounts_id_fk` FOREIGN KEY (`parentAccountId`) REFERENCES `accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
INSERT INTO `account_members` (`accountId`, `userId`, `role`, `isActive`)
SELECT 1, `id`, 'owner', true
FROM `users`
WHERE `role` = 'admin'
ORDER BY `id`
LIMIT 1
ON DUPLICATE KEY UPDATE
	`role` = VALUES(`role`),
	`isActive` = VALUES(`isActive`);
--> statement-breakpoint
CREATE INDEX `idx_am_user_id` ON `account_members` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_am_account_id` ON `account_members` (`accountId`);--> statement-breakpoint
CREATE INDEX `idx_accounts_parent_id` ON `accounts` (`parentAccountId`);--> statement-breakpoint
CREATE INDEX `idx_accounts_type` ON `accounts` (`type`);--> statement-breakpoint
CREATE INDEX `idx_accounts_is_active` ON `accounts` (`isActive`);--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_accountId_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custom_field_definitions` ADD CONSTRAINT `custom_field_definitions_accountId_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `opportunities` ADD CONSTRAINT `opportunities_accountId_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pipeline_stages` ADD CONSTRAINT `pipeline_stages_accountId_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pipelines` ADD CONSTRAINT `pipelines_accountId_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tags` ADD CONSTRAINT `tags_accountId_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_contacts_account_id` ON `contacts` (`accountId`);--> statement-breakpoint
CREATE INDEX `idx_contacts_account_created` ON `contacts` (`accountId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_cfd_account_id` ON `custom_field_definitions` (`accountId`);--> statement-breakpoint
CREATE INDEX `idx_opp_account_id` ON `opportunities` (`accountId`);--> statement-breakpoint
CREATE INDEX `idx_opp_account_status` ON `opportunities` (`accountId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_opp_account_pipeline` ON `opportunities` (`accountId`,`pipelineId`);--> statement-breakpoint
CREATE INDEX `idx_opp_account_stage` ON `opportunities` (`accountId`,`stageId`);--> statement-breakpoint
CREATE INDEX `idx_opp_account_created` ON `opportunities` (`accountId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_opp_account_won` ON `opportunities` (`accountId`,`wonAt`);--> statement-breakpoint
CREATE INDEX `idx_opp_account_lost` ON `opportunities` (`accountId`,`lostAt`);--> statement-breakpoint
CREATE INDEX `idx_stages_account_id` ON `pipeline_stages` (`accountId`);--> statement-breakpoint
CREATE INDEX `idx_stages_account_pipeline` ON `pipeline_stages` (`accountId`,`pipelineId`);--> statement-breakpoint
CREATE INDEX `idx_pipelines_account_id` ON `pipelines` (`accountId`);--> statement-breakpoint
CREATE INDEX `idx_tags_account_id` ON `tags` (`accountId`);
