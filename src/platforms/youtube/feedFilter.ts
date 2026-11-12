import type { ContentScriptContext } from '#imports';
import { isAllowListed, normalizeHandle } from '@/core/filter/allowlist';
import { decide, type FilterDecision } from '@/core/filter/engine';
import type { ChannelRef } from '@/core/settings/schema';
import { overlay, overlayActions, type FeedCounts, type HomeFeedState, type Surface } from '@/ui/content/state';
import { live, onContextChange } from './context';
import { getVideoMeta } from './metadata';
import { videoIdFromUrl, type PageInfo } from './page';
import { ITEM_STATE, ROOT_CLASS, setRootClass } from './pageStyles';
import { SEL, textOf } from './selectors';

type FinalState = typeof ITEM_STATE.shown | typeof ITEM_STATE.noMatch | typeof ITEM_STATE.distraction;

/**
 * How hard to look for a batch of videos that pass the filter. YouTube loads
 * roughly a batch's worth of items per page, so this is about 3 pages. After
 * that the batch ends with whatever matched, even if it's fewer.
 */
const HOME_SCAN_LIMIT_FACTOR = 3;
/** With no "load more" spinner for this long, YouTube has nothing more to suggest. */
const FEED_EXHAUSTED_AFTER_MS = 1500;
/** A "Load more" click that brings nothing new in this long gives up. */
const LOAD_STALL_MS = 8000;
const REVEAL_KEY = 'focus-filter:reveal';

export interface TileInfo {
  videoId: string;
  title: string;
  channel: Pick<ChannelRef, 'id' | 'handle'> | null;
}

