export type Word = {
  id: number;
  term: string;
  part_of_speech: string;
  definition: string;
  example: string | null;
  interval_days: number;
  due_at: string;
  review_count: number;
  correct_count: number;
  last_reviewed: string | null;
  created_at: string;
};

export type ReviewRating = "known" | "again";

export type ParsedWord = {
  term: string;
  partOfSpeech: string;
  definition: string;
};
