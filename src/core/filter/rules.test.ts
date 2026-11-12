import { describe, expect, it } from 'vitest';
import { compileRule, ruleMatches } from './rules';
import { tokenize } from './text';

describe('rules', () => {
  it('parses alternatives, required and excluded parts', () => {
    const rule = compileRule('react + programming/code - drama')!;
    expect(rule.required).toHaveLength(2);
    expect(rule.excluded).toHaveLength(1);
    expect(ruleMatches(tokenize('React code review'), rule)).toBe(true);
    expect(ruleMatches(tokenize('React code drama'), rule)).toBe(false);
  });

  it('keeps hyphenated words intact', () => {
    const rule = compileRule('self-improvement')!;
    expect(rule.required).toHaveLength(1);
    expect(ruleMatches(tokenize('Self improvement tips'), rule)).toBe(true);
  });

  it('strips surrounding quotes and handles apostrophes', () => {
    const rule = compileRule('"you won\'t believe"')!;
    expect(ruleMatches(tokenize('You won’t BELIEVE this'), rule)).toBe(true);
  });

  it('rejects empty rules', () => {
    expect(compileRule('  ')).toBeNull();
    expect(compileRule('+ +')).toBeNull();
  });
});
