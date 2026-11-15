import type { ParsedWord } from "@/lib/types";

function cleanValue(value: string) {
  return value
    .trim()
    .replace(/[\\]+$/g, "")
    .replace(/&nbsp;|&#x20;/gi, " ")
    .replace(/\u200b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function fromJson(text: string): ParsedWord[] | null {
  const jsonText = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  if (!jsonText.startsWith("[") && !jsonText.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(jsonText) as unknown;
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
    let line = cleanValue(rawLine)
      .replace(/^```(?:text|markdown)?\s*$/i, "")
      .replace(/^>\s*/, "")
      .replace(/^\s*(?:\d+\s*\\?[.)]|[-*•])\s*/, "")
      .replace(/^\s*[-*•]\s*/, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .trim();
    if (!line || /^(-{2,}|={2,}|คำศัพท์\s*(?:-|:)|vocabulary\s*(?:-|:)|word\s*,)/i.test(line)) continue;

    const separator = line.match(/\s+(?:-|–|—)\s+|\t+|\s*:\s*|\s+→\s+|\s*,\s*/);
    const separatorIndex = separator?.index;
    if (!separator || separatorIndex === undefined) continue;
    const left = cleanValue(line.slice(0, separatorIndex));
    const right = cleanValue(line.slice(separatorIndex + separator[0].length));
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
