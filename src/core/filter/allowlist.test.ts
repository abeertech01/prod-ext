import { describe, expect, it } from 'vitest';
import { buildAllowSet, isAllowListed, parseChannelInput } from './allowlist';

describe('allow-list', () => {
  const subs = [{ id: 'UCaaaaaaaaaaaaaaaaaaaaaa', handle: '@SubOne', name: 'Sub One' }];
  const manual = [{ handle: '@manual', name: 'Manual', addedAt: 0 }];

  it('combines subscriptions and manual entries', () => {
    const set = buildAllowSet(subs, manual, [], true);
    expect(isAllowListed(set, { handle: '@subone' })).toBe(true);
    expect(isAllowListed(set, { id: 'UCaaaaaaaaaaaaaaaaaaaaaa' })).toBe(true);
    expect(isAllowListed(set, { handle: '@MANUAL' })).toBe(true);
    expect(isAllowListed(set, { handle: '@other' })).toBe(false);
  });

  it('respects exclusions and the subscriptions toggle', () => {
    expect(isAllowListed(buildAllowSet(subs, manual, ['@subone'], true), { id: 'UCaaaaaaaaaaaaaaaaaaaaaa' })).toBe(false);
    expect(isAllowListed(buildAllowSet(subs, manual, [], false), { handle: '@subone' })).toBe(false);
  });

  it('zero subscriptions means nothing is allow-listed', () => {
    expect(isAllowListed(buildAllowSet([], [], [], true), { handle: '@x' })).toBe(false);
  });

  it('parses handles, IDs and URLs', () => {
    expect(parseChannelInput('https://www.youtube.com/@Fireship/videos')).toEqual({ handle: '@fireship' });
    expect(parseChannelInput('@Fireship')).toEqual({ handle: '@fireship' });
    expect(parseChannelInput('youtube.com/channel/UCsBjURrPoezykLs9EqgamOA')).toEqual({ id: 'UCsBjURrPoezykLs9EqgamOA' });
    expect(parseChannelInput('UCsBjURrPoezykLs9EqgamOA')).toEqual({ id: 'UCsBjURrPoezykLs9EqgamOA' });
    expect(parseChannelInput('not a channel!')).toBeNull();
  });
});
