import { words } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUserEmail } from "@/lib/current-user";
import { getDb } from "@/lib/db";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const body = (await request.json()) as { rating?: "known" | "again" };
  if (body.rating !== "known" && body.rating !== "again") return NextResponse.json({ error: "invalid rating" }, { status: 400 });

  const { id } = await context.params;
  const userEmail = await getCurrentUserEmail();
  if (!userEmail) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบด้วย Google ก่อนทบทวน" }, { status: 401 });
  const db = getDb();
  const [word] = await db.select().from(words).where(and(eq(words.id, Number(id)), eq(words.user_email, userEmail)));
  if (!word) return NextResponse.json({ error: "ไม่พบคำศัพท์" }, { status: 404 });

  const now = new Date();
  const nextInterval = body.rating === "known" ? Math.min(Math.max(word.interval_days * 2, 1), 30) : 0;
  const dueAt = new Date(now.getTime() + (body.rating === "known" ? nextInterval * 86_400_000 : 10 * 60_000)).toISOString();
  await db.update(words).set({
    interval_days: nextInterval, due_at: dueAt, review_count: sql`${words.review_count} + 1`,
    correct_count: sql`${words.correct_count} + ${body.rating === "known" ? 1 : 0}`,
    last_reviewed: now.toISOString(), updated_at: now.toISOString()
  }).where(and(eq(words.id, Number(id)), eq(words.user_email, userEmail)));
  return NextResponse.json({ ok: true, dueAt });
}
