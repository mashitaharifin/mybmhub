ALTER TABLE "punch" ALTER COLUMN "event_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."punchEvent";--> statement-breakpoint
CREATE TYPE "public"."punchEvent" AS ENUM('CheckIn', 'CheckOut');--> statement-breakpoint
ALTER TABLE "punch" ALTER COLUMN "event_type" SET DATA TYPE "public"."punchEvent" USING "event_type"::"public"."punchEvent";--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "report_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."report_type";--> statement-breakpoint
CREATE TYPE "public"."report_type" AS ENUM('MonthlyAttendance', 'MonthlyLeave', 'LeaveBalance');--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "report_type" SET DATA TYPE "public"."report_type" USING "report_type"::"public"."report_type";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN "break_hours";