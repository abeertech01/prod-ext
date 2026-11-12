import { describe, expect, it } from 'vitest';
import { compileFilter, decide } from '../filter/engine';
import { DEFAULT_SETTINGS } from './defaults';
import { addBrainrotExceptions } from './migrations';

const filter = compileFilter(DEFAULT_SETTINGS.filter);
const verdict = (title: string) => decide({ title }, false, filter, 'full');

describe('brainrot rules', () => {
  it('shows brainrot videos about productivity, mindset, hustle or inspiration', () => {
    expect(verdict('How to beat brainrot: a productivity system that works')).toEqual({ verdict: 'show', reason: 'included' });
    expect(verdict('Brain rot is killing your mindset')).toEqual({ verdict: 'show', reason: 'included' });
  });

  it('still hides plain brainrot content', () => {
    expect(verdict('Ultimate brainrot compilation 2026')).toMatchObject({ verdict: 'hide', reason: 'distraction' });
  });

  it('is not shown from a trusted channel only because of the veto rule', () => {
    expect(decide({ title: 'brainrot' }, true, filter, 'full')).toEqual({ verdict: 'show', reason: 'allow-listed' });
  });
});

describe('v2 settings migration', () => {
  const v1 = {
    filter: {
      enabled: true,
      keys: {
        business: { enabled: true, rules: ['business'] },
        distraction: { enabled: true, rules: ['drama', 'brainrot'] },
      },
    },
  };

  it('updates the original brainrot rule and adds the matching Key 1 rule', () => {
    const v2 = addBrainrotExceptions(v1);
    expect(v2.filter.keys.distraction?.rules).toEqual(['drama', 'brainrot/brain rot - productivity/mindset/hustle/inspiration']);
    expect(v2.filter.keys.business?.rules).toEqual(['business', 'brainrot/brain rot + productivity/mindset/hustle/inspiration']);
  });

  it('leaves edited lists and empty storage alone', () => {
    const edited = { filter: { keys: { distraction: { enabled: true, rules: ['brainrot - study'] } } } };
    expect(addBrainrotExceptions(edited)).toBe(edited);
    expect(addBrainrotExceptions(null)).toBeNull();
  });
});
