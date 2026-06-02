CREATE TABLE `watchlist` (
	`id` text PRIMARY KEY NOT NULL,
	`ticker` text NOT NULL,
	`name` text,
	`source` text,
	`added_at` integer NOT NULL
);
CREATE UNIQUE INDEX `watchlist_ticker_unique` ON `watchlist` (`ticker`);
