import { categories, words } from "@/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { getDb } from "@/lib/db";
import {
  DEFAULT_IMPORT_CATEGORY,
  MAIN_CATEGORY_NAMES,
  SENTENCE_PATTERN_CATEGORY,
  suggestMainCategoryName,
  suggestSubcategoryName
} from "@/lib/category-hierarchy";

type Db = ReturnType<typeof getDb>;

function parentCondition(parentId: number | null) {
  return parentId === null ? isNull(categories.parent_id) : eq(categories.parent_id, parentId);
}

async function findCategory(db: Db, userEmail: string, name: string, parentId: number | null) {
  const [category] = await db.select({ id: categories.id, name: categories.name, parent_id: categories.parent_id })
    .from(categories)
    .where(and(eq(categories.user_email, userEmail), eq(categories.name, name), parentCondition(parentId)))
    .limit(1);
  return category;
}

export async function ensureCategory(db: Db, userEmail: string, name: string, parentId: number | null = null) {
  const existing = await findCategory(db, userEmail, name, parentId);
  if (existing) return existing;
  await db.insert(categories).values({ user_email: userEmail, name, parent_id: parentId, created_at: new Date().toISOString() }).onConflictDoNothing();
  const created = await findCategory(db, userEmail, name, parentId);
  if (!created) throw new Error(`Unable to create category: ${name}`);
  return created;
}

export function suggestCategoryName(term: string, partOfSpeech: string, definition: string) {
  return suggestSubcategoryName(suggestMainCategoryName(term, partOfSpeech, definition), term, partOfSpeech, definition);
}

export async function ensureUserCategories(db: Db, userEmail: string) {
  for (const name of MAIN_CATEGORY_NAMES) await ensureCategory(db, userEmail, name);

  const categoryRows = await db.select({ id: categories.id, name: categories.name, parent_id: categories.parent_id })
    .from(categories).where(eq(categories.user_email, userEmail));
  const uncategorized = await db.select({ id: words.id, term: words.term, part_of_speech: words.part_of_speech, definition: words.definition })
    .from(words).where(and(eq(words.user_email, userEmail), isNull(words.category_id)));
  const idsByCategory = new Map<number, number[]>();
  for (const word of uncategorized) {
    const mainName = suggestMainCategoryName(word.term, word.part_of_speech, word.definition);
    const main = categoryRows.find((category) => category.name === mainName && category.parent_id === null)
      ?? await ensureCategory(db, userEmail, mainName);
    const subName = suggestSubcategoryName(mainName, word.term, word.part_of_speech, word.definition);
    const sub = await ensureCategory(db, userEmail, subName, main.id);
    const ids = idsByCategory.get(sub.id) ?? [];
    ids.push(word.id);
    idsByCategory.set(sub.id, ids);
  }
  const now = new Date().toISOString();
  for (const [categoryId, ids] of Array.from(idsByCategory.entries())) {
    await db.update(words).set({ category_id: categoryId, updated_at: now })
      .where(and(eq(words.user_email, userEmail), inArray(words.id, ids)));
  }
  return db.select({ id: categories.id, name: categories.name, parent_id: categories.parent_id })
    .from(categories).where(eq(categories.user_email, userEmail));
}

export async function getCategoryIdForWord(db: Db, userEmail: string, term: string, partOfSpeech: string, definition: string, requestedCategoryId?: number | null) {
  if (requestedCategoryId) {
    const [requested] = await db.select({ id: categories.id, name: categories.name, parent_id: categories.parent_id })
      .from(categories).where(and(eq(categories.id, requestedCategoryId), eq(categories.user_email, userEmail))).limit(1);
    if (requested) {
      if (requested.parent_id !== null || requested.name === SENTENCE_PATTERN_CATEGORY) return requested.id;
      const subName = suggestSubcategoryName(requested.name, term, partOfSpeech, definition);
      return (await ensureCategory(db, userEmail, subName, requested.id)).id;
    }
  }
  const mainName = suggestMainCategoryName(term, partOfSpeech, definition) || DEFAULT_IMPORT_CATEGORY;
  const main = await ensureCategory(db, userEmail, mainName);
  const subName = suggestSubcategoryName(mainName, term, partOfSpeech, definition);
  return (await ensureCategory(db, userEmail, subName, main.id)).id;
}
