CREATE TABLE "quiz_attempts" (
	"id" serial PRIMARY KEY,
	"user_email" text NOT NULL,
	"user_name" text NOT NULL,
	"score" integer NOT NULL,
	"total_questions" integer NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "quiz_attempts_user_idx" ON "quiz_attempts" ("user_email", "created_at");
