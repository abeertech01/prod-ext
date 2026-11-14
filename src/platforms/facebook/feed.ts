import type { ContentScriptContext } from '#imports';
import { FACEBOOK_FEED, postKey } from '@/core/social/daily';
import type { SocialPage } from '../social/page';
import { fbLive, fbSite } from './context';
import { COVER, FB_COVER_ATTR, FB_COVER_COUNT_ATTR, FB_COVER_DONE_ATTR, FB_HIDDEN, FB_LOCK_ATTR } from './pageStyles';
import { FB, LABEL } from './selectors';

type UnitKind = 'post' | 'sponsored' | 'suggested' | 'pymk' | 'groups' | 'reels' | 'stories' | 'empty';

/** Visible text lines, lower-case. */
function lines(el: HTMLElement, max = 12): string[] {
  return el.innerText
    .split('\n')
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, max);
}

const startsWithAny = (line: string, phrases: string[]) => phrases.some((p) => line === p || line.startsWith(`${p} `) || line.startsWith(`${p}·`));

function hasHeading(el: HTMLElement, top: string[], phrases: string[]): boolean {
  if (top.slice(0, 4).some((l) => phrases.includes(l))) return true;
  return [...el.querySelectorAll<HTMLElement>(FB.headings)].some((h) => phrases.includes(h.innerText.trim().toLowerCase()));
}

function isSponsored(el: HTMLElement, top: string[]): boolean {
  if (el.querySelector(FB.sponsoredMarkers)) return true;
  // The label is often split into scrambled letters; compare without spaces.
  if (top.some((l) => l.replace(/[\s·]/g, '') === LABEL.sponsored)) return true;
  // "Ad" sits on the line under the name, alone or before "·" (e.g. "Ad · AI content").
  if (top.slice(0, 4).some((l) => l.replace(/\s/g, '') === LABEL.ad || /^a\s*d\s*·/.test(l))) return true;
  for (const node of el.querySelectorAll<HTMLElement>('[aria-labelledby]')) {
    const label = document.getElementById(node.getAttribute('aria-labelledby') ?? '')?.textContent?.trim().toLowerCase();
    if (label === LABEL.sponsored || label === LABEL.ad) return true;
  }
  return false;
}

/**
 * A "Join", "Follow" or "Add friend" button in the post's header: the post is
 * from a group, page or person the user doesn't follow.
 */
function hasFollowButton(el: HTMLElement): boolean {
  const top = el.getBoundingClientRect().top;
  return [...el.querySelectorAll<HTMLElement>(FB.buttons)].some(
    (b) => LABEL.followButtons.includes(b.innerText.trim().toLowerCase()) && b.getBoundingClientRect().top - top < 140,
  );
}

/** How many different Reels the element links to. */
function reelLinks(el: HTMLElement): number {
  const ids = new Set<string>();
  for (const a of el.querySelectorAll<HTMLAnchorElement>('a[href*="/reel/"]')) {
    const id = a.href.match(/\/reel\/([\w-]+)/)?.[1];
    if (id) ids.add(id);
  }
  return ids.size;
}

/**
 * A row of several Reels that scrolls sideways: it starts with a "Reels"
 * heading, or links to several Reels. A single Reel shared as a post starts
 * with its author's name and links to one Reel, so it stays.
 */
function isReelsRow(el: HTMLElement, top: string[]): boolean {
  if (top[0] && LABEL.reelsSections.includes(top[0])) return true;
  const reels = reelLinks(el);
  return reels >= 3 || (reels >= 2 && hasHeading(el, top, LABEL.reelsSections));
}

function classify(el: HTMLElement): UnitKind {
  const text = el.innerText.trim();
  // Loading placeholders: no text worth reading, no media, no links.
  if (text.length < 20 && !el.querySelector('img, video, a[href]')) return 'empty';
  const top = lines(el);
  if (isSponsored(el, top)) return 'sponsored';
  if (hasHeading(el, top, LABEL.peopleYouMayKnow)) return 'pymk';
  if (isReelsRow(el, top)) return 'reels';
  // The Stories box inside the feed starts with its "Stories" heading.
  if (top[0] && LABEL.storiesSection.includes(top[0])) return 'stories';
  // Before the follow-button check: these cards have "Join group" buttons.
  if (hasHeading(el, top, LABEL.groupSuggestions)) return 'groups';
  if (hasHeading(el, top, LABEL.suggestedSections)) return 'suggested';
  if (top.slice(0, 6).some((l) => startsWithAny(l, LABEL.suggestedPost)) || hasFollowButton(el)) return 'suggested';
  return 'post';
}

