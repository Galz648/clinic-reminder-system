ALTER TABLE "phone_numbers" DROP CONSTRAINT "phone_numbers_case_id_cases_id_fk";
--> statement-breakpoint
ALTER TABLE "phone_numbers" DROP COLUMN "case_id";
--> statement-breakpoint
ALTER TABLE "phone_numbers" ADD COLUMN "owner_id" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "phone_numbers" ADD CONSTRAINT "phone_numbers_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "owner_id" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE no action ON UPDATE no action;
