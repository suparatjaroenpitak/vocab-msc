import { drizzle } from "drizzle-orm/netlify-db";
import { words } from "@/db/schema";
import { sql } from "drizzle-orm";
import type { ParsedWord } from "@/lib/types";

export function getDb() {
  return drizzle({ schema: { words } });
}

export async function importWords(userEmail: string, parsed: ParsedWord[]) {
  const now = new Date().toISOString();
  // Deduplicate JSON input too: Postgres cannot update one row twice in a statement.
  const unique = new Map(parsed.map((word) => [word.term, word]));
  await getDb().insert(words).values(Array.from(unique.values()).map((word) => ({
    user_email: userEmail, term: word.term, part_of_speech: word.partOfSpeech,
    definition: word.definition, due_at: now, created_at: now, updated_at: now
  }))).onConflictDoUpdate({
    target: [words.user_email, words.term],
    set: { part_of_speech: sql`excluded.part_of_speech`, definition: sql`excluded.definition`, updated_at: now }
  });
  return unique.size;
}
