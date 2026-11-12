import type { ContentScriptContext } from '#imports';
import { loadMore, loadsLeft, planFeed, postKey } from '@/core/social/daily';
import type { FeedState } from '@/ui/social/state';
import type { SocialPage } from '../social/page';
import { igLive, igSite } from './context';
import { IG_END_ATTR, IG_FEED_ATTR, IG_HIDDEN, IG_ROOT_CLASS, setIgRootClass } from './pageStyles';
import { IG, LABEL, normalize } from './selectors';
import { igUi } from './ui';

const { today, updateDaily, limits } = igSite;
const store = igUi.store;

type UnitKind = 'post' | 'sponsored' | 'suggested' | 'accounts' | 'reels' | 'caughtUp' | 'other' | 'empty';

/** Instagram fills posts in after inserting them; give them a moment before deciding. */
const SETTLE_MS = 600;
/** A post's header (name, "Sponsored", "Follow") sits in its top this many pixels. */
const HEADER_PX = 90;

/** Visible text lines, normalized. */
function lines(el: HTMLElement, max = 10): string[] {
  return el.innerText.split('\n').map(normalize).filter(Boolean).slice(0, max);
}

const startsWithAny = (line: string, phrases: string[]) => phrases.some((p) => line === p || line.startsWith(`${p} `) || line.startsWith(`${p} •`));

function hasLabel(el: HTMLElement, top: string[], phrases: string[]): boolean {
  if (top.slice(0, 4).some((l) => phrases.includes(l))) return true;
  return [...el.querySelectorAll<HTMLElement>('h2, h3, h4, [role="heading"]')].some((h) => phrases.includes(normalize(h.innerText)));
}

function reelLinks(el: HTMLElement): number {
  const ids = new Set<string>();
  for (const a of el.querySelectorAll<HTMLAnchorElement>('a[href*="/reel/"], a[href*="/reels/"]')) {
    const id = a.getAttribute('href')?.match(/\/reels?\/([\w-]+)/)?.[1];
    if (id && id !== 'audio') ids.add(id);
  }
  return ids.size;
}

function headerButtons(article: HTMLElement): string[] {
  const top = article.getBoundingClientRect().top;
  return [...article.querySelectorAll<HTMLElement>(IG.buttons)]
    .filter((b) => b.getBoundingClientRect().top - top < HEADER_PX)
    .map((b) => normalize(b.innerText));
}

function isSponsored(article: HTMLElement, top: string[]): boolean {
  if (article.querySelector('[aria-label="Sponsored" i], a[href*="/ads/"]')) return true;
  return top.slice(0, 6).some((l) => LABEL.sponsored.includes(l.replace(/[\s•·]/g, '')));
}

function classify(unit: HTMLElement): UnitKind {
  const article = unit.matches(IG.article) ? unit : unit.querySelector<HTMLElement>(IG.article);
  const text = unit.innerText.trim();
  const top = lines(unit);
  if (!article) {
    if (top.slice(0, 3).some((l) => LABEL.caughtUp.some((p) => l.startsWith(p)))) return 'caughtUp';
    if (text.length < 20 && !unit.querySelector('img, video, a[href]')) return 'empty';
    if (reelLinks(unit) >= 3 || (reelLinks(unit) >= 2 && hasLabel(unit, top, LABEL.reelsSections))) return 'reels';
    if (hasLabel(unit, top, LABEL.suggestedAccounts)) return 'accounts';
    const follows = [...unit.querySelectorAll<HTMLElement>(IG.buttons)].filter((b) => LABEL.followButtons.includes(normalize(b.innerText)));
    if (follows.length >= 2) return 'accounts';
    return 'other';
  }
  const head = lines(article);
  if (isSponsored(article, head)) return 'sponsored';
  if (reelLinks(article) >= 3) return 'reels';
  if (head.slice(0, 6).some((l) => startsWithAny(l, LABEL.suggestedPost))) return 'suggested';
  if (headerButtons(article).some((t) => LABEL.followButtons.includes(t))) return 'suggested';
  return 'post';
}

