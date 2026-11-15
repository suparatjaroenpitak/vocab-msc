CREATE TABLE "words" (
	"id" serial PRIMARY KEY,
	"user_email" text NOT NULL,
	"term" text NOT NULL,
	"part_of_speech" text DEFAULT '' NOT NULL,
	"definition" text NOT NULL,
	"example" text,
	"interval_days" double precision DEFAULT 0 NOT NULL,
	"due_at" text NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"correct_count" integer DEFAULT 0 NOT NULL,
	"last_reviewed" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "words_user_term_idx" ON "words" ("user_email","term");--> statement-breakpoint
CREATE INDEX "words_due_idx" ON "words" ("user_email","due_at");
