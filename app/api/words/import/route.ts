import { NextResponse } from "next/server";
import { getCurrentUserEmail } from "@/lib/current-user";
import { importWords } from "@/lib/db";
import { parseVocabulary } from "@/lib/parser";

export async function POST(request: Request) {
  let body: { text?: unknown; categoryId?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "ข้อมูลนำเข้าไม่ถูกต้อง" }, { status: 400 }); }
  if (!body || typeof body.text !== "string") return NextResponse.json({ error: "กรุณาวางรายการคำศัพท์" }, { status: 400 });
  if (body.text.length > 500_000) return NextResponse.json({ error: "รายการยาวเกินไป กรุณาแบ่งนำเข้าครั้งละไม่เกิน 500,000 ตัวอักษร" }, { status: 413 });
  const parsed = parseVocabulary(body.text);
  if (!parsed.length) return NextResponse.json({ error: "ยังอ่านรายการไม่ได้ ลองใช้รูปแบบ: word (pos) - คำแปล" }, { status: 400 });
  if (parsed.length > 5000) return NextResponse.json({ error: "กรุณานำเข้าครั้งละไม่เกิน 5,000 คำ" }, { status: 400 });
  try {
    const userEmail = await getCurrentUserEmail();
    if (!userEmail) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบด้วย Google ก่อนนำเข้าคำศัพท์" }, { status: 401 });
    const requestedCategoryId = typeof body.categoryId === "number" && Number.isInteger(body.categoryId) ? body.categoryId : null;
    const imported = await importWords(userEmail, parsed, requestedCategoryId);
    return NextResponse.json({ imported });
  } catch {
    return NextResponse.json({ error: "บันทึกคำศัพท์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
