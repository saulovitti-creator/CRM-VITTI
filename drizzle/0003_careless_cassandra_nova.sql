CREATE TABLE `contact_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contactId` int NOT NULL,
	`tagId` int NOT NULL,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `contact_tags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`company` varchar(255),
	`phone` varchar(50),
	`email` varchar(255),
	`city` varchar(255),
	`site` varchar(255),
	`segment` varchar(255),
	`source` varchar(100),
	`notes` text,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `custom_field_definitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`fieldType` varchar(50) NOT NULL,
	`model` varchar(50) NOT NULL DEFAULT 'lead',
	`groupName` varchar(100),
	`placeholder` varchar(255),
	`options` text,
	`isRequired` boolean DEFAULT false,
	`displayOrder` int NOT NULL DEFAULT 0,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `custom_field_definitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `custom_field_values` (
	`id` int AUTO_INCREMENT NOT NULL,
	`definitionId` int NOT NULL,
	`entityId` int NOT NULL,
	`entityType` varchar(50) NOT NULL DEFAULT 'lead',
	`value` text,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custom_field_values_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `opportunities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contactId` int NOT NULL,
	`pipelineId` int NOT NULL,
	`stageId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`monetaryValue` decimal(10,2),
	`status` varchar(20) NOT NULL DEFAULT 'open',
	`segment` varchar(255),
	`source` varchar(100),
	`notes` text,
	`wonAt` datetime,
	`lostAt` datetime,
	`lostReason` text,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `opportunities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `opportunity_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`opportunityId` int NOT NULL,
	`content` text NOT NULL,
	`noteType` varchar(20) NOT NULL DEFAULT 'user',
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `opportunity_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `opportunity_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`opportunityId` int NOT NULL,
	`title` varchar(120) NOT NULL,
	`description` text,
	`dueDate` datetime NOT NULL,
	`priority` varchar(10) NOT NULL DEFAULT 'media',
	`completedAt` datetime,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `opportunity_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pipeline_stages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pipelineId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`color` varchar(50),
	`displayOrder` int NOT NULL DEFAULT 0,
	`isFinal` boolean DEFAULT false,
	`finalType` varchar(20),
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `pipeline_stages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pipelines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`isDefault` boolean DEFAULT false,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pipelines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `contact_tags` ADD CONSTRAINT `contact_tags_contactId_contacts_id_fk` FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contact_tags` ADD CONSTRAINT `contact_tags_tagId_tags_id_fk` FOREIGN KEY (`tagId`) REFERENCES `tags`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custom_field_values` ADD CONSTRAINT `custom_field_values_definitionId_custom_field_definitions_id_fk` FOREIGN KEY (`definitionId`) REFERENCES `custom_field_definitions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `opportunities` ADD CONSTRAINT `opportunities_contactId_contacts_id_fk` FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `opportunities` ADD CONSTRAINT `opportunities_pipelineId_pipelines_id_fk` FOREIGN KEY (`pipelineId`) REFERENCES `pipelines`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `opportunities` ADD CONSTRAINT `opportunities_stageId_pipeline_stages_id_fk` FOREIGN KEY (`stageId`) REFERENCES `pipeline_stages`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `opportunity_notes` ADD CONSTRAINT `opportunity_notes_opportunityId_opportunities_id_fk` FOREIGN KEY (`opportunityId`) REFERENCES `opportunities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `opportunity_tasks` ADD CONSTRAINT `opportunity_tasks_opportunityId_opportunities_id_fk` FOREIGN KEY (`opportunityId`) REFERENCES `opportunities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pipeline_stages` ADD CONSTRAINT `pipeline_stages_pipelineId_pipelines_id_fk` FOREIGN KEY (`pipelineId`) REFERENCES `pipelines`(`id`) ON DELETE no action ON UPDATE no action;