import { containsPhrase, tokenize } from './text';

/** One `+`/`-` part of a rule: any of its alternatives (each a token phrase). */
type Part = string[][];

export interface CompiledRule {
  source: string;
  required: Part[];
  excluded: Part[];
}

function compilePart(text: string): Part {
  return text
    .split('/')
    .map((alt) => tokenize(alt.trim().replace(/^["']|["']$/g, '')))
    .filter((phrase) => phrase.length > 0);
}

/**
 * Parse one rule. Operators need surrounding spaces so hyphenated words like
 * "e-commerce" stay intact:
 *   `a/b + c - d`  →  (a or b) and c, and not d — all within one field.
 */
export function compileRule(source: string): CompiledRule | null {
  const pieces = source.trim().split(/\s+([+-])\s+/);
  const required: Part[] = [];
  const excluded: Part[] = [];
  let op = '+';
  for (let i = 0; i < pieces.length; i++) {
    if (i % 2 === 1) {
      op = pieces[i]!;
      continue;
    }
    const part = compilePart(pieces[i]!);
    if (part.length === 0) continue;
    (op === '+' ? required : excluded).push(part);
  }
  return required.length > 0 ? { source, required, excluded } : null;
}

export function compileRules(sources: string[]): CompiledRule[] {
  return sources.map(compileRule).filter((rule): rule is CompiledRule => rule !== null);
}

function partMatches(tokens: string[], part: Part): boolean {
  return part.some((phrase) => containsPhrase(tokens, phrase));
}

export function ruleMatches(tokens: string[], rule: CompiledRule): boolean {
  return rule.required.every((part) => partMatches(tokens, part)) && !rule.excluded.some((part) => partMatches(tokens, part));
}

export function firstMatch(tokens: string[], rules: CompiledRule[]): CompiledRule | undefined {
  return rules.find((rule) => ruleMatches(tokens, rule));
}

/** Every phrase that appears as a required alternative in `rules`. */
export function vocabulary(rules: CompiledRule[]): string[][] {
  return rules.flatMap((rule) => rule.required.flat());
}

/** Explain why a rule line is invalid, or return null if it's fine. */
export function validateRule(source: string): string | null {
  if (!source.trim()) return null;
  return compileRule(source) ? null : 'Needs at least one word to match.';
}
