ALTER TABLE "categories" ADD COLUMN "parent_id" integer;
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
DROP INDEX IF EXISTS "categories_user_name_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX "categories_user_parent_name_idx" ON "categories" ("user_email","parent_id","name");
--> statement-breakpoint
CREATE INDEX "categories_parent_idx" ON "categories" ("user_email","parent_id");
