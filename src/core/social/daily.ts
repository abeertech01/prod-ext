/** How many feed posts a site shows per day, and how many each "Load more" adds. */
export interface FeedLimits {
  dailyPosts: number;
  batch: number;
}

export const FACEBOOK_FEED: FeedLimits = { dailyPosts: 20, batch: 5 };
export const INSTAGRAM_FEED: FeedLimits = { dailyPosts: 10, batch: 5 };


/** What the user has used of today's allowance on one site. Resets at local midnight. */
export interface DailyAllowance {
  /** Local date, `YYYY-MM-DD`. */
  dayKey: string;
  /** Keys of the feed posts shown today, oldest first. */
  seenPosts: string[];
  /** How many posts today's "Load more" clicks have unlocked (starts at one batch). */
  unlockedPosts: number;
  /** People whose stories were watched today: a story bucket on Instagram, a profile link on Facebook. */
  storyProfiles: string[];
  /** Facebook: their display names, in the same order. */
  storyNames?: string[];
}

export interface StoriesSetting {
  /** `limited`: stories from `profilesPerDay` profiles a day. */
  mode: 'limited' | 'hidden' | 'unlimited';
  profilesPerDay: number;
}

export function localDayKey(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function emptyDaily(now: Date, limits: FeedLimits): DailyAllowance {
  return { dayKey: localDayKey(now), seenPosts: [], unlockedPosts: Math.min(limits.batch, limits.dailyPosts), storyProfiles: [] };
}

/** The stored record, or a fresh one once the day has changed. */
export function currentDaily(stored: DailyAllowance | null, now: Date, limits: FeedLimits): DailyAllowance {
  return stored && stored.dayKey === localDayKey(now) ? stored : emptyDaily(now, limits);
}

export interface FeedPlan {
  /** Show the first `visible` posts; hide the rest. */
  visible: number;
  /** Posts shown for the first time today. */
  newlySeen: string[];
  /** Some posts are held back by the limit. */
  capped: boolean;
}

/**
 * Walks the feed in order. Posts already seen today show again for free; new
 * ones show while today's unlocked allowance lasts. The first post that
 * doesn't fit ends the feed, so the batch boundary stays where it is.
 */
export function planFeed(keys: string[], daily: DailyAllowance): FeedPlan {
  const seen = new Set(daily.seenPosts);
  let count = seen.size;
  const newlySeen: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]!;
    if (seen.has(key)) continue;
    if (count >= daily.unlockedPosts) return { visible: i, newlySeen, capped: true };
    seen.add(key);
    newlySeen.push(key);
    count++;
  }
  return { visible: keys.length, newlySeen, capped: false };
}

/** "Load more" clicks left today. */
export function loadsLeft(daily: DailyAllowance, limits: FeedLimits): number {
  return Math.ceil(Math.max(0, limits.dailyPosts - daily.unlockedPosts) / limits.batch);
}

export function loadMore(daily: DailyAllowance, limits: FeedLimits): DailyAllowance {
  return { ...daily, unlockedPosts: Math.min(limits.dailyPosts, daily.unlockedPosts + limits.batch) };
}

/** `allowed`: may open. `limit`: today's people are used up. `off`: stories are turned off. */
export type StoryVerdict = 'allowed' | 'limit' | 'off';

/** Whether this person's stories may open, and the record to keep if they do. Rewatching is free all day. */
export function checkStory(daily: DailyAllowance, profile: string, stories: StoriesSetting): { verdict: StoryVerdict; daily: DailyAllowance } {
  if (stories.mode === 'hidden') return { verdict: 'off', daily };
  if (stories.mode === 'unlimited' || daily.storyProfiles.includes(profile)) return { verdict: 'allowed', daily };
  if (daily.storyProfiles.length >= stories.profilesPerDay) return { verdict: 'limit', daily };
  return { verdict: 'allowed', daily: { ...daily, storyProfiles: [...daily.storyProfiles, profile] } };
}

/** This person was already counted today, by profile link or by name. */
export function isStoryProfileCounted(daily: StoryPeople, owner: { key: string; name: string }): boolean {
  const name = owner.name.trim().toLowerCase();
  return daily.storyProfiles.includes(owner.key) || (!!name && (daily.storyNames ?? []).some((n) => n.toLowerCase() === name));
}

/** People whose stories were watched: profile links and names, in the same order. */
export interface StoryPeople {
  storyProfiles: string[];
  storyNames?: string[];
}

/**
 * Facebook: whether this person's stories may play. `visit` is everyone watched
 * since the user entered the stories page; they can be watched again freely.
 * `watched`: counted in an earlier visit today. `limit`: today's people are used up.
 */
export function fbStoryVerdict(daily: DailyAllowance, visit: StoryPeople, owner: { key: string; name: string }, limit: number): 'allowed' | 'watched' | 'limit' {
  if (isStoryProfileCounted(visit, owner)) return 'allowed';
  if (isStoryProfileCounted(daily, owner)) return 'watched';
  return daily.storyProfiles.length < limit ? 'allowed' : 'limit';
}

/**
 * Counts a person whose story opened, once a day. The same person can show up
 * with their profile linked two ways (`/name`, `profile.php?id=…`), so a
 * matching name counts as the same person too.
 */
export function countStoryProfile<T extends StoryPeople>(daily: T, owner: { key: string; name: string }): T {
  if (isStoryProfileCounted(daily, owner)) return daily;
  const names = daily.storyNames ?? [];
  // Pad names so they stay in step with profiles.
  const padded = daily.storyProfiles.map((_, i) => names[i] ?? '');
  return { ...daily, storyProfiles: [...daily.storyProfiles, owner.key], storyNames: [...padded, owner.name.trim()] };
}

/** A short, stable key for a post's text (FNV-1a), so the same post isn't counted twice. */
export function postKey(text: string): string {
  const normalized = text.toLowerCase().replace(/\d+/g, '').replace(/\s+/g, ' ').trim().slice(0, 400);
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}
