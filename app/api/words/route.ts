import { NextResponse } from "next/server";
import { getCurrentUserEmail } from "@/lib/current-user";
import { getDb } from "@/lib/db";

export async function GET(request: Request) {
  const userEmail = await getCurrentUserEmail();
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "all";
  const query = mode === "due"
    ? "SELECT id, term, part_of_speech, definition, example, interval_days, due_at, review_count, correct_count, last_reviewed, created_at FROM words WHERE user_email = ? AND due_at <= ? ORDER BY due_at ASC, id DESC"
    : "SELECT id, term, part_of_speech, definition, example, interval_days, due_at, review_count, correct_count, last_reviewed, created_at FROM words WHERE user_email = ? ORDER BY created_at DESC, id DESC";
  const words = getDb().prepare(query).all(userEmail, ...(mode === "due" ? [new Date().toISOString()] : []));
  return NextResponse.json(words);
}

export async function POST(request: Request) {
  const body = (await request.json()) as { term?: string; partOfSpeech?: string; definition?: string; example?: string };
  const term = body.term?.trim();
  const definition = body.definition?.trim();
  if (!term || !definition) return NextResponse.json({ error: "กรุณากรอกคำศัพท์และคำแปล" }, { status: 400 });

  const userEmail = await getCurrentUserEmail();
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO words (user_email, term, part_of_speech, definition, example, due_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_email, term) DO UPDATE SET
      part_of_speech = excluded.part_of_speech,
      definition = excluded.definition,
      example = excluded.example,
      updated_at = excluded.updated_at
  `).run(userEmail, term, body.partOfSpeech?.trim() || "", definition, body.example?.trim() || null, now, now, now);
  return NextResponse.json({ ok: true });
}
