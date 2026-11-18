import { categories, words } from "@/db/schema";
import { and, asc, eq, sql } from "drizzle-orm";
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
    word_count: sql<number>`count(${words.id})`
  }).from(categories).leftJoin(words, and(eq(words.category_id, categories.id), eq(words.user_email, userEmail))).where(eq(categories.user_email, userEmail)).groupBy(categories.id, categories.name).orderBy(asc(categories.name));
  return NextResponse.json(result.map((category) => ({ ...category, word_count: Number(category.word_count) })));
}

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim().replace(/\s+/g, " ");
  if (!name || name.length > 50) return NextResponse.json({ error: "กรุณาระบุชื่อหมวดหมู่ไม่เกิน 50 ตัวอักษร" }, { status: 400 });
  const userEmail = await getCurrentUserEmail();
  if (!userEmail) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบด้วย Google ก่อนสร้างหมวดหมู่" }, { status: 401 });
  const db = getDb();
  await ensureUserCategories(db, userEmail);
  const now = new Date().toISOString();
  try {
    const [created] = await db.insert(categories).values({ user_email: userEmail, name, created_at: now }).returning({ id: categories.id, name: categories.name });
    return NextResponse.json({ ...created, word_count: 0 });
  } catch {
    return NextResponse.json({ error: "มีหมวดหมู่นี้อยู่แล้ว" }, { status: 409 });
  }
}
