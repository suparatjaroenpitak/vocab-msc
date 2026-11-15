import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { categories, quizAttempts, words } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { ensureUserCategories, suggestCategoryName } from "@/lib/categories";
import type { ParsedWord } from "@/lib/types";

const globalForDb = globalThis as unknown as { postgresPool?: Pool };

export function getDb() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is missing. Add a PostgreSQL connection string to Vercel Environment Variables.");
  }
  const pool = globalForDb.postgresPool ?? new Pool({ connectionString, max: 5 });
  globalForDb.postgresPool = pool;
  return drizzle({ client: pool, schema: { words, categories, quizAttempts } });
}

export async function importWords(userEmail: string, parsed: ParsedWord[], requestedCategoryId?: number | null) {
  const now = new Date().toISOString();
  // Deduplicate JSON input too: Postgres cannot update one row twice in a statement.
  const unique = new Map(parsed.map((word) => [word.term, word]));
  const db = getDb();
  const categoryRows = await ensureUserCategories(db, userEmail);
  const categoryByName = new Map(categoryRows.map((category) => [category.name, category.id]));
  const requestedCategory = requestedCategoryId ? categoryRows.find((category) => category.id === requestedCategoryId) : undefined;
  const values = await Promise.all(Array.from(unique.values()).map(async (word) => ({
    user_email: userEmail, term: word.term, part_of_speech: word.partOfSpeech,
    definition: word.definition,
    category_id: requestedCategory?.id ?? categoryByName.get(suggestCategoryName(word.term, word.partOfSpeech, word.definition)) ?? null,
    due_at: now, created_at: now, updated_at: now
  })));
  await db.insert(words).values(values).onConflictDoUpdate({
    target: [words.user_email, words.term],
    set: {
      part_of_speech: sql`excluded.part_of_speech`, definition: sql`excluded.definition`, updated_at: now,
      category_id: requestedCategory ? sql`excluded.category_id` : sql`coalesce(${words.category_id}, excluded.category_id)`
    }
  });
  return unique.size;
}