/**
 * Every feed on the page. The home feed has no `role="feed"`: it's the element
 * beside the hidden "Feed posts" heading that holds the posts.
 */
function findFeeds(): HTMLElement[] {
  const feeds = new Set(document.querySelectorAll<HTMLElement>(FB.feed));
  for (const h of document.querySelectorAll<HTMLElement>(FB.headings)) {
    if (!LABEL.feedHeadings.includes((h.textContent ?? '').trim().toLowerCase())) continue;
    const siblings = [...(h.parentElement?.children ?? [])].filter((c): c is HTMLElement => c instanceof HTMLElement && c !== h);
    const list = siblings.sort((a, b) => b.childElementCount - a.childElementCount)[0];
    if (list && list.childElementCount > 0) feeds.add(list);
  }
  return [...feeds];
}

/** Facebook fills posts in after inserting them; give them a moment before deciding. */
const SETTLE_MS = 600;

/** The label on the slim locked card that replaces an unwanted feed item. */
const LOCK_LABEL = 'Distraction hidden';

/**
 * Locks, in every feed: sponsored posts, suggested posts, posts from groups,
 * pages and people the user doesn't follow, suggested pages, and Reels rows
 * that scroll sideways (a single Reel shared as a post stays). Locked items
 * keep their place behind a slim card, so the feed still grows and Facebook
 * keeps loading more. "People you may know" is hidden unless turned on in
 * settings; group suggestions show unless turned off.
 */
