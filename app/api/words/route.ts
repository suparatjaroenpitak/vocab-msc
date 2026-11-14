import { words as wordTable } from "@/db/schema";
import { and, eq, lte, asc, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUserEmail } from "@/lib/current-user";
import { getDb } from "@/lib/db";

export async function GET(request: Request) {
  const userEmail = await getCurrentUserEmail();
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "all";
  const condition = mode === "due"
    ? and(eq(wordTable.user_email, userEmail), lte(wordTable.due_at, new Date().toISOString()))
    : eq(wordTable.user_email, userEmail);
  const words = await getDb().select().from(wordTable).where(condition).orderBy(
    ...(mode === "due" ? [asc(wordTable.due_at), desc(wordTable.id)] : [desc(wordTable.created_at), desc(wordTable.id)])
  );
  return NextResponse.json(words);
}

export async function POST(request: Request) {
  const body = (await request.json()) as { term?: string; partOfSpeech?: string; definition?: string; example?: string };
  const term = body.term?.trim();
  const definition = body.definition?.trim();
  if (!term || !definition) return NextResponse.json({ error: "กรุณากรอกคำศัพท์และคำแปล" }, { status: 400 });

  const userEmail = await getCurrentUserEmail();
  const now = new Date().toISOString();
  await getDb().insert(wordTable).values({
    user_email: userEmail, term, part_of_speech: body.partOfSpeech?.trim() || "",
    definition, example: body.example?.trim() || null, due_at: now, created_at: now, updated_at: now
  }).onConflictDoUpdate({ target: [wordTable.user_email, wordTable.term], set: {
    part_of_speech: body.partOfSpeech?.trim() || "", definition,
    example: body.example?.trim() || null, updated_at: now
  }});
  return NextResponse.json({ ok: true });
}
