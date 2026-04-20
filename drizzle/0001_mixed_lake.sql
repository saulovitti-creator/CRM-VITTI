CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`title` varchar(120) NOT NULL,
	`description` text,
	`dueDate` datetime NOT NULL,
	`priority` varchar(10) NOT NULL DEFAULT 'media',
	`completedAt` datetime,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `lead_notes` ADD `noteType` varchar(20) DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `lastContactAt` datetime;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_leadId_leads_id_fk` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE no action ON UPDATE no action;