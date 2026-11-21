import { categories, words } from "@/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { getDb } from "@/lib/db";

type Db = ReturnType<typeof getDb>;

export function suggestCategoryName(term: string, partOfSpeech: string, definition: string) {
  const text = `${term} ${partOfSpeech} ${definition}`.toLowerCase();
  if (/phr\.?\s*v|phrase|idiom|pipe down|spread out|set up|clear out|dropping in|taking aim/.test(text)) return "วลีและสำนวน";
  if (/baseball|pitcher|lefty|inning|กีฬา|การแข่งขัน|เกม|series|winning|team|player|ball/.test(text)) return "กีฬา";
  if (/airborne|drop zone|unit|enemy|territory|sergeant|headquarters|intel|machine gun|regiment|strong point|town hall|german|flank|battle|engagement|sniper|defend|fortif|ทหาร|รบ|ปืน|ศัตรู|กองบัญชาการ/.test(text)) return "การทหาร";
  if (/landing|road|beach|town|crossroad|church|location|center|สถานที่|ถนน|ชายหาด|เมือง|โบสถ์|ทางแยก/.test(text)) return "สถานที่และการเดินทาง";
  return "ทั่วไป";
}

export async function ensureUserCategories(db: Db, userEmail: string) {
  const now = new Date().toISOString();
  const categoryRows = await db.select({ id: categories.id, name: categories.name }).from(categories).where(eq(categories.user_email, userEmail));
  const byName = new Map(categoryRows.map((category) => [category.name, category.id]));
  const uncategorized = await db.select({ id: words.id, term: words.term, part_of_speech: words.part_of_speech, definition: words.definition }).from(words).where(and(eq(words.user_email, userEmail), isNull(words.category_id)));
  const idsByCategory = new Map<number, number[]>();
  for (const word of uncategorized) {
    const categoryId = byName.get(suggestCategoryName(word.term, word.part_of_speech, word.definition));
    if (!categoryId) continue;
    const ids = idsByCategory.get(categoryId) ?? [];
    ids.push(word.id);
    idsByCategory.set(categoryId, ids);
  }
  for (const [categoryId, ids] of Array.from(idsByCategory.entries())) {
    await db.update(words).set({ category_id: categoryId, updated_at: now }).where(and(eq(words.user_email, userEmail), inArray(words.id, ids)));
  }
  return categoryRows;
}

export async function getCategoryIdForWord(db: Db, userEmail: string, term: string, partOfSpeech: string, definition: string, requestedCategoryId?: number | null) {
  if (requestedCategoryId) {
    const [requested] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, requestedCategoryId), eq(categories.user_email, userEmail))).limit(1);
    if (requested) return requested.id;
  }
  const suggestedName = suggestCategoryName(term, partOfSpeech, definition);
  const [suggested] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.user_email, userEmail), eq(categories.name, suggestedName))).limit(1);
  return suggested?.id ?? null;
}
