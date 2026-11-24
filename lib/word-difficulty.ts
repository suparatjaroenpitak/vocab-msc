import type { Word } from "./types";

export type WordDifficulty = "easy" | "medium" | "hard";
export type WordDifficultyFilter = WordDifficulty | "all";

export const WORD_DIFFICULTY_META: Record<WordDifficulty, {
  label: string;
  description: string;
  badgeClass: string;
  activeClass: string;
}> = {
  easy: {
    label: "จำง่าย",
    description: "คำสั้นหรือโครงสร้างไม่ซับซ้อน",
    badgeClass: "bg-mint text-emerald-800",
    activeClass: "border-emerald-300 bg-mint text-emerald-900"
  },
  medium: {
    label: "ระดับกลาง",
    description: "มีรายละเอียดหรือความยาวปานกลาง",
    badgeClass: "bg-sand text-amber-800",
    activeClass: "border-amber-300 bg-sand text-amber-900"
  },
  hard: {
    label: "ยาก",
    description: "คำยาว วลี หรือเคยตอบผิดหลายครั้ง",
    badgeClass: "bg-coral/10 text-coral",
    activeClass: "border-coral/40 bg-coral/10 text-coral"
  }
};

type DifficultyInput = Pick<Word, "term" | "part_of_speech" | "definition" | "review_count" | "correct_count" | "interval_days">;

function countMeaningParts(definition: string) {
  return definition.split(/[,/;|]|\s+หรือ\s+|\s+และ\s+/).map((part) => part.trim()).filter(Boolean).length;
}

/**
 * Estimate a review level from the word's shape and the learner's history.
 * This keeps the label useful for new words while making repeatedly missed
 * words move into the hard bucket automatically.
 */
export function getWordDifficulty(word: DifficultyInput): WordDifficulty {
  const term = word.term.trim();
  const letters = term.replace(/[^A-Za-z0-9\u00c0-\uffff]/g, "").length;
  const hasPhraseShape = /\s|[-/]/.test(term);
  const partOfSpeech = word.part_of_speech.toLowerCase();
  const isPhrase = /(phrase|phr\.?\s*v|idiom|expression)/.test(partOfSpeech);
  const meaningParts = countMeaningParts(word.definition);
  const missedAnswers = Math.max(word.review_count - word.correct_count, 0);

  let score = 0;
  if (letters > 11) score += 2;
  else if (letters > 7) score += 1;
  if (hasPhraseShape) score += 1;
  if (isPhrase) score += 1;
  if (meaningParts >= 3) score += 1;
  if (word.definition.trim().length > 48) score += 1;
  if (missedAnswers >= 3) score += 2;
  else if (missedAnswers > 0) score += 1;
  if (word.correct_count >= 4) score -= 1;
  if (word.interval_days >= 14) score -= 1;

  if (score >= 4) return "hard";
  if (score >= 2) return "medium";
  return "easy";
}
