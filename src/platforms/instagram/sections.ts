import type { ContentScriptContext } from '#imports';
import { igLive, igSite } from './context';
import { IG_HIDDEN } from './pageStyles';
import { BLOCKED_LINKS, IG, LABEL, normalize } from './selectors';

/** The Stories row is a short band across the top of the feed. */
const TRAY_MAX_HEIGHT = 220;

function isBlockedLink(a: HTMLAnchorElement): boolean {
  try {
    const path = new URL(a.href, location.origin).pathname.replace(/\/+$/, '');
    return BLOCKED_LINKS.includes(path);
  } catch {
    return false;
  }
}

/** The link plus any wrappers that hold nothing else. */
function outerItem(el: HTMLElement): HTMLElement {
  let item = el;
  while (item.parentElement && item.parentElement !== document.body && item.parentElement.childElementCount === 1 && !item.parentElement.matches('nav, [role="navigation"]')) {
    item = item.parentElement;
  }
  return item;
}

function setHidden(el: HTMLElement, reason: string, on: boolean): void {
  if (on) {
    if (el.dataset.ffIg !== reason) el.dataset.ffIg = reason;
  } else if (el.dataset.ffIg === reason) delete el.dataset.ffIg;
}

/**
 * Hides the Explore and Reels links, "Suggested for you" account rows outside
 * the feed (the sidebar), and the Stories row when stories are turned off.
 */
export function startIgSections(ctx: ContentScriptContext): void {
  let scheduled: number | null = null;

  function hideMenuLinks(): void {
    for (const a of document.querySelectorAll<HTMLAnchorElement>('a[href]')) {
      if (!isBlockedLink(a) || a.closest(IG.article)) continue;
      outerItem(a).dataset.ffIg = IG_HIDDEN.section;
    }
  }

  /** A "Suggested for you" block is the largest box that starts with its title. */
  function suggestedAccounts(): void {
    const show = igLive.settings.instagram.suggestedAccounts;
    for (const label of document.querySelectorAll<HTMLElement>(IG.labels)) {
      if (label.childElementCount > 0 || label.closest(IG.article)) continue;
      const title = normalize(label.textContent ?? '');
      if (!LABEL.suggestedAccounts.includes(title)) continue;
      let box = label;
      while (box.parentElement && box.parentElement !== document.body && normalize(box.parentElement.innerText).startsWith(title) && !box.parentElement.matches(IG.main) && !box.parentElement.querySelector(IG.article)) {
        box = box.parentElement;
      }
      if (box !== label) setHidden(box, IG_HIDDEN.accounts, !show);
    }
  }

  function storiesTray(): void {
    const hidden = igLive.settings.instagram.stories.mode === 'hidden';
    if (!hidden) {
      for (const el of document.querySelectorAll<HTMLElement>(`[data-ff-ig="${IG_HIDDEN.stories}"]`)) delete el.dataset.ffIg;
      return;
    }
    const main = document.querySelector<HTMLElement>(IG.main);
    if (!main) return;
    const items = [...main.querySelectorAll<HTMLElement>(IG.storyItems)].filter((i) => !i.closest(IG.article) && !i.closest(IG.dialog));
    for (const item of items) {
      let band: HTMLElement = item;
      while (
        band.parentElement &&
        band.parentElement !== main &&
        band.parentElement.getBoundingClientRect().height <= TRAY_MAX_HEIGHT &&
        !band.parentElement.querySelector(IG.article)
      ) {
        band = band.parentElement;
      }
      // A row of several stories, not a single avatar elsewhere on the page.
      if (band.querySelectorAll(IG.storyItems).length >= 3) band.dataset.ffIg = IG_HIDDEN.stories;
    }
  }

  function scan(): void {
    hideMenuLinks();
    suggestedAccounts();
    storiesTray();
  }

  const schedule = () => {
    if (scheduled !== null) return;
    scheduled = ctx.setTimeout(() => {
      scheduled = null;
      scan();
    }, 300);
  };
  igSite.onChange(schedule);
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  ctx.onInvalidated(() => observer.disconnect());
  scan();
}
