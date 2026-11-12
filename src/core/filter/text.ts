/** Separates fields joined into one token stream so phrases can't span them. */
export const FIELD_BREAK = '\u0000';

const WORD = /[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu;

/**
 * Lower-cased whole-word tokens. Hyphens and punctuation split words;
 * apostrophes don't ("won't" → "wont"), and a possessive "'s" is dropped so
 * "Apple's" still matches "apple".
 */
export function tokenize(text: string): string[] {
  const normalized = text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'");
  const tokens: string[] = [];
  for (const match of normalized.matchAll(WORD)) {
    let token = match[0];
    if (token.endsWith("'s")) token = token.slice(0, -2);
    tokens.push(token.replace(/'/g, ''));
  }
  return tokens;
}

/** Tokens for a multi-valued field such as tags, without cross-value phrases. */
export function tokenizeList(values: string[]): string[] {
  return values.flatMap((value, i) => (i === 0 ? tokenize(value) : [FIELD_BREAK, ...tokenize(value)]));
}

export function containsPhrase(tokens: string[], phrase: string[]): boolean {
  if (phrase.length === 0 || phrase.length > tokens.length) return false;
  outer: for (let i = 0; i <= tokens.length - phrase.length; i++) {
    for (let j = 0; j < phrase.length; j++) {
      if (tokens[i + j] !== phrase[j]) continue outer;
    }
    return true;
  }
  return false;
}