/** The post's own ID when it links to itself; its text otherwise. */
function keyOf(unit: HTMLElement): string {
  const article = unit.matches(IG.article) ? unit : (unit.querySelector<HTMLElement>(IG.article) ?? unit);
  for (const a of article.querySelectorAll<HTMLAnchorElement>(IG.permalinks)) {
    const id = a.getAttribute('href')?.match(/\/(?:p|reel)\/([\w-]+)/)?.[1];
    if (id) return `ig:${id}`;
  }
  return postKey(article.innerText);
}

function commonAncestor(a: Element, b: Element): Element | null {
  for (let el: Element | null = a; el; el = el.parentElement) if (el.contains(b)) return el;
  return null;
}

/**
 * The element holding the home feed's posts, and its units in order. A unit is
 * one post, or a row Instagram puts between posts (suggested accounts, Reels).
 */
function findFeed(previous: HTMLElement | null): { list: HTMLElement; units: HTMLElement[] } | null {
  const main = document.querySelector<HTMLElement>(IG.main);
  if (!main) return null;
  const articles = [...main.querySelectorAll<HTMLElement>(IG.article)].filter((a) => !a.closest(IG.dialog));
  let list: HTMLElement | null = null;
  if (articles.length >= 2) {
    list = articles.slice(1).reduce<Element | null>((acc, a) => (acc ? commonAncestor(acc, a) : null), articles[0]!) as HTMLElement | null;
  } else if (previous?.isConnected && main.contains(previous)) {
    list = previous;
  }
  if (!list) return null;
  // A wrapper holding several posts is split into its children.
  const expand = (el: HTMLElement): HTMLElement[] =>
    el.querySelectorAll(IG.article).length >= 2 && !el.matches(IG.article)
      ? [...el.children].filter((c): c is HTMLElement => c instanceof HTMLElement && !c.hasAttribute(IG_END_ATTR)).flatMap(expand)
      : [el];
  return { list, units: expand(list) };
}

/**
 * Hides sponsored and suggested posts and Reels rows, and shows today's
 * 10 posts in batches of 5 with a "Load more" button.
 */
