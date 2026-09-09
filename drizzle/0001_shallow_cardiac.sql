CREATE TABLE `cop_ai_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cop_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`until_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cop_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`target_id` text,
	`timestamp` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `cop_tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `cop_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `cop_audit_tenant` ON `cop_audit` (`tenant_id`,`timestamp`);--> statement-breakpoint
CREATE TABLE `cop_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `cop_tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cop_categories_tenant_id_name_unique` ON `cop_categories` (`tenant_id`,`name`);--> statement-breakpoint
CREATE TABLE `cop_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`document_id` text NOT NULL,
	`section` text NOT NULL,
	`content` text NOT NULL,
	`embedding` text,
	FOREIGN KEY (`tenant_id`) REFERENCES `cop_tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`document_id`) REFERENCES `cop_documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `cop_chunks_document` ON `cop_chunks` (`tenant_id`,`document_id`);--> statement-breakpoint
CREATE TABLE `cop_clients` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `cop_tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`company_id`) REFERENCES `cop_companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cop_companies` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`industry` text NOT NULL,
	`location` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `cop_tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cop_consultants` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`specialty` text NOT NULL,
	`languages` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `cop_tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `cop_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cop_consultants_user_id_unique` ON `cop_consultants` (`user_id`);--> statement-breakpoint
CREATE TABLE `cop_consultations` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`client_id` text NOT NULL,
	`company_id` text NOT NULL,
	`consultant_id` text NOT NULL,
	`status` text NOT NULL,
	`start` text NOT NULL,
	`data` text NOT NULL,
	`simulation_cursor` integer DEFAULT 0 NOT NULL,
	`simulation_lease` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `cop_tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `cop_clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`company_id`) REFERENCES `cop_companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`consultant_id`) REFERENCES `cop_consultants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `cop_consultations_access` ON `cop_consultations` (`tenant_id`,`consultant_id`,`status`,`start`);--> statement-breakpoint
CREATE TABLE `cop_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`category` text NOT NULL,
	`status` text NOT NULL,
	`updated` text NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `cop_tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `cop_documents_search` ON `cop_documents` (`tenant_id`,`status`,`category`);--> statement-breakpoint
CREATE TABLE `cop_events` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`consultation_id` text NOT NULL,
	`type` text NOT NULL,
	`data` text NOT NULL,
	`timestamp` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `cop_tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`consultation_id`) REFERENCES `cop_consultations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `cop_events_replay` ON `cop_events` (`consultation_id`,`seq`);--> statement-breakpoint
CREATE TABLE `cop_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`suggestion_id` text NOT NULL,
	`consultation_id` text NOT NULL,
	`user_id` text NOT NULL,
	`value` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `cop_tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`suggestion_id`) REFERENCES `cop_suggestions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`consultation_id`) REFERENCES `cop_consultations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `cop_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cop_feedback_suggestion_id_user_id_unique` ON `cop_feedback` (`suggestion_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `cop_feedback_tenant` ON `cop_feedback` (`tenant_id`,`value`);--> statement-breakpoint
CREATE TABLE `cop_followups` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`consultation_id` text NOT NULL,
	`text` text NOT NULL,
	`status` text NOT NULL,
	`due` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `cop_tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`consultation_id`) REFERENCES `cop_consultations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cop_notes` (
	`consultation_id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`text` text NOT NULL,
	`updated` text NOT NULL,
	FOREIGN KEY (`consultation_id`) REFERENCES `cop_consultations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`) REFERENCES `cop_tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `cop_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cop_profiles` (
	`consultation_id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`consultation_id`) REFERENCES `cop_consultations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`) REFERENCES `cop_tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cop_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`consultation_id` text NOT NULL,
	`consultant_id` text NOT NULL,
	`start` text NOT NULL,
	`end_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `cop_tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`consultation_id`) REFERENCES `cop_consultations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`consultant_id`) REFERENCES `cop_consultants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cop_schedules_consultation_id_unique` ON `cop_schedules` (`consultation_id`);--> statement-breakpoint
CREATE TABLE `cop_segments` (
	`id` text PRIMARY KEY NOT NULL,
	`consultation_id` text NOT NULL,
	`tenant_id` text NOT NULL,
	`external_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`consultation_id`) REFERENCES `cop_consultations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`) REFERENCES `cop_tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cop_segments_consultation_id_external_id_unique` ON `cop_segments` (`consultation_id`,`external_id`);--> statement-breakpoint
CREATE INDEX `cop_segments_order` ON `cop_segments` (`consultation_id`,`sequence`);--> statement-breakpoint
CREATE TABLE `cop_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL,
	`last_seen` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `cop_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `cop_sessions_user` ON `cop_sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `cop_suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`consultation_id` text NOT NULL,
	`tenant_id` text NOT NULL,
	`cache_key` text NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`consultation_id`) REFERENCES `cop_consultations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`) REFERENCES `cop_tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `cop_suggestions_consultation` ON `cop_suggestions` (`consultation_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `cop_suggestions_cache` ON `cop_suggestions` (`tenant_id`,`consultation_id`,`cache_key`);--> statement-breakpoint
CREATE TABLE `cop_tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cop_transcripts` (
	`id` text PRIMARY KEY NOT NULL,
	`consultation_id` text NOT NULL,
	`tenant_id` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`consultation_id`) REFERENCES `cop_consultations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`) REFERENCES `cop_tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cop_transcripts_consultation_id_unique` ON `cop_transcripts` (`consultation_id`);--> statement-breakpoint
CREATE TABLE `cop_users` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`settings` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `cop_tenants`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "cop_users_role_check" CHECK(role IN ('Admin','Consultant','Supervisor'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cop_users_email_unique` ON `cop_users` (`email`);