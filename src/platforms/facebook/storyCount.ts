import type { ContentScriptContext } from '#imports';
import { countStoryProfile, fbStoryVerdict, isStoryProfileCounted, type StoryPeople } from '@/core/social/daily';
import type { SocialNotice } from '@/ui/social/state';
import { lockPlayback, unlockPlayback } from '../social/player';
import type { SocialPage } from '../social/page';
import { fbLive, fbSite } from './context';
import { fbProfileKey } from './page';
import { FB_HIDDEN } from './pageStyles';
import { LABEL } from './selectors';
import { fbUi } from './ui';

interface StoryOwner {
  /** `/name` or `profile.php?id=…`. */
  key: string;
  name: string;
}

/**
 * Whose story is showing. Facebook keeps the same address while moving from
 * one person's stories to the next, so this reads the story's header instead:
 * the owner's avatar and name link to their profile.
 */
function readStoryOwner(): StoryOwner | null {
  const W = innerWidth;
  const H = innerHeight;
  const found = new Map<string, { header: boolean; names: string[]; top: number }>();
  for (const a of document.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    const r = a.getBoundingClientRect();
    // The story sits in the middle column, its header near the top.
    if (r.width === 0 || r.height === 0 || r.left < W * 0.22 || r.right > W * 0.88 || r.top > H * 0.35) continue;
    const key = fbProfileKey(a.href);
    if (!key) continue;
    const entry = found.get(key) ?? { header: false, names: [], top: r.top };
    // Facebook tags the story header's links with `__tn__`.
    entry.header ||= a.href.includes('__tn__');
    entry.top = Math.min(entry.top, r.top);
    // The avatar link holds a picture; the name link holds the name.
    const text = a.querySelector('img, svg, image, canvas') ? '' : (a.innerText.trim().split('\n')[0] ?? '').trim();
    if (text) entry.names.push(text);
    found.set(key, entry);
  }
  // Header links first, then the name link (the avatar may link to the same person another way), then the topmost.
  const ranked = [...found.entries()].sort(
    ([, a], [, b]) => Number(b.header) - Number(a.header) || Number(b.names.length > 0) - Number(a.names.length > 0) || a.top - b.top,
  );
  const best = ranked[0];
  if (!best) return null;
  const name = best[1].names[0] ?? ranked.find(([, e]) => e.names.length)?.[1].names[0] ?? '';
  return { key: best[0], name };
}

/** The user's own name, from the "Your story" row in the stories page's sidebar. */
function ownNameFromStoriesPage(): string | null {
  for (const el of document.querySelectorAll<HTMLElement>('h1, h2, h3, h4, [role="heading"], span')) {
    if (el.childElementCount > 0 || (el.textContent ?? '').trim().toLowerCase() !== LABEL.storiesSidebar[0]) continue;
    for (let box = el.parentElement; box && box !== document.body; box = box.parentElement) {
      const lines = box.innerText.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) continue;
      const name = lines[0]!.toLowerCase() === LABEL.storiesSidebar[0] ? lines[1]! : null;
      // Without a story of their own, the row offers to make one instead of showing their name.
      return name && !/^(create|add|share)\b/i.test(name) ? name : null;
    }
  }
  return null;
}

const LOCK = 'fb-stories-limit';

const OWN_NAME_KEY = 'ff-fb-own-name';

/** The first named link in the left menu is the user's own profile. */
function ownNameFromMenu(): string | null {
  for (const nav of document.querySelectorAll<HTMLElement>('[role="navigation"]')) {
    for (const a of nav.querySelectorAll<HTMLAnchorElement>('a[href]')) {
      const text = a.innerText.trim().split('\n')[0]?.trim();
      if (!text) continue;
      return fbProfileKey(a.href) ? text : null;
    }
  }
  return null;
}

/** The user's own name, remembered once seen, so their own story is never limited. */
function ownName(): string | null {
  const found = ownNameFromStoriesPage() ?? ownNameFromMenu();
  try {
    if (found) localStorage.setItem(OWN_NAME_KEY, found);
    return found ?? localStorage.getItem(OWN_NAME_KEY);
  } catch {
    return found;
  }
}

/** How long a person must stay on screen before counting, so a header mid-change isn't counted. */
const STEADY_MS = 800;

const VISIT_KEY = 'ff-fb-story-visit';

/** One visit to the stories page, from entering it until leaving it. */
interface Visit extends StoryPeople {
  /** The visit started on someone's profile: only that person's stories play, and they don't count. */
  fromProfile?: {
    /** The profile page, to go back to. */
    returnTo: string;
    /** Its profile key, to recognize its owner's stories. */
    key: string | null;
    /** The person whose stories play, once known. */
    person?: StoryOwner;
  };
}

