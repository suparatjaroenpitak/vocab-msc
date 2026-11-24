const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');

const compiled = ts.transpileModule(fs.readFileSync('lib/word-difficulty.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const exported = { exports: {} };
new Function('exports', compiled)(exported.exports);
const { getWordDifficulty } = exported.exports;

function word(overrides = {}) {
  return {
    term: 'calendar',
    part_of_speech: 'n.',
    definition: 'ปฏิทิน',
    review_count: 0,
    correct_count: 0,
    interval_days: 0,
    ...overrides
  };
}

test('difficulty separates simple, medium and complex review words', () => {
  assert.equal(getWordDifficulty(word({ term: 'job', definition: 'งาน' })), 'easy');
  assert.equal(getWordDifficulty(word({ term: 'authorization', definition: 'การอนุญาตอย่างเป็นทางการ' })), 'medium');
  assert.equal(getWordDifficulty(word({ term: 'fall all over themselves', part_of_speech: 'phrase', definition: 'แสดงความสนใจหรือกระตือรือร้นอย่างมาก และมีหลายความหมาย' })), 'hard');
});

test('repeatedly missed words become hard while mastered words become easier', () => {
  const term = 'authorization';
  const baseline = getWordDifficulty(word({ term, definition: 'การอนุญาตอย่างเป็นทางการ' }));
  const missed = getWordDifficulty(word({ term, definition: 'การอนุญาตอย่างเป็นทางการ', review_count: 5, correct_count: 1 }));
  const mastered = getWordDifficulty(word({ term, definition: 'การอนุญาตอย่างเป็นทางการ', review_count: 6, correct_count: 5, interval_days: 21 }));
  assert.equal(baseline, 'medium');
  assert.equal(missed, 'hard');
  assert.equal(mastered, 'easy');
});
