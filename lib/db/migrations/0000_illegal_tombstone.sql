CREATE TABLE `ai_ideas` (
	`id` text PRIMARY KEY NOT NULL,
	`ticker` text,
	`asset_class` text,
	`signal_type` text NOT NULL,
	`risk_level` text NOT NULL,
	`title` text NOT NULL,
	`reasoning` text NOT NULL,
	`sources` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`generated_at` integer NOT NULL,
	`acted_at` integer
);
--> statement-breakpoint
CREATE TABLE `notification_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`channel` text NOT NULL,
	`status` text NOT NULL,
	`error_message` text,
	`sent_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `portfolio_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`total_value` real NOT NULL,
	`total_cost` real NOT NULL,
	`total_pnl` real NOT NULL,
	`pnl_pct` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `positions` (
	`id` text PRIMARY KEY NOT NULL,
	`ticker` text NOT NULL,
	`name` text NOT NULL,
	`asset_class` text NOT NULL,
	`quantity` real NOT NULL,
	`avg_buy_price` real NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `price_cache` (
	`ticker` text PRIMARY KEY NOT NULL,
	`price` real NOT NULL,
	`change_1d` real,
	`change_pct_1d` real,
	`fetched_at` integer NOT NULL
);
