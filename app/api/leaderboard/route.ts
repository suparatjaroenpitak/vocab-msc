import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCurrentUserEmail } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { getLeaderboard } from "@/lib/leaderboard";
import { quizAttempts } from "@/db/schema";

export async function GET() {
  const userEmail = await getCurrentUserEmail();
  if (!userEmail) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนดูสถิติ" }, { status: 401 });
  try {
    return NextResponse.json(await getLeaderboard(userEmail));
  } catch (error) {
    console.error("Leaderboard query failed", error);
    return NextResponse.json({ error: "โหลดอันดับไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: { score?: unknown; totalQuestions?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "ข้อมูลคะแนนไม่ถูกต้อง" }, { status: 400 });
  }
  const score = body?.score;
  const totalQuestions = body?.totalQuestions;
  if (!Number.isInteger(score) || !Number.isInteger(totalQuestions) || Number(score) < 0 || Number(totalQuestions) < 1 || Number(totalQuestions) > 10 || Number(score) > Number(totalQuestions)) {
    return NextResponse.json({ error: "คะแนนควิซไม่ถูกต้อง" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email?.trim().toLowerCase();
  if (!userEmail) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนบันทึกคะแนน" }, { status: 401 });
  const userName = session?.user?.name?.trim().slice(0, 80) || userEmail.split("@")[0] || "ผู้เรียน";

  try {
    await getDb().insert(quizAttempts).values({
      user_email: userEmail,
      user_name: userName,
      score: Number(score),
      total_questions: Number(totalQuestions),
      created_at: new Date().toISOString()
    });
    return NextResponse.json(await getLeaderboard(userEmail));
  } catch (error) {
    console.error("Quiz score save failed", error);
    if (String(error).toLowerCase().includes("quiz_attempts")) {
      return NextResponse.json({ error: "ยังไม่ได้สร้างตารางสถิติควิซใน PostgreSQL" }, { status: 503 });
    }
    return NextResponse.json({ error: "บันทึกคะแนนไม่สำเร็จ กรุณาลองอีกครั้ง" }, { status: 500 });
  }
}
