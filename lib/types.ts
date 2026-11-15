export type Word = {
  id: number;
  term: string;
  part_of_speech: string;
  definition: string;
  category_id: number | null;
  category_name: string | null;
  example: string | null;
  interval_days: number;
  due_at: string;
  review_count: number;
  correct_count: number;
  last_reviewed: string | null;
  created_at: string;
};

export type Category = {
  id: number;
  name: string;
  word_count: number;
};

export type ReviewRating = "known" | "again";

export type ParsedWord = {
  term: string;
  partOfSpeech: string;
  definition: string;
};

export type LeaderboardPlayer = {
  rank: number;
  name: string;
  isMe: boolean;
  bestPercent: number;
  averagePercent: number;
  attempts: number;
  correctAnswers: number;
  questionsAnswered: number;
};

export type LeaderboardSnapshot = {
  me: LeaderboardPlayer | null;
  leaders: LeaderboardPlayer[];
};
