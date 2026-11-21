const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const compiled = ts.transpileModule(fs.readFileSync('lib/vocabulary-learning.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const exported = { exports: {} };
new Function('exports', compiled)(exported.exports);
const { selectVocabularySession, vocabularyLetters, shuffleVocabularyLetters, isVocabularyAnswer, advanceVocabularyQueue } = exported.exports;
const now = Date.parse('2026-11-21T10:00:00Z');
function word(id, overrides = {}) {
  return { id, correct_count: 0, review_count: 0, due_at: '2026-11-20T00:00:00Z', ...overrides };
}

test('vocabulary sessions contain due unmastered words and prioritize weak reviews', () => {
  const words = [word(1), word(2, { review_count: 3, correct_count: 2 }), word(3, { review_count: 5, correct_count: 1 }),
    word(4, { due_at: '2026-11-22T00:00:00Z' }), word(5, { correct_count: 7 })];
  assert.deepEqual(selectVocabularySession(words, 5, now).map((item) => item.id), [3, 2, 1]);
  assert.deepEqual(selectVocabularySession(words, 2, now).map((item) => item.id), [3, 2]);
});

test('letters are shuffled without losing characters and answer matching ignores spaces', () => {
  const letters = vocabularyLetters('full-time job');
  assert.equal(letters.length, 12);
  const shuffled = shuffleVocabularyLetters(letters, () => 0.999);
  assert.deepEqual(shuffled.map((letter) => letter.id).sort((a, b) => a - b), letters.map((letter) => letter.id));
  assert.equal(isVocabularyAnswer('full-time job', letters), true);
  assert.equal(isVocabularyAnswer('full-time job', shuffled), false);
  assert.equal(isVocabularyAnswer('full-time job', letters.slice(1)), false);
});

test('missed vocabulary returns after other words and stops after three rounds', () => {
  const queue = [1, 2, 3, 4].map((wordId) => ({ wordId, round: 1 }));
  assert.deepEqual(advanceVocabularyQueue(queue, true).map((turn) => turn.wordId), [2, 3, 1, 4]);
  assert.equal(queue.length, 4);
  let single = [{ wordId: 1, round: 1 }];
  single = advanceVocabularyQueue(single, true);
  assert.equal(single[0].round, 2);
  single = advanceVocabularyQueue(single, true);
  assert.equal(single[0].round, 3);
  assert.deepEqual(advanceVocabularyQueue(single, true), []);
});
