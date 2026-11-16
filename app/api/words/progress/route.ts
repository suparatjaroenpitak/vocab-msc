import { words } from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUserEmail } from "@/lib/current-user";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  let body: { wordIds?: unknown };
  try {
    body = await request.json() as { wordIds?: unknown };
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  if (!Array.isArray(body.wordIds) || body.wordIds.length > 50) {
    return NextResponse.json({ error: "รายการคำศัพท์ไม่ถูกต้อง" }, { status: 400 });
  }
  if (!body.wordIds.every((id) => typeof id === "number" && Number.isSafeInteger(id) && id > 0)) {
    return NextResponse.json({ error: "รหัสคำศัพท์ไม่ถูกต้อง" }, { status: 400 });
  }
  const wordIds = Array.from(new Set(body.wordIds as number[]));
  if (!wordIds.length) return NextResponse.json({ updated: [] });

  const userEmail = await getCurrentUserEmail();
  if (!userEmail) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบด้วย Google ก่อนบันทึกความก้าวหน้า" }, { status: 401 });

  const timestamp = new Date().toISOString();
  const updated = await getDb().update(words).set({
    correct_count: sql`${words.correct_count} + 1`,
    updated_at: timestamp
  }).where(and(eq(words.user_email, userEmail), inArray(words.id, wordIds))).returning({
    id: words.id,
    correct_count: words.correct_count
  });
  return NextResponse.json({ updated });
}
