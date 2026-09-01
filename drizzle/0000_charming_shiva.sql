CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`icon` text DEFAULT 'circle-dashed' NOT NULL,
	`color` text DEFAULT 'slate' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`archived_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE `currencies` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`symbol` text NOT NULL,
	`decimals` integer DEFAULT 2 NOT NULL,
	`locale` text DEFAULT 'en-US' NOT NULL,
	`allow_decimals` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "currencies_code_is_iso4217" CHECK(length("currencies"."code") = 3),
	CONSTRAINT "currencies_decimals_in_range" CHECK("currencies"."decimals" >= 0 AND "currencies"."decimals" <= 4),
	CONSTRAINT "currencies_decimals_consistent" CHECK("currencies"."allow_decimals" = 0 OR "currencies"."decimals" > 0)
);
--> statement-breakpoint
CREATE TABLE `expense_splits` (
	`id` text PRIMARY KEY NOT NULL,
	`expense_id` text NOT NULL,
	`member_id` text NOT NULL,
	`share_pct` integer NOT NULL,
	`share_minor` integer NOT NULL,
	FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `group_members`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "expense_splits_pct_in_range" CHECK("expense_splits"."share_pct" >= 0 AND "expense_splits"."share_pct" <= 100),
	CONSTRAINT "expense_splits_minor_non_negative" CHECK("expense_splits"."share_minor" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `expense_splits_expense_member_unique` ON `expense_splits` (`expense_id`,`member_id`);--> statement-breakpoint
CREATE INDEX `expense_splits_member_idx` ON `expense_splits` (`member_id`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`payer_member_id` text NOT NULL,
	`category_id` text,
	`description` text NOT NULL,
	`notes` text,
	`total_minor` integer NOT NULL,
	`expense_date` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`payer_member_id`,`group_id`) REFERENCES `group_members`(`id`,`group_id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "expenses_total_minor_positive" CHECK("expenses"."total_minor" > 0),
	CONSTRAINT "expenses_date_is_iso" CHECK("expenses"."expense_date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
--> statement-breakpoint
CREATE INDEX `expenses_group_date_idx` ON `expenses` (`group_id`,`expense_date`);--> statement-breakpoint
CREATE INDEX `expenses_payer_idx` ON `expenses` (`payer_member_id`);--> statement-breakpoint
CREATE INDEX `expenses_category_idx` ON `expenses` (`category_id`);--> statement-breakpoint
CREATE TABLE `group_members` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`person_id` text NOT NULL,
	`joined_at` integer DEFAULT (unixepoch()) NOT NULL,
	`removed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `group_members_group_person_unique` ON `group_members` (`group_id`,`person_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `group_members_id_group_unique` ON `group_members` (`id`,`group_id`);--> statement-breakpoint
CREATE INDEX `group_members_person_idx` ON `group_members` (`person_id`);--> statement-breakpoint
CREATE TABLE `groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`currency_code` text NOT NULL,
	`archived_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`currency_code`) REFERENCES `currencies`(`code`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`is_self` integer DEFAULT false NOT NULL,
	`avatar_color` text,
	`archived_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `people_name_unique` ON `people` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `people_single_self_unique` ON `people` (`is_self`) WHERE "people"."is_self" = 1;--> statement-breakpoint
CREATE TABLE `settlements` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`from_member_id` text NOT NULL,
	`to_member_id` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`settled_date` text NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_member_id`,`group_id`) REFERENCES `group_members`(`id`,`group_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`to_member_id`,`group_id`) REFERENCES `group_members`(`id`,`group_id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "settlements_amount_minor_positive" CHECK("settlements"."amount_minor" > 0),
	CONSTRAINT "settlements_distinct_parties" CHECK("settlements"."from_member_id" <> "settlements"."to_member_id"),
	CONSTRAINT "settlements_date_is_iso" CHECK("settlements"."settled_date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
--> statement-breakpoint
CREATE INDEX `settlements_group_date_idx` ON `settlements` (`group_id`,`settled_date`);