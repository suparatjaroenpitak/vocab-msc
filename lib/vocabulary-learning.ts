import type { Word } from "./types";

export const MAX_VOCABULARY_ROUNDS = 3;

export function selectVocabularySession(words: Word[], size: number, now = Date.now()) {
  return words
    .filter((word) => word.correct_count < 7 && Date.parse(word.due_at) <= now)
    .sort((a, b) => Number(b.review_count > 0) - Number(a.review_count > 0)
      || (b.review_count - b.correct_count) - (a.review_count - a.correct_count)
      || a.correct_count - b.correct_count
      || a.due_at.localeCompare(b.due_at)
      || a.id - b.id)
    .slice(0, size);
}

export type VocabularyLetter = { id: number; text: string };

export function vocabularyLetters(term: string): VocabularyLetter[] {
  return Array.from(term.trim())
    .filter((character) => !/\s/.test(character))
    .map((text, id) => ({ id, text }));
}

export function shuffleVocabularyLetters(letters: VocabularyLetter[], random = Math.random): VocabularyLetter[] {
  const result = [...letters];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  if (result.every((letter, index) => letter.text === letters[index]?.text)) {
    const different = result.findIndex((letter) => letter.text !== result[0]?.text);
    if (different > 0) [result[0], result[different]] = [result[different], result[0]];
  }
  return result;
}

function normalizeVocabularyText(text: string) {
  return Array.from(text).filter((character) => !/\s/.test(character)).join("").toLocaleLowerCase();
}

export function isVocabularyAnswer(term: string, selected: VocabularyLetter[]) {
  const expected = vocabularyLetters(term);
  return selected.length === expected.length
    && new Set(selected.map((letter) => letter.id)).size === selected.length
    && normalizeVocabularyText(selected.map((letter) => letter.text).join("")) === normalizeVocabularyText(term);
}

export type VocabularyTurn = { wordId: number; round: number };

export function advanceVocabularyQueue(queue: VocabularyTurn[], needsPractice: boolean): VocabularyTurn[] {
  const [current, ...remaining] = queue;
  if (!current) return [];
  if (needsPractice && current.round < MAX_VOCABULARY_ROUNDS) {
    remaining.splice(Math.min(2, remaining.length), 0, { ...current, round: current.round + 1 });
  }
  return remaining;
}
