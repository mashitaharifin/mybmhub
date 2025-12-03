ALTER TABLE "leave_applications" ADD COLUMN "approved_by" integer;--> statement-breakpoint
ALTER TABLE "leave_applications" ADD COLUMN "rejected_by" integer;--> statement-breakpoint
ALTER TABLE "leave_applications" ADD COLUMN "rejected_date" timestamp;--> statement-breakpoint
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;