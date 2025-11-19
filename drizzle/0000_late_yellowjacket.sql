CREATE TYPE "public"."attendance_status" AS ENUM('Present', 'Absent', 'Late', 'On Leave', 'Missing Punch');--> statement-breakpoint
CREATE TYPE "public"."duration_status" AS ENUM('FullDay', 'HalfDay', 'EarlyExit', 'LateEntry', 'Overtime');--> statement-breakpoint
CREATE TYPE "public"."emp_type" AS ENUM('Permanent', 'Probation', 'Intern');--> statement-breakpoint
CREATE TYPE "public"."half_day_session" AS ENUM('AM', 'PM');--> statement-breakpoint
CREATE TYPE "public"."leave_status" AS ENUM('Pending', 'Approved', 'Rejected', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('LeaveStatus', 'MedicalReminder', 'SystemAlert', 'General');--> statement-breakpoint
CREATE TYPE "public"."report_type" AS ENUM('MonthlyAttendance', 'MonthlyLeave', 'LeaveBalance', 'LateInEarlyOut', 'Absenteeism');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('Employee', 'Manager');--> statement-breakpoint
CREATE TYPE "public"."source" AS ENUM('Mobile', 'Web');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('Active', 'Inactive');--> statement-breakpoint
CREATE TYPE "public"."system_category" AS ENUM('General', 'WorkingHours', 'LeavePolicy', 'Theme');--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"dept_name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "departments_dept_name_unique" UNIQUE("dept_name")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"age" integer,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"attendance_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"attendance_date" date NOT NULL,
	"check_in_time" timestamp,
	"check_out_time" timestamp,
	"total_hours" numeric(5, 2),
	"status" "attendance_status",
	"duration_status" "duration_status",
	"check_in_lat" numeric(10, 6),
	"check_in_lng" numeric(10, 6),
	"check_in_accuracy_meters" integer,
	"check_out_lat" numeric(10, 6),
	"check_out_lng" numeric(10, 6),
	"check_out_accuracy_meters" integer,
	"in_location_verified" boolean DEFAULT false,
	"out_location_verified" boolean DEFAULT false,
	"source" "source" DEFAULT 'Mobile',
	"notes" text,
	"is_modified" boolean DEFAULT false,
	"modified_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"log_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"action_type" varchar(50),
	"action" varchar(100),
	"target_table" varchar(100),
	"target_id" integer,
	"details" text,
	"is_user_visible" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "geofence_locations" (
	"location_id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"latitude" numeric(10, 6) NOT NULL,
	"longitude" numeric(10, 6) NOT NULL,
	"radius_meters" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "holidays" (
	"holiday_id" serial PRIMARY KEY NOT NULL,
	"holiday_name" varchar(100) NOT NULL,
	"holiday_date" date NOT NULL,
	"is_recurring" boolean DEFAULT false,
	"type" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leave_applications" (
	"application_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"leave_type_id" integer,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"half_day" boolean DEFAULT false,
	"half_day_session" "half_day_session",
	"reason" text,
	"doc_img" varchar(255),
	"status" "leave_status" DEFAULT 'Pending',
	"manager_remark" text,
	"application_date" timestamp DEFAULT now(),
	"approval_date" timestamp,
	"cancelled_by" integer,
	"cancelled_date" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "leave_balances" (
	"balance_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"leave_type_id" integer,
	"year" integer NOT NULL,
	"initial_carry_forward" integer DEFAULT 0,
	"total_entitlement" integer NOT NULL,
	"days_taken" numeric(5, 2) DEFAULT '0',
	"remaining_balance" numeric(5, 2),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leave_entitlement_rules" (
	"rule_id" serial PRIMARY KEY NOT NULL,
	"leave_type_id" integer,
	"emp_type" "emp_type",
	"min_years_of_service" integer DEFAULT 0,
	"max_years_of_service" integer DEFAULT 999,
	"entitlement_days" integer NOT NULL,
	"effective_from" date,
	"effective_to" date,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leave_types" (
	"leave_type_id" serial PRIMARY KEY NOT NULL,
	"type_name" varchar(50) NOT NULL,
	"is_paid" boolean DEFAULT true,
	"max_days_per_year" integer,
	"is_carry_forward" boolean DEFAULT false,
	"carry_forward_days" integer DEFAULT 0,
	"requires_doc" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"notification_id" serial PRIMARY KEY NOT NULL,
	"recipient_id" integer,
	"title" varchar(100),
	"message" text,
	"type" "notification_type",
	"related_leave_id" integer,
	"trigger_date" timestamp,
	"sent_at" timestamp,
	"sent_in_app" boolean DEFAULT false,
	"sent_email" boolean DEFAULT false,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"report_id" serial PRIMARY KEY NOT NULL,
	"manager_id" integer,
	"report_type" "report_type" NOT NULL,
	"parameters" json,
	"file_path" varchar(255),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"setting_id" serial PRIMARY KEY NOT NULL,
	"category" "system_category",
	"key_name" varchar(100) NOT NULL,
	"value" varchar(255),
	"description" text,
	"time_zone" varchar(50) DEFAULT 'Asia/Kuala_Lumpur',
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "system_settings_key_name_unique" UNIQUE("key_name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(100) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"must_change_password" boolean DEFAULT true,
	"role" "role" DEFAULT 'Employee' NOT NULL,
	"status" "status" DEFAULT 'Active',
	"department_id" integer,
	"emp_type" "emp_type",
	"job_title" varchar(100),
	"date_of_joining" date,
	"probation_end" date,
	"phone_number" varchar(20),
	"address" text,
	"avatar_url" varchar(255),
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	"is_deleted" boolean DEFAULT false,
	"reset_token" varchar(255),
	"reset_token_expires_at" timestamp,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "working_patterns" (
	"pattern_id" serial PRIMARY KEY NOT NULL,
	"job_title" varchar(100),
	"work_days" json,
	"week_pattern" varchar(20),
	"start_time" time,
	"end_time" time,
	"effective_from" date DEFAULT now(),
	"effective_to" date
);
--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_modified_by_users_id_fk" FOREIGN KEY ("modified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_leave_type_id_leave_types_leave_type_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("leave_type_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_leave_type_id_leave_types_leave_type_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("leave_type_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_entitlement_rules" ADD CONSTRAINT "leave_entitlement_rules_leave_type_id_leave_types_leave_type_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("leave_type_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_leave_id_leave_applications_application_id_fk" FOREIGN KEY ("related_leave_id") REFERENCES "public"."leave_applications"("application_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;