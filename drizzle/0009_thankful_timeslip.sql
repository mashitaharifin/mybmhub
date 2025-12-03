ALTER TABLE "leave_types" ADD COLUMN "is_active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "leave_applications" ADD COLUMN "duration" numeric(5, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_applications" ADD COLUMN "year" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_entitlement_rules" ADD COLUMN "effective_year" integer; --> statement-breakpoint
UPDATE "leave_entitlement_rules" SET "effective_year" = EXTRACT(YEAR FROM NOW()); --> statement-breakpoint
ALTER TABLE "leave_entitlement_rules" 
ALTER COLUMN "effective_year" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_entitlement_rules" ADD COLUMN "is_active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "leave_entitlement_rules" DROP COLUMN "effective_from";--> statement-breakpoint
ALTER TABLE "leave_entitlement_rules" DROP COLUMN "effective_to";