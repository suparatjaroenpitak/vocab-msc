import { drizzle } from "drizzle-orm/netlify-db";
import { categories, words } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { ensureUserCategories, getCategoryIdForWord } from "@/lib/categories";
import type { ParsedWord } from "@/lib/types";

export function getDb() {
  return drizzle({ schema: { words, categories } });
}

export async function importWords(userEmail: string, parsed: ParsedWord[], requestedCategoryId?: number | null) {
  const now = new Date().toISOString();
  // Deduplicate JSON input too: Postgres cannot update one row twice in a statement.
  const unique = new Map(parsed.map((word) => [word.term, word]));
  const db = getDb();
  await ensureUserCategories(db, userEmail);
  const [requestedCategory] = requestedCategoryId ? await db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, requestedCategoryId), eq(categories.user_email, userEmail))).limit(1) : [];
  const values = await Promise.all(Array.from(unique.values()).map(async (word) => ({
    user_email: userEmail, term: word.term, part_of_speech: word.partOfSpeech,
    definition: word.definition,
    category_id: await getCategoryIdForWord(db, userEmail, word.term, word.partOfSpeech, word.definition, requestedCategory?.id),
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
