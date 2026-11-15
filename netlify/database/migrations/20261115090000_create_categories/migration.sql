CREATE TABLE "categories" (
	"id" serial PRIMARY KEY,
	"user_email" text NOT NULL,
	"name" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "category_id" integer;
--> statement-breakpoint
ALTER TABLE "words" ADD CONSTRAINT "words_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "categories_user_name_idx" ON "categories" ("user_email","name");
--> statement-breakpoint
CREATE INDEX "categories_user_idx" ON "categories" ("user_email");
--> statement-breakpoint
CREATE INDEX "words_category_idx" ON "words" ("user_email","category_id");
