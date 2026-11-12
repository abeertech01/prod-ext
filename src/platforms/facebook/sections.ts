import type { ContentScriptContext } from '#imports';
import { FB_HIDDEN } from './pageStyles';
import { DISTRACTING_PATHS, FB, LABEL } from './selectors';

function isDistractingLink(a: HTMLAnchorElement): boolean {
  try {
    const { pathname } = new URL(a.href, location.origin);
    return DISTRACTING_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  } catch {
    return false;
  }
}

function hide(el: HTMLElement): void {
  if (el.dataset.ffFb !== FB_HIDDEN.section) el.dataset.ffFb = FB_HIDDEN.section;
}

/** Video/Watch, Marketplace and Gaming in the top bar and the left menu. */
function hideMenuItems(): void {
  for (const menu of document.querySelectorAll(FB.menus)) {
    for (const a of menu.querySelectorAll<HTMLAnchorElement>('a[href]')) {
      if (isDistractingLink(a)) hide(a.closest<HTMLElement>('li') ?? a);
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
 * Hides, with no setting to bring them back: the Video/Watch, Marketplace and
 * Gaming menu items, and "Trending" and suggested-video panels.
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
  scan();
}
