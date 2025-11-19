CREATE TYPE "public"."punchEvent" AS ENUM('CheckIn', 'CheckOut', 'BreakStart', 'BreakEnd');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('Web', 'Mobile');--> statement-breakpoint
CREATE TYPE "public"."theme" AS ENUM('Light', 'Dark', 'System');--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"department_id" integer,
	"emp_type" "emp_type",
	"job_title" varchar(100),
	"date_of_joining" date,
	"probation_end" date,
	"phone_number" varchar(20),
	"address" text,
	"avatar_url" varchar(255),
	"is_deleted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "employees_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "attendance" RENAME COLUMN "attendance_id" TO "id";--> statement-breakpoint
ALTER TABLE "audit_logs" RENAME COLUMN "log_id" TO "id";--> statement-breakpoint
ALTER TABLE "geofence_locations" RENAME COLUMN "location_id" TO "id";--> statement-breakpoint
ALTER TABLE "holidays" RENAME COLUMN "holiday_id" TO "id";--> statement-breakpoint
ALTER TABLE "leave_applications" RENAME COLUMN "application_id" TO "id";--> statement-breakpoint
ALTER TABLE "leave_balances" RENAME COLUMN "balance_id" TO "id";--> statement-breakpoint
ALTER TABLE "leave_entitlement_rules" RENAME COLUMN "rule_id" TO "id";--> statement-breakpoint
ALTER TABLE "leave_types" RENAME COLUMN "leave_type_id" TO "id";--> statement-breakpoint
ALTER TABLE "notifications" RENAME COLUMN "notification_id" TO "id";--> statement-breakpoint
ALTER TABLE "reports" RENAME COLUMN "report_id" TO "id";--> statement-breakpoint
ALTER TABLE "system_settings" RENAME COLUMN "setting_id" TO "id";--> statement-breakpoint
ALTER TABLE "working_patterns" RENAME COLUMN "pattern_id" TO "id";--> statement-breakpoint
ALTER TABLE "attendance" DROP CONSTRAINT "attendance_modified_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "leave_applications" DROP CONSTRAINT "leave_applications_leave_type_id_leave_types_leave_type_id_fk";
--> statement-breakpoint
ALTER TABLE "leave_balances" DROP CONSTRAINT "leave_balances_leave_type_id_leave_types_leave_type_id_fk";
--> statement-breakpoint
ALTER TABLE "leave_entitlement_rules" DROP CONSTRAINT "leave_entitlement_rules_leave_type_id_leave_types_leave_type_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_related_leave_id_leave_applications_application_id_fk";
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_department_id_departments_id_fk";
--> statement-breakpoint
ALTER TABLE "leave_applications" ALTER COLUMN "half_day_session" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."half_day_session";--> statement-breakpoint
CREATE TYPE "public"."half_day_session" AS ENUM('Morning', 'Afternoon');--> statement-breakpoint
ALTER TABLE "leave_applications" ALTER COLUMN "half_day_session" SET DATA TYPE "public"."half_day_session" USING "half_day_session"::"public"."half_day_session";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'Employee'::text;--> statement-breakpoint
DROP TYPE "public"."role";--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('Manager', 'Employee');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'Employee'::"public"."role";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."role" USING "role"::"public"."role";--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "source" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "source" SET DATA TYPE "public"."source_type" USING "source"::text::"public"."source_type";--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "source" SET DEFAULT 'Mobile';--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "event_type" "punchEvent" NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "event_time" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "location_lat" numeric(10, 6);--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "location_lng" numeric(10, 6);--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "accuracy_meters" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "failedLoginAttempts" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "lockedUntil" timestamp;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_entitlement_rules" ADD CONSTRAINT "leave_entitlement_rules_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_leave_id_leave_applications_id_fk" FOREIGN KEY ("related_leave_id") REFERENCES "public"."leave_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN "attendance_date";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN "check_in_time";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN "check_out_time";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN "total_hours";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN "duration_status";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN "check_in_lat";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN "check_in_lng";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN "check_in_accuracy_meters";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN "check_out_lat";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN "check_out_lng";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN "check_out_accuracy_meters";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN "in_location_verified";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN "out_location_verified";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN "is_modified";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN "modified_by";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "department_id";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "emp_type";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "job_title";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "date_of_joining";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "probation_end";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "phone_number";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "address";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "avatar_url";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "is_deleted";--> statement-breakpoint
DROP TYPE "public"."attendance_status";--> statement-breakpoint
DROP TYPE "public"."source";