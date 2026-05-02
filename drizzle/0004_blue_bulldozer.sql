ALTER TABLE `kanban_columns` ADD `is_active_in_funnel` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `pipeline_stages` ADD `is_active_in_funnel` boolean DEFAULT true;