export function startFbFeed(ctx: ContentScriptContext, getPage: () => SocialPage): void {
  const firstSeen = new WeakMap<Element, number>();
  // Posts the user uncovered, also by their text, in case Facebook redraws one as a new element.
  const revealed = new WeakSet<Element>();
  const revealedKeys = new Set<string>();
  // Decided once per element: a hidden element has no layout, so its text reads differently later.
  const decided = new WeakMap<Element, UnitKind>();
  let frame: number | null = null;
  let timer: number | null = null;

  function hide(el: HTMLElement, reason: string): void {
    delete el.dataset.ffFbPending;
    el.removeAttribute(FB_COVER_ATTR);
    el.removeAttribute(FB_LOCK_ATTR);
    if (el.dataset.ffFb !== reason) el.dataset.ffFb = reason;
  }

  function show(el: HTMLElement): void {
    delete el.dataset.ffFbPending;
    el.removeAttribute(FB_COVER_ATTR);
    el.removeAttribute(FB_LOCK_ATTR);
    if (el.dataset.ffFb) delete el.dataset.ffFb;
  }

  /** Behind a slim card that can't be opened, keeping its place in the feed. */
  function lock(el: HTMLElement, label: string): void {
    delete el.dataset.ffFbPending;
    el.removeAttribute(FB_COVER_ATTR);
    if (el.dataset.ffFb) delete el.dataset.ffFb;
    if (el.getAttribute(FB_LOCK_ATTR) !== label) el.setAttribute(FB_LOCK_ATTR, label);
  }

  /** Today's opened posts, and the day's limit. */
  const opened = () => fbSite.today().openedPosts ?? 0;
  const LIMIT = FACEBOOK_FEED.dailyPosts;

  const setAttr = (el: HTMLElement, name: string, value: string | null) => {
    if (value === null) el.removeAttribute(name);
    else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
  };

  /** The cover's button and the count under it, kept current as today's count changes. */
  function cover(el: HTMLElement): void {
    delete el.dataset.ffFbPending;
    if (el.dataset.ffFb) delete el.dataset.ffFb;
    el.removeAttribute(FB_LOCK_ATTR);
    const count = opened();
    const done = count >= LIMIT;
    setAttr(el, FB_COVER_ATTR, done ? "Today's posts are done" : 'Show post');
    setAttr(el, FB_COVER_COUNT_ATTR, done ? `You've opened all ${LIMIT} posts for today. More open tomorrow.` : `${count} of ${LIMIT} posts opened today`);
    setAttr(el, FB_COVER_DONE_ATTR, done ? '' : null);
  }

  /** On the home feed every post starts covered; elsewhere posts show once checked. */
  function showPost(el: HTMLElement, settled: boolean): void {
    if (getPage().type !== 'home') return settled ? show(el) : void (el.dataset.ffFbPending = '');
    if (revealed.has(el) || (settled && revealedKeys.has(postKey(el.innerText)))) {
      revealed.add(el);
      return show(el);
    }
    cover(el);
  }

  /** Right-sidebar "Sponsored" block: the largest box that starts with the heading. */
  function hideRightRailAds(): void {
    for (const rail of document.querySelectorAll<HTMLElement>(FB.rightRail)) {
      for (const h of rail.querySelectorAll<HTMLElement>(`${FB.headings}, span`)) {
        if ((h.textContent ?? '').trim().toLowerCase() !== LABEL.sponsored || h.closest('[data-ff-fb]')) continue;
        let box = h;
        while (box.parentElement && box.parentElement !== rail && box.parentElement.innerText.trim().toLowerCase().startsWith(LABEL.sponsored)) {
          box = box.parentElement;
        }
        if (box !== h) hide(box, FB_HIDDEN.sponsored);
      }
    }
  }

  function scan(): void {
    const { peopleYouMayKnow, groupSuggestions, stories } = fbLive.settings.facebook;
    // Today's stories are used up (or turned off): the Stories box has nothing left to offer.
    const noStories = stories.mode === 'hidden' || (stories.mode === 'limited' && fbSite.today().storyProfiles.length >= stories.profilesPerDay);
    const now = Date.now();
    let waiting = false;

    for (const feed of findFeeds()) {
      for (const el of feed.children) {
        if (!(el instanceof HTMLElement)) continue;
        if (!firstSeen.has(el)) firstSeen.set(el, now);
        const settled = now - firstSeen.get(el)! >= SETTLE_MS;
        let kind = decided.get(el);
        if (!kind) {
          kind = classify(el);
          // A post can still turn out to be sponsored or suggested while it loads; anything else is final.
          if (kind !== 'empty' && (kind !== 'post' || settled)) decided.set(el, kind);
        }
        if (kind === 'sponsored' || kind === 'suggested' || kind === 'reels') lock(el, LOCK_LABEL);
        else if (kind === 'stories') (noStories ? hide(el, FB_HIDDEN.stories) : show(el));
        else if (kind === 'pymk') (peopleYouMayKnow ? show(el) : hide(el, FB_HIDDEN.pymk));
        else if (kind === 'groups') (groupSuggestions ? show(el) : hide(el, FB_HIDDEN.groups));
        else if (kind === 'empty') show(el);
        else {
          // Covered (or invisible) from the start, so a post never flashes up before it's checked.
          showPost(el, settled);
          if (!settled) waiting = true;
        }
      }
    }
    hideRightRailAds();
    if (waiting && timer === null) {
      timer = ctx.setTimeout(() => {
        timer = null;
        scan();
      }, SETTLE_MS);
    }
  }

  // Checked right after each change, before the screen is painted, so nothing flashes up.
  const schedule = () => {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      scan();
    });
  };
  // "Show post": the button in the middle of the cover. Covered content can't be clicked,
  // so clicks on a cover land on the post itself.
  ctx.addEventListener(
    document,
    'click',
    (e) => {
      const el = e.target instanceof HTMLElement ? e.target : null;
      // A locked card opens nothing.
      if (el?.hasAttribute(FB_LOCK_ATTR)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      if (!el?.hasAttribute(FB_COVER_ATTR)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      // Today's posts are used up: the button no longer opens anything.
      if (opened() >= LIMIT) return;
      const r = el.getBoundingClientRect();
      const buttonWidth = parseFloat(getComputedStyle(el, '::after').width) || COVER.buttonWidth;
      const dx = Math.abs(e.clientX - (r.left + r.width / 2));
      const dy = Math.abs(e.clientY - (r.top + (COVER.height - COVER.gap) / 2));
      if (dx > buttonWidth / 2 || dy > COVER.buttonHeight / 2) return;
      revealed.add(el);
      revealedKeys.add(postKey(el.innerText));
      show(el);
      fbSite.updateDaily((d) => ({ ...d, openedPosts: (d.openedPosts ?? 0) + 1 }));
    },
    { capture: true },
  );

  fbSite.onChange(schedule);
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  ctx.onInvalidated(() => observer.disconnect());
  scan();
}
