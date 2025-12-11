CREATE TYPE "public"."attendance_status_enum" AS ENUM('present', 'absent', 'late', 'incomplete', 'complete', 'missing-punch');--> statement-breakpoint
ALTER TYPE "public"."source_type" ADD VALUE 'Auto-System';--> statement-breakpoint
CREATE TABLE "late_explanations" (
	"id" serial PRIMARY KEY NOT NULL,
	"attendance_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"reason_key" varchar(100) NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "working_day_overrides" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"date" date NOT NULL,
	"is_working_day" boolean NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "auto_punched_out" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "attendance_status" "attendance_status_enum" DEFAULT 'present' NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "late_minutes" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "working_hours_key" varchar(100);--> statement-breakpoint
ALTER TABLE "punch" ADD COLUMN "attendance_status" "attendance_status_enum" DEFAULT 'present' NOT NULL;--> statement-breakpoint
ALTER TABLE "punch" ADD COLUMN "is_auto" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "late_explanations" ADD CONSTRAINT "late_explanations_attendance_id_attendance_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendance"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "late_explanations" ADD CONSTRAINT "late_explanations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "working_day_overrides" ADD CONSTRAINT "working_day_overrides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "working_day_overrides_user_date_idx" ON "working_day_overrides" USING btree ("user_id","date");