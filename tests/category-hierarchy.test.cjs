const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const compiled = ts.transpileModule(fs.readFileSync('lib/category-hierarchy.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const exported = { exports: {} };
new Function('exports', compiled)(exported.exports);
const { TOEIC_CATEGORY, GOVERNMENT_CATEGORY, suggestMainCategoryName, suggestSubcategoryName, getSeedSubcategoryName } = exported.exports;

test('category suggestions keep TOEIC and government vocabulary under separate parents', () => {
  assert.equal(suggestMainCategoryName('municipal', 'adj.', 'เกี่ยวกับเทศบาล'), GOVERNMENT_CATEGORY);
  assert.equal(suggestMainCategoryName('appointment', 'n.', 'การนัดหมาย'), TOEIC_CATEGORY);
  assert.equal(suggestSubcategoryName(GOVERNMENT_CATEGORY, 'football', 'n.', 'กีฬา'), 'กีฬา');
  assert.equal(suggestSubcategoryName(GOVERNMENT_CATEGORY, 'reliable', 'adj.', 'เชื่อถือได้'), 'ทั่วไป');
});

test('seeded TOEIC blocks receive stable subcategories', () => {
  assert.equal(getSeedSubcategoryName(TOEIC_CATEGORY, 0, 'appointment', 'n.', 'การนัดหมาย'), 'สำนักงานและงานธุรการ');
  assert.equal(getSeedSubcategoryName(TOEIC_CATEGORY, 50, 'applicant', 'n.', 'ผู้สมัครงาน'), 'งานและอาชีพ');
  assert.equal(getSeedSubcategoryName(TOEIC_CATEGORY, 450, 'accurate', 'adj.', 'ถูกต้อง'), 'คำคุณศัพท์และคำวิเศษณ์');
});
