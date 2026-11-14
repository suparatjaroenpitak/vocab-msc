import { NextResponse } from "next/server";
import { getCurrentUserEmail } from "@/lib/current-user";
import { getDb } from "@/lib/db";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const body = (await request.json()) as { rating?: "known" | "again" };
  if (body.rating !== "known" && body.rating !== "again") return NextResponse.json({ error: "invalid rating" }, { status: 400 });

  const { id } = await context.params;
  const userEmail = await getCurrentUserEmail();
  const db = getDb();
  const word = db.prepare("SELECT interval_days, review_count, correct_count FROM words WHERE id = ? AND user_email = ?").get(Number(id), userEmail) as { interval_days: number; review_count: number; correct_count: number } | undefined;
  if (!word) return NextResponse.json({ error: "ไม่พบคำศัพท์" }, { status: 404 });

  const now = new Date();
  const nextInterval = body.rating === "known" ? Math.min(Math.max(word.interval_days * 2, 1), 30) : 0;
  const dueAt = new Date(now.getTime() + (body.rating === "known" ? nextInterval * 86_400_000 : 10 * 60_000)).toISOString();
  db.prepare(`
    UPDATE words SET interval_days = ?, due_at = ?, review_count = review_count + 1,
      correct_count = correct_count + ?, last_reviewed = ?, updated_at = ?
    WHERE id = ? AND user_email = ?
  `).run(nextInterval, dueAt, body.rating === "known" ? 1 : 0, now.toISOString(), now.toISOString(), Number(id), userEmail);
  return NextResponse.json({ ok: true, dueAt });
}
