import { categories, words } from "@/db/schema";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { ensureUserCategories } from "@/lib/categories";
import { getCurrentUserEmail } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { ensureDefaultVocabulary } from "@/lib/default-vocabulary";

export async function GET() {
  const userEmail = await getCurrentUserEmail();
  if (!userEmail) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบด้วย Google ก่อนใช้งาน" }, { status: 401 });
  const db = getDb();
  await ensureUserCategories(db, userEmail);
  await ensureDefaultVocabulary(db, userEmail);
  const result = await db.select({
    id: categories.id,
    name: categories.name,
    parent_id: categories.parent_id,
    word_count: sql<number>`count(${words.id})`
  }).from(categories).leftJoin(words, and(eq(words.category_id, categories.id), eq(words.user_email, userEmail))).where(eq(categories.user_email, userEmail)).groupBy(categories.id, categories.name, categories.parent_id).orderBy(asc(categories.name));
  const withCounts = result.map((category) => ({
    ...category,
    word_count: category.parent_id === null
      ? Number(category.word_count) + result.filter((child) => child.parent_id === category.id).reduce((sum, child) => sum + Number(child.word_count), 0)
      : Number(category.word_count)
  }));
  return NextResponse.json(withCounts);
}

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string; parentId?: unknown };
  const name = body.name?.trim().replace(/\s+/g, " ");
  if (!name || name.length > 50) return NextResponse.json({ error: "กรุณาระบุชื่อหมวดหมู่ไม่เกิน 50 ตัวอักษร" }, { status: 400 });
  const userEmail = await getCurrentUserEmail();
  if (!userEmail) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบด้วย Google ก่อนสร้างหมวดหมู่" }, { status: 401 });
  const db = getDb();
  await ensureUserCategories(db, userEmail);
  const requestedParentId = typeof body.parentId === "number" && Number.isInteger(body.parentId) && body.parentId > 0 ? body.parentId : null;
  if (requestedParentId) {
    const [parent] = await db.select({ id: categories.id, parent_id: categories.parent_id }).from(categories).where(and(eq(categories.id, requestedParentId), eq(categories.user_email, userEmail))).limit(1);
    if (!parent) return NextResponse.json({ error: "ไม่พบหมวดหลักนี้" }, { status: 400 });
    if (parent.parent_id !== null) return NextResponse.json({ error: "หมวดย่อยซ้อนได้ไม่เกิน 1 ระดับ" }, { status: 400 });
  }
  const [existing] = await db.select({ id: categories.id }).from(categories).where(and(
    eq(categories.user_email, userEmail),
    eq(categories.name, name),
    requestedParentId ? eq(categories.parent_id, requestedParentId) : isNull(categories.parent_id)
  )).limit(1);
  if (existing) return NextResponse.json({ error: "มีหมวดหมู่นี้อยู่แล้ว" }, { status: 409 });
  const now = new Date().toISOString();
  try {
    const [created] = await db.insert(categories).values({ user_email: userEmail, name, parent_id: requestedParentId, created_at: now }).returning({ id: categories.id, name: categories.name, parent_id: categories.parent_id });
    return NextResponse.json({ ...created, word_count: 0 });
  } catch {
    return NextResponse.json({ error: "มีหมวดหมู่นี้อยู่แล้ว" }, { status: 409 });
  }
}
