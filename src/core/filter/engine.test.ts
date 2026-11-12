import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../settings/defaults';
import type { FilterKeyId, Settings } from '../settings/schema';
import { compileFilter, decide, type VideoText } from './engine';

function filterWith(enabled: Partial<Record<FilterKeyId, boolean>>, base = DEFAULT_SETTINGS.filter): Settings['filter'] {
  const keys = structuredClone(base.keys);
  for (const id of Object.keys(keys) as FilterKeyId[]) keys[id].enabled = enabled[id] ?? false;
  return { ...base, keys };
}

const all = compileFilter(filterWith({ business: true, tech: true, distraction: true, selfHelp: true }));
const v = (title: string, description?: string, tags?: string[]): VideoText => ({ title, description, tags });

describe('filter engine', () => {
  it('shows everything when filtering is off', () => {
    const f = compileFilter({ ...DEFAULT_SETTINGS.filter, enabled: false });
    expect(decide(v('Insane PRANK gone wrong'), false, f, 'title')).toMatchObject({ verdict: 'show' });
  });

  it('shows everything when no key is enabled', () => {
    const f = compileFilter(filterWith({}));
    expect(decide(v('Cute cats'), false, f, 'title')).toMatchObject({ verdict: 'show' });
  });

  it('includes on Key 1 or Key 2 (OR)', () => {
    expect(decide(v('How the Stock Market really works'), false, all, 'title')).toMatchObject({ verdict: 'show', reason: 'included' });
    expect(decide(v('New NVIDIA GPU review'), false, all, 'title')).toMatchObject({ verdict: 'show' });
  });

  it('is whole-word and case-insensitive, not substring', () => {
    // "sales" must not match "wholesalers"; "ar" must not match "car".
    expect(decide(v('Best car for wholesalers'), false, all, 'full')).toMatchObject({ verdict: 'hide', reason: 'no-match' });
    expect(decide(v('BUSINESS lessons'), false, all, 'title')).toMatchObject({ verdict: 'show' });
  });

  it('handles possessives and hyphenated phrases', () => {
    expect(decide(v("Apple's new event"), false, all, 'title')).toMatchObject({ verdict: 'show' });
    expect(decide(v('Starting an E-Commerce store'), false, all, 'title')).toMatchObject({ verdict: 'show' });
  });

  it('is undecided at title stage, then decides on description/tags', () => {
    const video = v('My morning routine', 'I talk about my startup journey');
    expect(decide(video, false, all, 'title')).toEqual({ verdict: 'undecided' });
    expect(decide(video, false, all, 'full')).toMatchObject({ verdict: 'show' });
    expect(decide(v('My morning routine', 'just vibes'), false, all, 'full')).toMatchObject({ verdict: 'hide', reason: 'no-match' });
  });

  it('requires ambiguous tech words to pair within the same field', () => {
    expect(decide(v('Python'), false, all, 'full')).toMatchObject({ verdict: 'hide' });
    expect(decide(v('Python tutorial for beginners'), false, all, 'title')).toMatchObject({ verdict: 'show' });
    // Pair split across fields doesn't count.
    expect(decide(v('Rust', 'a tutorial on painting'), false, all, 'full')).toMatchObject({ verdict: 'hide' });
    // Not adjacent is fine.
    expect(decide(v('Go: a quick tour of the language for code reviewers'), false, all, 'title')).toMatchObject({ verdict: 'show' });
  });

  it('tags: phrases do not span separate tags, but pairs within the tags field do', () => {
    expect(decide(v('x', '', ['swift', 'tutorial']), false, all, 'full')).toMatchObject({ verdict: 'show' });
    expect(decide(v('x', '', ['wall', 'street']), false, all, 'full')).toMatchObject({ verdict: 'hide' });
  });

  it('Key 3 vetoes last, overriding inclusion', () => {
    expect(decide(v('Startup founder drama exposed'), false, all, 'title')).toMatchObject({ verdict: 'hide', reason: 'distraction' });
    expect(decide(v('Tech news', 'gone wrong compilation'), false, all, 'full')).toMatchObject({ verdict: 'hide', reason: 'distraction' });
  });

  it('does not veto React programming content as a "react" video', () => {
    expect(decide(v('React tutorial: hooks explained'), false, all, 'title')).toMatchObject({ verdict: 'show' });
    expect(decide(v('I react to the craziest videos'), false, all, 'title')).toMatchObject({ verdict: 'hide', reason: 'distraction' });
  });

  it('Key 3 only: everything except Key 3 matches', () => {
    const f = compileFilter(filterWith({ distraction: true }));
    expect(decide(v('Cute cats'), false, f, 'title')).toMatchObject({ verdict: 'show' });
    expect(decide(v('Try not to laugh challenge'), false, f, 'title')).toMatchObject({ verdict: 'hide' });
  });

  it('Key 4 pairs with a Key 1/2 word, never alone', () => {
    const f = compileFilter(filterWith({ business: true, selfHelp: true }));
    expect(decide(v('Discipline', 'daily discipline tips'), false, f, 'full')).toMatchObject({ verdict: 'hide' });
    // "python" alone doesn't include, but pairs with a self-help word.
    const tech = compileFilter(filterWith({ tech: true, selfHelp: true }));
    expect(decide(v('Productivity system for python'), false, tech, 'title')).toMatchObject({ verdict: 'show' });
    const techNo4 = compileFilter(filterWith({ tech: true }));
    expect(decide(v('Productivity system for python'), false, techNo4, 'full')).toMatchObject({ verdict: 'hide' });
  });

  it('Key 4 has no standalone mode', () => {
    const f = compileFilter(filterWith({ selfHelp: true }));
    // Behaves like "no keys": nothing filtered.
    expect(decide(v('Random vlog'), false, f, 'title')).toMatchObject({ verdict: 'show' });
  });

  it('allow-listed channels skip keywords, except the safety veto', () => {
    expect(decide(v('Daily vlog prank drama'), true, all, 'title')).toMatchObject({ verdict: 'show', reason: 'allow-listed' });
    expect(decide(v('Date night GONE SEXUAL'), true, all, 'title')).toMatchObject({ verdict: 'hide', reason: 'safety' });
  });

  it('safety veto applies even with Key 3 disabled', () => {
    const f = compileFilter(filterWith({ business: true }));
    expect(decide(v('Business trip gone sexual'), false, f, 'title')).toMatchObject({ verdict: 'hide', reason: 'safety' });
  });
});
