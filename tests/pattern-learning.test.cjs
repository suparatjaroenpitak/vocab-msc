const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const compiled = ts.transpileModule(fs.readFileSync('lib/pattern-learning.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const exported = { exports: {} };
new Function('exports', compiled)(exported.exports);
const { isSentencePattern, selectPatternSession, patternTokens, shufflePatternTokens, isPatternAnswer, advancePatternQueue } = exported.exports;
const now = Date.parse('2026-11-21T10:00:00Z');
function word(id, overrides = {}) {
  return { id, category_name: 'pattle กลุ่มประโยค', correct_count: 0, review_count: 0, due_at: '2026-11-20T00:00:00Z', ...overrides };
}

test('only due unmastered patterns enter recommended sessions, weak reviews before new items', () => {
  const words = [word(1), word(2, { review_count: 3, correct_count: 2 }), word(3, { review_count: 5, correct_count: 1 }),
    word(4, { category_name: 'TOEIC' }), word(5, { due_at: '2026-11-22T00:00:00Z' }), word(6, { correct_count: 7 }), word(7, { category_name: null })];
  assert.deepEqual(selectPatternSession(words, 5, now).map((item) => item.id), [3, 2, 1]);
  assert.deepEqual(selectPatternSession(words, 2, now).map((item) => item.id), [3, 2]);
  assert.equal(isSentencePattern(word(8, { category_name: ' pattle กลุ่มประโยค ' })), true);
});

test('grammar placeholders, contractions and repeated words remain intact', () => {
  const term = "The more you + V1 ... , the more you + V1 ...";
  const tokens = patternTokens(term);
  assert.equal(tokens.filter((token) => token.text === '+ V1').length, 2);
  assert.equal(patternTokens("I'll stop + V-ing ...")[0].text, "I'll");
  assert.equal(isPatternAnswer(term, tokens), true);
  const shuffled = shufflePatternTokens(tokens, () => 0.999);
  assert.notDeepEqual(shuffled.map((token) => token.text), tokens.map((token) => token.text));
  assert.deepEqual(shuffled.map((token) => token.id).sort((a, b) => a - b), tokens.map((token) => token.id));
  const duplicate = [...tokens];
  duplicate[7] = tokens[2];
  assert.equal(isPatternAnswer(term, duplicate), false);
  assert.equal(isPatternAnswer(term, tokens.slice(1)), false);
});

test('all seeded patterns can be assembled and shuffled without losing any tokens', () => {
  const text = fs.readFileSync('lib/sentence-pattern-vocabulary.ts', 'utf8');
  const patterns = text.split(/\r?\n/).filter((line) => /^\s*\{"term"/.test(line)).map((line) => JSON.parse(line.trim().replace(/,$/, '')));
  assert.equal(patterns.length, 997);
  for (const pattern of patterns) {
    const tokens = patternTokens(pattern.term);
    assert.equal(isPatternAnswer(pattern.term, tokens), true);
    const shuffled = shufflePatternTokens(tokens);
    assert.equal(shuffled.length, tokens.length);
    assert.equal(new Set(shuffled.map((token) => token.id)).size, tokens.length);
    if (new Set(tokens.map((token) => token.text)).size > 1) assert.equal(isPatternAnswer(pattern.term, shuffled), false);
  }
});

test('missed patterns reappear after other cards and stop after three rounds', () => {
  const queue = [1, 2, 3, 4].map((wordId) => ({ wordId, round: 1 }));
  assert.deepEqual(advancePatternQueue(queue, true).map((turn) => turn.wordId), [2, 3, 1, 4]);
  assert.equal(queue.length, 4);
  let single = [{ wordId: 1, round: 1 }];
  single = advancePatternQueue(single, true);
  assert.equal(single[0].round, 2);
  single = advancePatternQueue(single, true);
  assert.equal(single[0].round, 3);
  assert.deepEqual(advancePatternQueue(single, true), []);
  assert.deepEqual(advancePatternQueue([{ wordId: 1, round: 1 }], false), []);
});
