import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from './defaults';
import { withDefaults } from './merge';

describe('settings merge', () => {
  it('fills missing keys from defaults and keeps user values', () => {
    const merged = withDefaults({ shorts: { allowedScrolls: 3 }, filter: { keys: { tech: { enabled: true, rules: ['only mine'] } } } });
    expect(merged.shorts.allowedScrolls).toBe(3);
    expect(merged.filter.enabled).toBe(DEFAULT_SETTINGS.filter.enabled);
    expect(merged.filter.keys.tech.rules).toEqual(['only mine']);
    expect(merged.filter.keys.business.rules).toEqual(DEFAULT_SETTINGS.filter.keys.business.rules);
  });

  it('returns defaults for empty storage', () => {
    expect(withDefaults(null)).toEqual(DEFAULT_SETTINGS);
  });
});
