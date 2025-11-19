CREATE TABLE "punch" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"event_type" "punchEvent" NOT NULL,
	"event_time" timestamp NOT NULL,
	"location_lat" numeric(10, 6),
	"location_lng" numeric(10, 6),
	"accuracy_meters" integer,
	"source" "source_type" DEFAULT 'Mobile',
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "summary_date" date NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "check_in_time" timestamp;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "check_out_time" timestamp;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "total_hours" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "break_hours" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "worked_hours" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "is_modified" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "punch" ADD CONSTRAINT "punch_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN "event_type";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN "event_time";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN "location_lat";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN "location_lng";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN "accuracy_meters";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN "source";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN "notes";