export function startIgFeed(ctx: ContentScriptContext, getPage: () => SocialPage) {
  const firstSeen = new WeakMap<Element, number>();
  // Decided once per element: a hidden element has no layout, so its text reads differently later.
  const decided = new WeakMap<Element, { kind: UnitKind; key?: string }>();
  let list: HTMLElement | null = null;
  let scheduled: number | null = null;
  // A post opened from the feed shows in a dialog over it; the feed stays capped underneath.
  let feedUnderneath = false;

  const schedule = (delay = 200) => {
    if (scheduled !== null) return;
    scheduled = ctx.setTimeout(() => {
      scheduled = null;
      scan();
    }, delay);
  };

  function hide(el: HTMLElement, reason: string): void {
    delete el.dataset.ffIgPending;
    if (el.dataset.ffIg !== reason) el.dataset.ffIg = reason;
  }

  function show(el: HTMLElement): void {
    delete el.dataset.ffIgPending;
    delete el.dataset.ffIg;
  }

  function setFeedState(next: FeedState): void {
    const prev = store.get().feed;
    if (prev.phase !== next.phase || prev.seenToday !== next.seenToday || prev.loadsLeft !== next.loadsLeft) store.set({ feed: next });
  }

  /** Mark the post list, and keep the end card's spot right after it. */
  function markList(next: HTMLElement | null): void {
    if (list && list !== next) list.removeAttribute(IG_FEED_ATTR);
    list = next;
    if (!list) return;
    list.setAttribute(IG_FEED_ATTR, '');
    let end = document.querySelector<HTMLElement>(`[${IG_END_ATTR}]`);
    if (end && end.previousElementSibling === list) return;
    end ??= document.createElement('div');
    end.setAttribute(IG_END_ATTR, '');
    list.after(end);
  }

  function scan(): void {
    const page = getPage();
    if (page.type === 'home') feedUnderneath = true;
    else if (!document.querySelector(IG.dialog)) feedUnderneath = false;
    const onHome = page.type === 'home' || feedUnderneath;
    const { suggestedAccounts } = igLive.settings.instagram;
    const now = Date.now();
    let waiting = false;

    const feed = onHome ? findFeed(list) : null;
    markList(feed?.list ?? null);
    const posts: { el: HTMLElement; key: string }[] = [];
    let capFrom: number | null = null;
    let afterCaughtUp = false;
    const daily = today();

    feed?.units.forEach((el, index) => {
      if (capFrom !== null) return hide(el, IG_HIDDEN.capped);
      if (afterCaughtUp) return hide(el, IG_HIDDEN.suggested);
      if (!firstSeen.has(el)) firstSeen.set(el, now);
      const settled = now - firstSeen.get(el)! >= SETTLE_MS;
      let cached = decided.get(el);
      if (!cached) {
        // Lay it out (invisibly) so its text can be read.
        if (el.dataset.ffIg === IG_HIDDEN.capped) {
          delete el.dataset.ffIg;
          el.dataset.ffIgPending = '';
        }
        const kind = classify(el);
        if (kind !== 'empty' && (kind !== 'post' || settled)) {
          cached = { kind, key: kind === 'post' ? keyOf(el) : undefined };
          decided.set(el, cached);
        }
      }
      const kind = cached?.kind ?? classify(el);
      if (kind === 'sponsored') return hide(el, IG_HIDDEN.sponsored);
      if (kind === 'suggested') return hide(el, IG_HIDDEN.suggested);
      if (kind === 'reels') return hide(el, IG_HIDDEN.reels);
      if (kind === 'accounts') return suggestedAccounts ? show(el) : hide(el, IG_HIDDEN.accounts);
      if (kind === 'caughtUp') {
        afterCaughtUp = true;
        return show(el);
      }
      if (kind === 'empty' || kind === 'other') return show(el);
      if (!settled) {
        // Keep it invisible until the sponsored / suggested labels have had time to appear.
        el.dataset.ffIgPending = '';
        waiting = true;
        return;
      }
      posts.push({ el, key: cached!.key! });
      // Stop at the first post past today's allowance; everything after it waits for "Load more".
      if (planFeed(posts.map((p) => p.key), daily).capped) capFrom = index;
    });

    let held = capFrom !== null;
    if (feed) {
      const plan = planFeed(posts.map((p) => p.key), today());
      held ||= plan.capped;
      posts.forEach((p, i) => (i < plan.visible ? show(p.el) : hide(p.el, IG_HIDDEN.capped)));
      if (plan.newlySeen.length) updateDaily((d) => ({ ...d, seenPosts: [...d.seenPosts, ...plan.newlySeen] }));
    }

    const current = today();
    const used = current.seenPosts.length >= current.unlockedPosts;
    const left = loadsLeft(current, limits);
    // Stop Instagram loading more only once a new post is actually held back: after a
    // reload, posts already seen today still need to load back in.
    setIgRootClass(IG_ROOT_CLASS.feedCapped, onHome && used && held);
    setFeedState(
      page.type !== 'home'
        ? { phase: 'off', seenToday: current.seenPosts.length, loadsLeft: 0 }
        : !used
          ? { phase: 'loading', seenToday: current.seenPosts.length, loadsLeft: left }
          : { phase: left > 0 ? 'more' : 'end', seenToday: current.seenPosts.length, loadsLeft: left },
    );
    if (waiting) schedule(SETTLE_MS);
  }

  igUi.actions.loadMore = () => {
    if (loadsLeft(today(), limits) === 0) return;
    updateDaily((d) => loadMore(d, limits));
    // Instagram loads more posts as the bottom of the feed comes into view.
    ctx.requestAnimationFrame(() => window.dispatchEvent(new Event('scroll')));
    schedule(0);
  };

  igSite.onChange(() => schedule(0));
  const observer = new MutationObserver(() => schedule());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  ctx.onInvalidated(() => {
    observer.disconnect();
    document.querySelector(`[${IG_END_ATTR}]`)?.remove();
  });
  schedule(0);

  return { onNavigate: () => schedule(0) };
}