export function readTile(el: Element): TileInfo | null {
  const link = el.querySelector<HTMLAnchorElement>(SEL.tileVideoLink);
  const videoId = link && videoIdFromUrl(link.href);
  if (!videoId) return null;
  const title = textOf(SEL.tileTitle, el) || link.getAttribute('title') || '';
  if (!title) return null;
  const handleHref = el.querySelector<HTMLAnchorElement>(SEL.tileChannelHandleLink)?.getAttribute('href');
  const idHref = el.querySelector<HTMLAnchorElement>(SEL.tileChannelIdLink)?.getAttribute('href');
  const handle = handleHref?.match(/^\/(@[^/?#]+)/)?.[1];
  const id = idHref?.match(/^\/channel\/(UC[\w-]{22})/)?.[1];
  return {
    videoId,
    title,
    channel: handle || id ? { handle: handle ? normalizeHandle(handle) : undefined, id } : null,
  };
}

function toState(decision: FilterDecision): FinalState {
  if (decision.verdict !== 'hide') return ITEM_STATE.shown;
  return decision.reason === 'no-match' ? ITEM_STATE.noMatch : ITEM_STATE.distraction;
}

export function startFeedFilter(ctx: ContentScriptContext, getPage: () => PageInfo): void {
  const decisions = new Map<string, FinalState>();
  const inflight = new Set<string>();
  let scheduled: number | null = null;
  let exhaustedSince: number | null = null;
  /** One visit to the home page; reset when the user leaves it. */
  let visit = newVisit();

  const schedule = () => {
    if (scheduled !== null) return;
    scheduled = ctx.setTimeout(() => {
      scheduled = null;
      scan();
    }, 150);
  };

  /** Title-only check first; fetch description/tags (and the channel, if unknown) only when needed. */
  function resolve(tile: TileInfo): void {
    const { filter, allowSet, revision } = live;
    const allowListed = isAllowListed(allowSet, tile.channel);
    const titleDecision = decide({ title: tile.title }, allowListed, filter, 'title');
    // Without a channel on the tile we can't rule out the allow-list, which would override a hide.
    const channelUnknown = !tile.channel && titleDecision.verdict === 'hide' && titleDecision.reason !== 'safety';
    if (titleDecision.verdict !== 'undecided' && !channelUnknown) {
      decisions.set(tile.videoId, toState(titleDecision));
      return;
    }
    if (inflight.has(tile.videoId)) return;
    inflight.add(tile.videoId);
    getVideoMeta(tile.videoId).then((meta) => {
      inflight.delete(tile.videoId);
      if (live.revision !== revision) return schedule();
      const channel = { id: meta?.channelId ?? tile.channel?.id, handle: tile.channel?.handle };
      const full = decide(
        { title: tile.title, description: meta?.description, tags: meta?.tags },
        isAllowListed(live.allowSet, channel),
        live.filter,
        'full',
      );
      decisions.set(tile.videoId, toState(full));
      schedule();
    });
  }

  function processItem(el: HTMLElement): void {
    const tile = readTile(el);
    if (!tile) {
      // Ads, placeholders, or a recycled element that's still loading.
      delete el.dataset.ffState;
      delete el.dataset.ffVid;
      return;
    }
    el.dataset.ffVid = tile.videoId;
    if (!decisions.has(tile.videoId)) resolve(tile);
    el.dataset.ffState = decisions.get(tile.videoId) ?? ITEM_STATE.pending;
  }

  function count(items: HTMLElement[]): FeedCounts {
    let noMatch = 0;
    let distraction = 0;
    for (const el of items) {
      if (el.dataset.ffState === ITEM_STATE.noMatch) noMatch++;
      else if (el.dataset.ffState === ITEM_STATE.distraction) distraction++;
    }
    return { noMatch, distraction };
  }

  function clearItems(items: HTMLElement[]): void {
    for (const el of items) {
      delete el.dataset.ffState;
      delete el.dataset.ffVid;
      delete el.dataset.ffCapped;
    }
  }

  function isVisible(el: HTMLElement): boolean {
    const state = el.dataset.ffState;
    const { reveal } = overlay.get();
    return (
      state === undefined ||
      state === ITEM_STATE.shown ||
      (state === ITEM_STATE.noMatch && reveal.noMatch) ||
      (state === ITEM_STATE.distraction && reveal.distraction)
    );
  }

  /** Hide a shelf (e.g. Shorts) whose every item was filtered out, so no empty header is left. */
  function markEmptyShelves(active: boolean): void {
    for (const shelf of document.querySelectorAll<HTMLElement>(`${SEL.homeBrowse} ${SEL.shelfContainer}`)) {
      const items = [...shelf.querySelectorAll<HTMLElement>('ytd-rich-item-renderer')];
      const empty = active && items.length > 0 && items.every((el) => !isVisible(el) && el.dataset.ffState !== ITEM_STATE.pending);
      if (empty) shelf.dataset.ffEmpty = '';
      else delete shelf.dataset.ffEmpty;
    }
  }

  function newVisit() {
    return { loads: 0, loading: false, batchStart: 0, shownBefore: 0, lastGrowth: 0, gridSize: 0, dry: false };
  }

  /**
   * Infinite scroll is off: YouTube's own "load more" spinner is hidden once a
   * batch is done, and is shown again only for a "Load more" click.
   */
  function applyHomeBatches(items: HTMLElement[], active: boolean): void {
    const { homeCapEnabled, homeCap, homeLoadMore } = live.settings.filter;
    const enabled = active && homeCapEnabled && homeCap > 0;
    if (!active) visit = newVisit();
    const target = homeCap * (visit.loads + 1);
    const grid = items.filter((el) => !el.closest(SEL.shelf));
    let visible = 0;
    for (const el of grid) {
      if (!enabled || visible < target) {
        delete el.dataset.ffCapped;
        if (isVisible(el) && el.dataset.ffState) visible++;
      } else {
        el.dataset.ffCapped = '';
      }
    }
    for (const el of items) if (el.closest(SEL.shelf)) delete el.dataset.ffCapped;

    // YouTube may run out of suggestions before the batch or the scan limit.
    const settled = !document.querySelector(SEL.homeContinuation) && grid.length > 0 && !grid.some((el) => el.dataset.ffState === ITEM_STATE.pending);
    if (!settled) exhaustedSince = null;
    else if (exhaustedSince === null) {
      exhaustedSince = Date.now();
      ctx.setTimeout(schedule, FEED_EXHAUSTED_AFTER_MS + 50);
    }
    const exhausted = exhaustedSince !== null && Date.now() - exhaustedSince >= FEED_EXHAUSTED_AFTER_MS;

    if (grid.length !== visit.gridSize) {
      visit.gridSize = grid.length;
      visit.lastGrowth = Date.now();
    }
    const stalled = visit.loading && Date.now() - visit.lastGrowth >= LOAD_STALL_MS;
    const batchDone = visible >= target || grid.length - visit.batchStart >= homeCap * HOME_SCAN_LIMIT_FACTOR || exhausted || stalled;
    if (visit.loading && batchDone) {
      visit.loading = false;
      visit.dry = visible <= visit.shownBefore;
    }

    const loadsLeft = Math.max(0, homeLoadMore - visit.loads);
    let next: HomeFeedState;
    if (!enabled) next = { phase: 'off', shown: visible, loadsLeft: 0, endReason: null };
    else if (!batchDone) next = { phase: 'loading', shown: visible, loadsLeft, endReason: null };
    else if (exhausted) next = { phase: 'end', shown: visible, loadsLeft: 0, endReason: 'exhausted' };
    else if (visit.dry) next = { phase: 'end', shown: visible, loadsLeft: 0, endReason: 'dry' };
    else if (loadsLeft > 0) next = { phase: 'more', shown: visible, loadsLeft, endReason: null };
    else next = { phase: 'end', shown: visible, loadsLeft: 0, endReason: 'limit' };

    setRootClass(ROOT_CLASS.homeCapped, enabled && batchDone);
    const prev = overlay.get().homeFeed;
    if (JSON.stringify(prev) !== JSON.stringify(next)) overlay.set({ homeFeed: next });
  }

  overlayActions.loadMoreHome = () => {
    const { homeFeed } = overlay.get();
    if (homeFeed.phase !== 'more') return;
    const grid = [...document.querySelectorAll<HTMLElement>(SEL.homeItem)].filter((el) => !el.closest(SEL.shelf));
    visit.loads++;
    visit.loading = true;
    visit.shownBefore = homeFeed.shown;
    visit.batchStart = grid.length;
    visit.lastGrowth = Date.now();
    setRootClass(ROOT_CLASS.homeCapped, false);
    // YouTube loads the next page when its spinner comes into view; it checks on scroll and resize.
    ctx.requestAnimationFrame(() => {
      window.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('resize'));
    });
    ctx.setTimeout(schedule, LOAD_STALL_MS + 50);
    schedule();
  };

  function scan(): void {
    const page = getPage();
    const homeItems = [...document.querySelectorAll<HTMLElement>(SEL.homeItem)];
    const relatedItems = [...document.querySelectorAll<HTMLElement>(SEL.relatedItem)];
    const onHome = page.type === 'home';
    const relatedOn = page.type === 'watch' && !live.settings.filter.sidebarHidden;

    if (onHome) homeItems.forEach(processItem);
    else clearItems(homeItems);
    if (relatedOn) relatedItems.forEach(processItem);
    else clearItems(relatedItems);

    applyHomeBatches(homeItems, onHome);
    markEmptyShelves(onHome);
    const feed: Record<Surface, FeedCounts> = {
      home: onHome ? count(homeItems) : { noMatch: 0, distraction: 0 },
      related: relatedOn ? count(relatedItems) : { noMatch: 0, distraction: 0 },
    };
    const prev = overlay.get().feed;
    if (JSON.stringify(prev) !== JSON.stringify(feed)) overlay.set({ feed });
  }

  // "Show" reveals hidden videos for this tab's session only.
  const setReveal = (kind: 'noMatch' | 'distraction', value: boolean) => {
    const reveal = { ...overlay.get().reveal, [kind]: value };
    overlay.set({ reveal });
    setRootClass(ROOT_CLASS.revealNoMatch, reveal.noMatch);
    setRootClass(ROOT_CLASS.revealDistraction, reveal.distraction && live.settings.filter.showDistractionReveal);
    try {
      sessionStorage.setItem(REVEAL_KEY, JSON.stringify(reveal));
    } catch {
      // Storage blocked; reveal still applies until reload.
    }
    schedule();
  };
  overlayActions.setReveal = setReveal;
  try {
    const saved = JSON.parse(sessionStorage.getItem(REVEAL_KEY) ?? 'null');
    if (saved) {
      setReveal('noMatch', !!saved.noMatch);
      setReveal('distraction', !!saved.distraction);
    }
  } catch {
    // Ignore unreadable session state.
  }

  const syncSettings = () => {
    const f = live.settings.filter;
    decisions.clear();
    overlay.set({ showDistractionReveal: f.showDistractionReveal });
    setRootClass(ROOT_CLASS.revealDistraction, overlay.get().reveal.distraction && f.showDistractionReveal);
    setRootClass(ROOT_CLASS.hideSidebar, f.sidebarHidden);
    schedule();
  };
  syncSettings();
  onContextChange(syncSettings);

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
  ctx.onInvalidated(() => observer.disconnect());
}
