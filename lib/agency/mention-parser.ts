/** Tokens after @, trimmed, deduped, order preserved. */
const PUNCTUATION = /[,.;:!?…]/;
const TRAILING_CONJUNCTION = /\s+(e|ou)$/i;

export function extractMentionTokens(text: string): string[] {
  const atIndexes: number[] = [];
  const startRe = /(^|[\s(["'])@/g;
  let match: RegExpExecArray | null;
  while ((match = startRe.exec(text)) !== null) {
    atIndexes.push(match.index + match[1].length);
  }

  const tokens: string[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < atIndexes.length; i++) {
    const from = atIndexes[i] + 1;
    const untilNextAt =
      i + 1 < atIndexes.length ? atIndexes[i + 1] : text.length;
    let raw = text.slice(from, untilNextAt);
    const punct = raw.search(PUNCTUATION);
    if (punct !== -1) {
      raw = raw.slice(0, punct);
    }

    let token = raw.trim();
    if (i + 1 < atIndexes.length) {
      token = token.replace(TRAILING_CONJUNCTION, "").trim();
    }
    if (!token || seen.has(token)) continue;

    seen.add(token);
    tokens.push(token);
  }

  return tokens;
}
