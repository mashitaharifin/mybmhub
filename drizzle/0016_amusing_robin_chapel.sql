ALTER TABLE "attendance" ADD COLUMN "auto_punched_out_reason_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "auto_punched_out_reason" text;