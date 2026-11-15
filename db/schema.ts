import { pgTable, serial, text, integer, doublePrecision, uniqueIndex, index } from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  user_email: text("user_email").notNull(),
  name: text("name").notNull(),
  created_at: text("created_at").notNull()
}, (table) => [
  uniqueIndex("categories_user_name_idx").on(table.user_email, table.name),
  index("categories_user_idx").on(table.user_email)
]);

export const words = pgTable("words", {
  id: serial("id").primaryKey(),
  user_email: text("user_email").notNull(),
  term: text("term").notNull(),
  part_of_speech: text("part_of_speech").notNull().default(""),
  definition: text("definition").notNull(),
  category_id: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  example: text("example"),
  interval_days: doublePrecision("interval_days").notNull().default(0),
  due_at: text("due_at").notNull(),
  review_count: integer("review_count").notNull().default(0),
  correct_count: integer("correct_count").notNull().default(0),
  last_reviewed: text("last_reviewed"),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull()
}, (table) => [
  uniqueIndex("words_user_term_idx").on(table.user_email, table.term),
  index("words_due_idx").on(table.user_email, table.due_at)
]);

export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  user_email: text("user_email").notNull(),
  user_name: text("user_name").notNull(),
  score: integer("score").notNull(),
  total_questions: integer("total_questions").notNull(),
  created_at: text("created_at").notNull()
}, (table) => [
  index("quiz_attempts_user_idx").on(table.user_email, table.created_at)
]);

export const userSeedStates = pgTable("user_seed_states", {
  id: serial("id").primaryKey(),
  user_email: text("user_email").notNull(),
  seed_key: text("seed_key").notNull(),
  applied_at: text("applied_at").notNull()
}, (table) => [
  uniqueIndex("user_seed_states_user_seed_idx").on(table.user_email, table.seed_key)
]);
