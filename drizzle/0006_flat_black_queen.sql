ALTER TABLE "leave_balances" ADD COLUMN "entitlement_rule_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_entitlement_rule_id_leave_entitlement_rules_id_fk" FOREIGN KEY ("entitlement_rule_id") REFERENCES "public"."leave_entitlement_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
