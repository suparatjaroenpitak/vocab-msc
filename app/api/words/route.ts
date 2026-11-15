import { categories as categoryTable, words as wordTable } from "@/db/schema";
import { and, asc, desc, eq, lte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCategoryIdForWord, ensureUserCategories } from "@/lib/categories";
import { getCurrentUserEmail } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { ensureDefaultVocabulary } from "@/lib/default-vocabulary";

export async function GET(request: Request) {
  const userEmail = await getCurrentUserEmail();
  if (!userEmail) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบด้วย Google ก่อนใช้งาน" }, { status: 401 });
  const db = getDb();
  await ensureDefaultVocabulary(db, userEmail);
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "all";
  const includeDue = searchParams.get("includeDue") === "1";
  const requestedCategoryId = Number(searchParams.get("categoryId"));
  const queryWords = async (dueOnly: boolean) => {
    const filters = [eq(wordTable.user_email, userEmail)];
    if (dueOnly) filters.push(lte(wordTable.due_at, new Date().toISOString()));
    if (dueOnly && Number.isInteger(requestedCategoryId) && requestedCategoryId > 0) filters.push(eq(wordTable.category_id, requestedCategoryId));
    const condition = filters.length === 1 ? filters[0] : and(...filters);
    const orderBy = dueOnly ? [asc(wordTable.due_at), desc(wordTable.id)] : [desc(wordTable.created_at), desc(wordTable.id)];
    return db.select({
      id: wordTable.id,
      term: wordTable.term,
      part_of_speech: wordTable.part_of_speech,
      definition: wordTable.definition,
      category_id: wordTable.category_id,
      category_name: categoryTable.name,
      example: wordTable.example,
      interval_days: wordTable.interval_days,
      due_at: wordTable.due_at,
      review_count: wordTable.review_count,
      correct_count: wordTable.correct_count,
      last_reviewed: wordTable.last_reviewed,
      created_at: wordTable.created_at
    }).from(wordTable).leftJoin(categoryTable, eq(categoryTable.id, wordTable.category_id)).where(condition).orderBy(...orderBy);
  };
  if (includeDue) {
    const words = await queryWords(false);
    const now = Date.now();
    const dueWordIds = words
      .filter((word) => new Date(word.due_at).getTime() <= now)
      .filter((word) => !Number.isInteger(requestedCategoryId) || requestedCategoryId <= 0 || word.category_id === requestedCategoryId)
      .sort((left, right) => left.due_at.localeCompare(right.due_at) || right.id - left.id)
      .map((word) => word.id);
    return NextResponse.json({ words, dueWordIds });
  }
  return NextResponse.json(await queryWords(mode === "due"));
}

export async function POST(request: Request) {
  const body = (await request.json()) as { term?: string; partOfSpeech?: string; definition?: string; example?: string; categoryId?: number | null };
  const term = body.term?.trim();
  const definition = body.definition?.trim();
  if (!term || !definition) return NextResponse.json({ error: "กรุณากรอกคำศัพท์และคำแปล" }, { status: 400 });

  const userEmail = await getCurrentUserEmail();
  if (!userEmail) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบด้วย Google ก่อนเพิ่มคำศัพท์" }, { status: 401 });
  const db = getDb();
  await ensureUserCategories(db, userEmail);
  const requestedCategoryId = Number(body.categoryId);
  const [selectedCategory] = Number.isInteger(requestedCategoryId) && requestedCategoryId > 0
    ? await db.select({ id: categoryTable.id }).from(categoryTable).where(and(eq(categoryTable.id, requestedCategoryId), eq(categoryTable.user_email, userEmail))).limit(1)
    : [];
  const categoryId = await getCategoryIdForWord(db, userEmail, term, body.partOfSpeech?.trim() || "", definition, selectedCategory?.id);
  const now = new Date().toISOString();
  await db.insert(wordTable).values({
    user_email: userEmail,
    term,
    part_of_speech: body.partOfSpeech?.trim() || "",
    definition,
    category_id: categoryId,
    example: body.example?.trim() || null,
    due_at: now,
    created_at: now,
    updated_at: now
  }).onConflictDoUpdate({ target: [wordTable.user_email, wordTable.term], set: {
    part_of_speech: body.partOfSpeech?.trim() || "",
    definition,
    category_id: selectedCategory ? sql`excluded.category_id` : sql`coalesce(${wordTable.category_id}, excluded.category_id)`,
    example: body.example?.trim() || null,
    updated_at: now
  }});
  return NextResponse.json({ ok: true });
}