const NEW_VISIT: Visit = { storyProfiles: [], storyNames: [] };

/** Kept per tab, so reloading the stories page doesn't end the visit. */
function loadVisit(): Visit {
  try {
    const raw = sessionStorage.getItem(VISIT_KEY);
    return raw ? (JSON.parse(raw) as Visit) : NEW_VISIT;
  } catch {
    return NEW_VISIT;
  }
}

function saveVisit(visit: Visit): void {
  try {
    sessionStorage.setItem(VISIT_KEY, JSON.stringify(visit));
  } catch {
    // Storage blocked: the visit just won't survive a reload.
  }
}

const storyBucket = (a: HTMLAnchorElement) => a.getAttribute('href')?.match(/\/stories\/([^/?#]+)/)?.[1] ?? null;

/** Story cards in the row are narrow; a box wider than this is the row or the page. */
const MAX_CARD_WIDTH = 220;

/** The whole card around a story link: the outermost narrow box that links to no other story. */
function storyCard(link: HTMLAnchorElement, bucket: string): HTMLElement {
  let card: HTMLElement = link;
  for (let el = link.parentElement; el && el !== document.body; el = el.parentElement) {
    if (el.getBoundingClientRect().width > MAX_CARD_WIDTH) break;
    const others = [...el.querySelectorAll<HTMLAnchorElement>('a[href*="/stories/"]')].some((a) => storyBucket(a) !== bucket);
    if (others) break;
    card = el;
  }
  return card;
}

/**
 * Home page Stories row: people watched today can't be opened again, so their
 * cards are removed; once today's people are used up, or stories are hidden,
 * every card is. With no limit, all of them stay.
 */
function updateStoriesRow(onHome: boolean): void {
  const { mode, profilesPerDay } = fbLive.settings.facebook.stories;
  const daily = fbSite.today();
  const full = mode === 'hidden' || daily.storyProfiles.length >= profilesPerDay;
  onHome &&= mode !== 'unlimited';
  const names = (daily.storyNames ?? []).filter(Boolean).map((n) => n.toLowerCase());
  const mine = onHome ? ownName()?.toLowerCase() : undefined;
  const rows = new Set<HTMLElement>();
  for (const a of document.querySelectorAll<HTMLAnchorElement>('a[href*="/stories/"]')) {
    const bucket = storyBucket(a);
    if (!bucket || bucket === 'create') continue;
    const card = storyCard(a, bucket);
    // Cards link to the story, not the profile, so match the name shown on the card.
    const text = card.innerText.toLowerCase();
    // The user's own story always stays.
    const own = text.includes('your story') || (!!mine && text.includes(mine));
    const hide = onHome && !own && (full || names.some((n) => text.includes(n)));
    if (hide) card.dataset.ffFb = FB_HIDDEN.story;
    else if (card.dataset.ffFb === FB_HIDDEN.story) delete card.dataset.ffFb;
    if (card.parentElement) rows.add(card.parentElement);
  }
  // Facebook's grey loading placeholder: a box in the row with no link or button. With every
  // card removed it slides into view and keeps pulsing, waiting for cards that won't come.
  for (const row of rows) {
    // Only the Stories row: several story cards side by side (a post's header links to one story at most).
    const cards = [...row.children].filter((c) => c.querySelector('a[href*="/stories/"]') || c.matches('a[href*="/stories/"]'));
    if (cards.length < 2) continue;
    for (const child of row.children) {
      if (!(child instanceof HTMLElement) || child.querySelector('a[href], [role="button"], button') || child.matches('a[href], [role="button"], button')) continue;
      if (onHome && full) child.dataset.ffFb = FB_HIDDEN.story;
      else if (child.dataset.ffFb === FB_HIDDEN.story) delete child.dataset.ffFb;
    }
  }
}

/**
 * Counts the people whose stories were opened today, each once, as soon as one
 * of their stories shows. A visit runs from entering the stories page until
 * leaving it: moving on from person to person is fine, and anyone watched on
 * this visit can be watched again. People watched on an earlier visit today
 * don't open again, and once today's people are used up, nobody new does.
 * The user's own stories don't count and are never blocked.
 */
export function startFbStoryCount(ctx: ContentScriptContext, getPage: () => SocialPage) {
  const { store } = fbUi;
  let visit = loadVisit();
  let seen: string | null = null;
  let since = 0;

  function block(notice: SocialNotice | null, hold = notice !== null): void {
    if (hold) lockPlayback(LOCK);
    else unlockPlayback(LOCK);
    const current = store.get().notice;
    const ours = current?.kind === 'stories-off' || current?.kind === 'stories-limit' || current?.kind === 'stories-watched' || current?.kind === 'stories-elsewhere';
    if (notice && JSON.stringify(current) !== JSON.stringify(notice)) store.set({ notice });
    if (!notice && ours) store.set({ notice: null });
  }

  /**
   * Opened from someone's profile: that person's stories always play and don't
   * count; moving on to anyone else is blocked.
   */
  function fromProfile(from: NonNullable<Visit['fromProfile']>, owner: StoryOwner, steady: boolean): void {
    if (!from.person) {
      // Their header links to the profile the user came from; failing that, the first person to show is them.
      if (owner.key !== from.key && !steady) return block(null);
      from.person = owner;
      saveVisit(visit);
    }
    const same = isStoryProfileCounted({ storyProfiles: [from.person.key], storyNames: [from.person.name] }, owner);
    block(same ? null : { kind: 'stories-elsewhere', returnTo: from.returnTo });
  }

  function check(): void {
    const page = getPage().type;
    const onStories = page === 'stories';
    updateStoriesRow(page === 'home');
    const owner = onStories ? readStoryOwner() : null;
    const daily = fbSite.today();
    const root = document.documentElement.dataset;
    root.ffStoryOwner = owner ? `${owner.name} (${owner.key})` : '';
    const { mode, profilesPerDay: limit } = fbLive.settings.facebook.stories;
    root.ffStories = mode === 'limited' ? `${daily.storyProfiles.length}/${limit}` : mode;
    // With no limit, stories work as Facebook normally does: nothing is counted or blocked.
    if (mode === 'unlimited') return block(null);
    root.ffStoryVisit = visit.fromProfile ? `from profile: ${visit.fromProfile.person?.name ?? visit.fromProfile.key ?? '?'}` : (visit.storyNames ?? []).join(', ');
    if (!owner) {
      seen = null;
      // Today's people are used up and it isn't known yet whose story this is: hold playback until it is.
      return block(null, onStories && !visit.fromProfile && (mode === 'hidden' || daily.storyProfiles.length >= limit));
    }
    const mine = ownName();
    if (mine && owner.name && mine.toLowerCase() === owner.name.toLowerCase()) return block(null);

    // The header's link can change form while it loads; the name stays the same.
    const who = owner.name.toLowerCase() || owner.key;
    if (who !== seen) {
      seen = who;
      since = Date.now();
    }
    const steady = Date.now() - since >= STEADY_MS;

    if (visit.fromProfile) return fromProfile(visit.fromProfile, owner, steady);

    // Blocked right away, without waiting for the header to settle, so nothing is seen.
    if (mode === 'hidden') return block({ kind: 'stories-off', fromProfiles: true });
    const verdict = fbStoryVerdict(daily, visit, owner, limit);
    if (verdict !== 'allowed') return block(verdict === 'watched' ? { kind: 'stories-watched' } : { kind: 'stories-limit', limit });
    block(null);
    if (!steady) return;
    const next = countStoryProfile(daily, owner);
    if (next !== daily) fbSite.updateDaily(() => next);
    const nextVisit = countStoryProfile(visit, owner);
    if (nextVisit !== visit) saveVisit((visit = nextVisit));
  }

  ctx.setInterval(check, 300);

  // Facebook redraws the Stories row while it loads. Checking it right after each change,
  // before the screen is painted, keeps removed cards from flashing up.
  let frame: number | null = null;
  const observer = new MutationObserver(() => {
    if (frame !== null || getPage().type !== 'home') return;
    frame = requestAnimationFrame(() => {
      frame = null;
      updateStoriesRow(getPage().type === 'home');
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  ctx.onInvalidated(() => observer.disconnect());

  return {
    onNavigate(next: SocialPage, prev: SocialPage | null) {
      // Entering the stories page starts a visit; on a reload (no `prev`) the stored one carries on.
      if (next.type === 'stories' && prev && prev.type !== 'stories') {
        saveVisit((visit = prev.type === 'profile' ? { ...NEW_VISIT, fromProfile: { returnTo: prev.url, key: fbProfileKey(prev.url) } } : NEW_VISIT));
      }
      if (next.type !== 'stories') saveVisit((visit = NEW_VISIT));
      seen = null;
      check();
    },
  };
}
