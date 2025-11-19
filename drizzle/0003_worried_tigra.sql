ALTER TABLE "holidays" RENAME COLUMN "holiday_date" TO "start_date";--> statement-breakpoint
ALTER TABLE "holidays" ADD COLUMN "end_date" date;--> statement-breakpoint
-->ALTER TABLE "users" ADD COLUMN "name" text;