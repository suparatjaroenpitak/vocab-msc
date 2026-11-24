const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const source = fs.readFileSync(
  path.join(__dirname, "..", "lib", "prefix-vocabulary.ts"),
  "utf8",
);

function parseGroups(section) {
  return section
    .split("\n")
    .filter((line) => line.trimStart().startsWith("{ prefix:"))
    .map((line) => {
      const match = line.match(/examples: (\[\[.*\]\])/);
      assert.ok(match, `Unable to parse root group: ${line}`);
      return JSON.parse(match[1]);
    });
}

test("root vocabulary contains 500 unique prefix and 500 unique suffix words", () => {
  const [prefixSource, suffixSource] = source.split(
    "export const SUFFIX_GROUPS",
  );
  const prefixGroups = parseGroups(prefixSource);
  const suffixGroups = parseGroups(suffixSource);
  const prefixWords = prefixGroups.flat();
  const suffixWords = suffixGroups.flat();
  const allTerms = [...prefixWords, ...suffixWords].map(([term]) =>
    term.toLowerCase(),
  );

  assert.equal(prefixGroups.length, 25);
  assert.equal(suffixGroups.length, 25);
  assert.ok(prefixGroups.every((group) => group.length === 20));
  assert.ok(suffixGroups.every((group) => group.length === 20));
  assert.equal(prefixWords.length, 500);
  assert.equal(suffixWords.length, 500);
  assert.equal(allTerms.length, 1000);
  assert.equal(new Set(allTerms).size, 1000);
});
