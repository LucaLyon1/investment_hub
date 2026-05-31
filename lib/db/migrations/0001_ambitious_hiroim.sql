CREATE TABLE `rss_feeds` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
