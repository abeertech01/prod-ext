import { describe, expect, it } from 'vitest';
import { checkStory, countStoryProfile, fbStoryVerdict, currentDaily, emptyDaily as empty, FACEBOOK_FEED, INSTAGRAM_FEED, loadMore as more, loadsLeft as left, planFeed, postKey, type DailyAllowance } from './daily';

const emptyDaily = (now: Date) => empty(now, FACEBOOK_FEED);
const loadMore = (d: DailyAllowance) => more(d, FACEBOOK_FEED);
const loadsLeft = (d: DailyAllowance) => left(d, FACEBOOK_FEED);

const day = new Date(2026, 10, 10, 9, 0);
const keys = (n: number, from = 0) => Array.from({ length: n }, (_, i) => `p${from + i}`);

describe('feed allowance', () => {
  it('shows one batch of 5, then holds the rest back', () => {
    const plan = planFeed(keys(12), emptyDaily(day));
    expect(plan).toEqual({ visible: 5, newlySeen: keys(5), capped: true });
  });

  it('each "Load more" adds 5, up to 35 a day with 6 clicks', () => {
    let daily = emptyDaily(day);
    expect(loadsLeft(daily)).toBe(6);
    for (let i = 0; i < 6; i++) daily = loadMore(daily);
    expect(daily.unlockedPosts).toBe(35);
    expect(loadsLeft(daily)).toBe(0);
    expect(loadMore(daily).unlockedPosts).toBe(35);
  });

  it('posts already seen today show again without using the allowance', () => {
    const daily: DailyAllowance = { ...emptyDaily(day), seenPosts: keys(5) };
    // After a reload the feed may start with old posts, then new ones.
    expect(planFeed([...keys(3), ...keys(4, 50)], daily)).toEqual({ visible: 3, newlySeen: [], capped: true });
    expect(planFeed([...keys(3), ...keys(4, 50)], loadMore(daily))).toEqual({ visible: 7, newlySeen: keys(4, 50), capped: false });
  });

  it('starts over the next day', () => {
    const yesterday: DailyAllowance = { ...emptyDaily(new Date(2026, 10, 9, 23, 0)), seenPosts: keys(20), unlockedPosts: 20 };
    expect(currentDaily(yesterday, day, FACEBOOK_FEED)).toEqual(emptyDaily(day));
    expect(currentDaily(yesterday, new Date(2026, 10, 9, 23, 59), FACEBOOK_FEED)).toBe(yesterday);
  });
});

describe('Instagram feed allowance', () => {
  it('shows 5, then one "Load more" reaches 10', () => {
    let daily = empty(day, INSTAGRAM_FEED);
    expect(planFeed(keys(8), daily)).toEqual({ visible: 5, newlySeen: keys(5), capped: true });
    expect(left(daily, INSTAGRAM_FEED)).toBe(1);
    daily = more(daily, INSTAGRAM_FEED);
    expect(daily.unlockedPosts).toBe(10);
    expect(left(daily, INSTAGRAM_FEED)).toBe(0);
    expect(more(daily, INSTAGRAM_FEED).unlockedPosts).toBe(10);
  });
});

describe('stories allowance', () => {
  const limited = { mode: 'limited' as const, profilesPerDay: 2 };

  it('counts profiles, not stories', () => {
    let daily = emptyDaily(day);
    for (const profile of ['ann', 'ann', 'bob', 'ann', 'bob']) {
      const res = checkStory(daily, profile, limited);
      expect(res.verdict).toBe('allowed');
      daily = res.daily;
    }
    expect(daily.storyProfiles).toEqual(['ann', 'bob']);
    expect(checkStory(daily, 'cat', limited).verdict).toBe('limit');
  });

  it('respects the hidden and no-limit settings', () => {
    const full = { ...emptyDaily(day), storyProfiles: ['a', 'b'] };
    expect(checkStory(full, 'z', { mode: 'hidden', profilesPerDay: 10 }).verdict).toBe('off');
    expect(checkStory(full, 'z', { mode: 'unlimited', profilesPerDay: 2 }).verdict).toBe('allowed');
    expect(checkStory(full, 'z', { mode: 'unlimited', profilesPerDay: 2 }).daily).toBe(full);
  });
});

describe('Facebook story count', () => {
  it('counts each person once, by link or by name', () => {
    let daily = emptyDaily(day);
    daily = countStoryProfile(daily, { key: '/ann', name: 'Ann Lee' });
    daily = countStoryProfile(daily, { key: '/ann', name: 'Ann Lee' });
    daily = countStoryProfile(daily, { key: 'profile.php?id=1', name: 'ann lee' });
    expect(daily.storyProfiles).toEqual(['/ann']);
    daily = countStoryProfile(daily, { key: '/bob', name: '' });
    daily = countStoryProfile(daily, { key: '/bob', name: 'Bob' });
    expect(daily.storyProfiles).toEqual(['/ann', '/bob']);
    expect(daily.storyNames).toEqual(['Ann Lee', '']);
  });

  it('people from this visit play again; from an earlier visit are blocked; new ones until the limit', () => {
    const ann = { key: '/ann', name: 'Ann' };
    const bob = { key: '/bob', name: 'Bob' };
    const cat = { key: '/cat', name: 'Cat' };
    let daily = countStoryProfile(emptyDaily(day), ann);
    const earlier = { storyProfiles: [] };
    expect(fbStoryVerdict(daily, earlier, ann, 2)).toBe('watched');
    expect(fbStoryVerdict(daily, earlier, { key: 'profile.php?id=1', name: 'ann' }, 2)).toBe('watched');
    let visit = countStoryProfile({ storyProfiles: [] }, bob);
    daily = countStoryProfile(daily, bob);
    expect(fbStoryVerdict(daily, visit, bob, 2)).toBe('allowed');
    expect(fbStoryVerdict(daily, visit, cat, 2)).toBe('limit');
    visit = countStoryProfile(visit, ann);
    expect(fbStoryVerdict(daily, visit, ann, 2)).toBe('allowed');
    expect(fbStoryVerdict(countStoryProfile(emptyDaily(day), ann), { storyProfiles: [] }, cat, 2)).toBe('allowed');
  });
});

describe('post keys', () => {
  it('ignore changing counts and spacing', () => {
    expect(postKey('Ann Lee\n2h · Great day!  12 likes')).toBe(postKey('Ann Lee 3h · Great day! 40 likes'));
    expect(postKey('Ann Lee · Great day!')).not.toBe(postKey('Bob · Great day!'));
  });
});
