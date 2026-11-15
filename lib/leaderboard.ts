import { desc, sql } from "drizzle-orm";
import type { LeaderboardPlayer, LeaderboardSnapshot } from "@/lib/types";
import { quizAttempts } from "@/db/schema";
import { getDb } from "@/lib/db";

export async function getLeaderboard(userEmail: string): Promise<LeaderboardSnapshot> {
  const db = getDb();
  const results = await db.select({
    userEmail: quizAttempts.user_email,
    name: sql<string>`(array_agg(${quizAttempts.user_name} ORDER BY ${quizAttempts.created_at} DESC))[1]`,
    bestPercent: sql<number>`max(100.0 * ${quizAttempts.score} / nullif(${quizAttempts.total_questions}, 0))`,
    averagePercent: sql<number>`avg(100.0 * ${quizAttempts.score} / nullif(${quizAttempts.total_questions}, 0))`,
    attempts: sql<number>`count(*)::int`,
    correctAnswers: sql<number>`sum(${quizAttempts.score})::int`,
    questionsAnswered: sql<number>`sum(${quizAttempts.total_questions})::int`
  }).from(quizAttempts).groupBy(quizAttempts.user_email).orderBy(desc(sql`max(100.0 * ${quizAttempts.score} / nullif(${quizAttempts.total_questions}, 0))`));

  const players = results.map((player) => ({
    userEmail: player.userEmail,
    name: player.name || "ผู้เรียน",
    rank: 0,
    bestPercent: Math.round(Number(player.bestPercent)),
    averagePercent: Math.round(Number(player.averagePercent)),
    attempts: Number(player.attempts),
    correctAnswers: Number(player.correctAnswers),
    questionsAnswered: Number(player.questionsAnswered)
  })).sort((a, b) => b.bestPercent - a.bestPercent || b.correctAnswers - a.correctAnswers || a.name.localeCompare(b.name, "th"));

  let previousScore: number | null = null;
  let rank = 0;
  players.forEach((player, index) => {
    if (player.bestPercent !== previousScore) rank = index + 1;
    player.rank = rank;
    previousScore = player.bestPercent;
  });

  const me = players.find((player) => player.userEmail === userEmail) ?? null;
  const toPublicPlayer = (player: typeof players[number]): LeaderboardPlayer => ({
    rank: player.rank,
    name: player.name,
    isMe: player.userEmail === userEmail,
    bestPercent: player.bestPercent,
    averagePercent: player.averagePercent,
    attempts: player.attempts,
    correctAnswers: player.correctAnswers,
    questionsAnswered: player.questionsAnswered
  });
  return {
    me: me ? toPublicPlayer(me) : null,
    leaders: players.slice(0, 20).map(toPublicPlayer)
  };
}
