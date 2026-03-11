ALTER TABLE `todos` ADD `list_id` text;--> statement-breakpoint
ALTER TABLE `todos` DROP COLUMN `start_at`;--> statement-breakpoint
ALTER TABLE `todos` DROP COLUMN `end_at`;