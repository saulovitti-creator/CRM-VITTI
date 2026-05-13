CREATE INDEX `idx_cfv_entity_type_id` ON `custom_field_values` (`entityType`,`entityId`);-->statement-breakpoint
CREATE INDEX `idx_opp_pipeline_status` ON `opportunities` (`pipelineId`,`status`);-->statement-breakpoint
CREATE INDEX `idx_opp_contact_id` ON `opportunities` (`contactId`);