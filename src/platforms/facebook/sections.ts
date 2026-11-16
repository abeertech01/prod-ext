import type { ContentScriptContext } from '#imports';
import { fbLive, fbSite } from './context';
import { FB_HIDDEN } from './pageStyles';
import { DISTRACTING_PATHS, FB, LABEL, OPTIONAL_PATHS } from './selectors';

/** The menu paths hidden right now: always Video, plus Marketplace and Gaming unless turned on. */
function hiddenPaths(): string[] {
  const { marketplace, gaming } = fbLive.settings.facebook;
  return [...DISTRACTING_PATHS, ...(marketplace ? [] : [OPTIONAL_PATHS.marketplace]), ...(gaming ? [] : [OPTIONAL_PATHS.gaming])];
}

const ALL_PATHS = [...DISTRACTING_PATHS, ...Object.values(OPTIONAL_PATHS)];

function matches(a: HTMLAnchorElement, paths: string[]): boolean {
  try {
    const { pathname } = new URL(a.href, location.origin);
    return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  } catch {
    return false;
  }
}

function hide(el: HTMLElement): void {
  if (el.dataset.ffFb !== FB_HIDDEN.section) el.dataset.ffFb = FB_HIDDEN.section;
}

/**
 * Video/Watch, Marketplace and Gaming in the top bar and the left menu. One the user
 * turned back on in settings is shown again.
 */
function hideMenuItems(): void {
  const hidden = hiddenPaths();
  for (const menu of document.querySelectorAll(FB.menus)) {
    for (const a of menu.querySelectorAll<HTMLAnchorElement>('a[href]')) {
      if (!matches(a, ALL_PATHS)) continue;
      const item = a.closest<HTMLElement>('li') ?? a;
      if (matches(a, hidden)) hide(item);
      else if (item.dataset.ffFb === FB_HIDDEN.section) delete item.dataset.ffFb;
    }
  }
}

/** "Trending" and suggested-video panels: the largest box that starts with the panel's heading. */
function hidePanels(): void {
  for (const area of document.querySelectorAll<HTMLElement>(`${FB.rightRail}, ${FB.main}`)) {
    for (const h of area.querySelectorAll<HTMLElement>(FB.headings)) {
      // Raw text first: it's cheap, and most headings are posts' own.
      const title = (h.textContent ?? '').trim().toLowerCase();
      if (!LABEL.panels.includes(title) || h.closest('[data-ff-fb]')) continue;
      let box = h;
      while (box.parentElement && box.parentElement !== area && box.parentElement.innerText.trim().toLowerCase().startsWith(title)) {
        box = box.parentElement;
      }
      hide(box);
    }
  }
}

/**
 * Hides, with no setting to bring them back: the Video/Watch menu item, and
 * "Trending" and suggested-video panels. Marketplace and Gaming are hidden
 * too, unless the user turns them back on in settings.
 */
export function startFbSections(ctx: ContentScriptContext): void {
  const scan = () => {
    hideMenuItems();
    hidePanels();
  };
  // Checked right after each change, before the screen is painted, so nothing flashes up.
  let frame: number | null = null;
  const observer = new MutationObserver(() => {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      scan();
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  ctx.onInvalidated(() => observer.disconnect());
  fbSite.onChange(scan);
  scan();
}
