ALTER TABLE "system_settings" ALTER COLUMN "category" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."system_category";--> statement-breakpoint
CREATE TYPE "public"."system_category" AS ENUM('General', 'WorkingHours', 'Notifications', 'Theme');--> statement-breakpoint
ALTER TABLE "system_settings" ALTER COLUMN "category" SET DATA TYPE "public"."system_category" USING "category"::"public"."system_category";