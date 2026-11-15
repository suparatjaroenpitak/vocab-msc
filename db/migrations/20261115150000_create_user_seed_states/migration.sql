CREATE TABLE IF NOT EXISTS "user_seed_states" (
  "id" serial PRIMARY KEY,
  "user_email" text NOT NULL,
  "seed_key" text NOT NULL,
  "applied_at" text NOT NULL,
  CONSTRAINT "user_seed_states_user_seed_idx" UNIQUE ("user_email", "seed_key")
);
