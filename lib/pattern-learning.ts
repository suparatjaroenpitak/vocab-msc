import type { Word } from "./types";

export const SENTENCE_PATTERN_CATEGORY = "pattle กลุ่มประโยค";
export const MAX_PATTERN_ROUNDS = 3;

export function isSentencePattern(word: Pick<Word, "category_name">) {
  return word.category_name?.trim().toLowerCase() === SENTENCE_PATTERN_CATEGORY;
}

// Review due, previously studied patterns first; introduce new patterns in seed order.
export function selectPatternSession(words: Word[], size: number, now = Date.now()) {
  return words.filter((word) => isSentencePattern(word) && word.correct_count < 7 && Date.parse(word.due_at) <= now)
    .sort((a, b) => Number(b.review_count > 0) - Number(a.review_count > 0)
      || (b.review_count - b.correct_count) - (a.review_count - a.correct_count)
      || a.correct_count - b.correct_count
      || a.due_at.localeCompare(b.due_at) || a.id - b.id)
    .slice(0, size);
}

export type PatternToken = { id: number; text: string };

export function patternTokens(term: string): PatternToken[] {
  // Keep grammar slots together so + V-ing is learned as one usable chunk.
  return (term.match(/\+\s*(?:V-ing|V-s\/es|V[123]|Adj|N)\b|\S+/g) ?? [])
    .map((text, id) => ({ id, text }));
}

export function shufflePatternTokens(tokens: PatternToken[], random = Math.random): PatternToken[] {
  const result = [...tokens];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  // Avoid accidentally handing the learner the complete answer.
  if (result.every((token, i) => token.text === tokens[i].text)) {
    const different = result.findIndex((token) => token.text !== result[0]?.text);
    if (different > 0) [result[0], result[different]] = [result[different], result[0]];
  }
  return result;
}

export function isPatternAnswer(term: string, selected: PatternToken[]) {
  const expected = patternTokens(term);
  return selected.length === expected.length
    && new Set(selected.map((token) => token.id)).size === selected.length
    && selected.every((token, i) => token.text === expected[i].text);
}

export type PatternTurn = { wordId: number; round: number };

export function advancePatternQueue(queue: PatternTurn[], needsPractice: boolean): PatternTurn[] {
  const [current, ...remaining] = queue;
  if (!current) return [];
  if (needsPractice && current.round < MAX_PATTERN_ROUNDS) {
    // Place two other patterns in between where possible, instead of immediate repetition.
    remaining.splice(Math.min(2, remaining.length), 0, { ...current, round: current.round + 1 });
  }
  return remaining;
}
