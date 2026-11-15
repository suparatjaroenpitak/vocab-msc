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
  const nextInterval = body.rating === "known"
    ? sql`least(greatest(${words.interval_days} * 2, 1), 30)`
    : sql`0`;
  const dueAt = body.rating === "known"
    ? sql`to_char(timezone('UTC', now() + (${nextInterval}) * interval '1 day'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`
    : sql`to_char(timezone('UTC', now() + interval '10 minutes'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
  const timestamp = sql`to_char(timezone('UTC', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
  const [updated] = await getDb().update(words).set({
    interval_days: nextInterval,
    due_at: dueAt,
    review_count: sql`${words.review_count} + 1`,
    correct_count: sql`${words.correct_count} + ${body.rating === "known" ? 1 : 0}`,
    last_reviewed: timestamp,
    updated_at: timestamp
  }).where(and(eq(words.id, Number(id)), eq(words.user_email, userEmail))).returning({
    dueAt: words.due_at,
    intervalDays: words.interval_days,
    reviewCount: words.review_count,
    correctCount: words.correct_count,
    lastReviewed: words.last_reviewed
  });
  if (!updated) return NextResponse.json({ error: "ไม่พบคำศัพท์" }, { status: 404 });
  return NextResponse.json({ ok: true, ...updated });
}
