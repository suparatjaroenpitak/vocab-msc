"use client";
// Temporary local QA harness. Removed after checking the flow.
import { useState } from "react";
import { PatternLearningView } from "@/components/pattern-learning";
import { SENTENCE_PATTERN_VOCABULARY } from "@/lib/sentence-pattern-vocabulary";
import type { Word } from "@/lib/types";
const stop = () => {};
export default function Preview() {
  const [fail, setFail] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [words, setWords] = useState<Word[]>(SENTENCE_PATTERN_VOCABULARY.map((word, index) => ({ ...word, id: index + 1, category_id: 3, category_name: "pattle กลุ่มประโยค", interval_days: 0, review_count: 0, correct_count: 0, example: null, last_reviewed: null, created_at: '2026-01-01T00:00:00Z', due_at: '2026-01-01T00:00:00Z' })));
  return <main className="mx-auto max-w-4xl px-5"><label><input type="checkbox" checked={fail} onChange={(e) => setFail(e.target.checked)} /> Simulate save failure</label><output className="block" aria-label="QA log">{log.join(' | ')}</output><PatternLearningView words={words} loading={false} onStopSpeech={stop} onSpeak={async (_text, lang) => setLog((logs) => [...logs, `audio:${lang}`])} onReview={async (id, rating) => { if (fail) throw Error('QA: save failed'); setLog((logs) => [...logs, `saved:${id}:${rating}`]); setWords((items) => items.map((word) => word.id === id ? { ...word, review_count: word.review_count + 1, correct_count: word.correct_count + (rating === 'known' ? 1 : 0), due_at: '2099-01-01T00:00:00Z' } : word)); }} /></main>;
}
