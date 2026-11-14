import { NextResponse } from "next/server";
import { getCurrentUserEmail } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { parseVocabulary } from "@/lib/parser";

export async function POST(request: Request) {
  const body = (await request.json()) as { text?: string };
  const parsed = parseVocabulary(body.text || "");
  if (!parsed.length) {
    return NextResponse.json({ error: "ยังอ่านรายการไม่ได้ ลองใช้รูปแบบ: word (pos) - คำแปล" }, { status: 400 });
  }

  const userEmail = await getCurrentUserEmail();
  const now = new Date().toISOString();
  const db = getDb();
  const insert = db.prepare(`
    INSERT INTO words (user_email, term, part_of_speech, definition, due_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_email, term) DO UPDATE SET
      part_of_speech = excluded.part_of_speech,
      definition = excluded.definition,
      updated_at = excluded.updated_at
  `);
  const addWords = db.transaction(() => {
    for (const word of parsed) insert.run(userEmail, word.term, word.partOfSpeech, word.definition, now, now, now);
  });
  addWords();
  return NextResponse.json({ imported: parsed.length, words: parsed });
}
