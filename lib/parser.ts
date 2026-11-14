import type { ParsedWord } from "@/lib/types";

function cleanValue(value: string) {
  return value.replace(/[\\]+$/g, "").replace(/\s+/g, " ").trim();
}

function fromJson(text: string): ParsedWord[] | null {
  if (!text.trim().startsWith("[") && !text.trim().startsWith("{")) return null;
  try {
    const parsed = JSON.parse(text) as unknown;
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    const result = rows
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const item = row as Record<string, unknown>;
        const term = String(item.term ?? item.word ?? item.vocabulary ?? "");
        const definition = String(item.definition ?? item.meaning ?? item.translation ?? "");
        if (!term || !definition) return null;
        return {
          term: cleanValue(term),
          partOfSpeech: cleanValue(String(item.partOfSpeech ?? item.pos ?? "")),
          definition: cleanValue(definition)
        };
      })
      .filter((row): row is ParsedWord => Boolean(row?.term && row.definition));
    return result.length ? result : null;
  } catch {
    return null;
  }
}

export function parseVocabulary(text: string): ParsedWord[] {
  const jsonResult = fromJson(text);
  if (jsonResult) return jsonResult;

  const rows: ParsedWord[] = [];
  for (const rawLine of text.replace(/\r/g, "").split("\n")) {
    let line = rawLine.replace(/[\\]+$/g, "").trim();
    if (!line || /^(-{2,}|={2,}|คำศัพท์|vocabulary|word\s*,)/i.test(line)) continue;
    line = line.replace(/^\s*(?:\d+\s*\\?[.)]|[-*•])\s*/, "");

    const separator = line.match(/\s+(?:-|–|—)\s+|\t+|\s+:\s+/);
    if (!separator || separator.index === undefined) continue;
    const left = cleanValue(line.slice(0, separator.index));
    const right = cleanValue(line.slice(separator.index + separator[0].length));
    if (!left || !right) continue;

    const posMatch = left.match(/\s+\(([^)]+)\)\s*$/);
    const partOfSpeech = posMatch ? cleanValue(posMatch[1]) : "";
    const term = cleanValue(posMatch ? left.slice(0, posMatch.index) : left);
    if (!term || !right || term.length > 120) continue;
    rows.push({ term, partOfSpeech, definition: right });
  }

  const unique = new Map<string, ParsedWord>();
  for (const row of rows) unique.set(row.term.toLowerCase(), row);
  return Array.from(unique.values());
}
