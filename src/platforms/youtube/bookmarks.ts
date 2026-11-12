import type { ContentScriptContext } from '#imports';
import { sendMessage, type BookmarkTarget } from '@/core/messaging/protocol';
import { overlay, overlayActions } from '@/ui/content/state';
import { live, onContextChange } from './context';
import { videoIdFromUrl } from './page';
import { BOOKMARK_BUTTON } from './pageStyles';
import { SEL, textOf } from './selectors';
import { OVERLAY_NAME } from './ui';

/** Size of the corner area (px) that must be clear for the button to sit there. */
const SPOT_ZONE = 44;
/** Thumbnails narrower than this are too small for a button. */
const MIN_THUMB_WIDTH = 120;
/** How long "Saved to …" shows before the menu closes. */
const SAVED_NOTICE_MS = 900;

type Spot = 'tl' | 'tr' | 'tc';

const ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.5L5 21V4.5a1 1 0 0 1 1-1Z"/></svg>';

function overlaps(a: DOMRect, b: { left: number; right: number; top: number; bottom: number }): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/** Is anything YouTube draws (badges, labels, icons) in this part of the thumbnail? */
function isTaken(thumb: HTMLElement, button: HTMLElement, zone: { left: number; right: number; top: number; bottom: number }): boolean {
  const box = thumb.getBoundingClientRect();
  for (const el of (thumb.parentElement ?? thumb).querySelectorAll<HTMLElement>('*')) {
    if (el === button || button.contains(el) || el.contains(thumb)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || !overlaps(r, zone)) continue;
    // The image and other full-size layers aren't "something in the corner".
    if (r.width > box.width * 0.6 && r.height > box.height * 0.6) continue;
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.opacity === '0') continue;
    return true;
  }
  return false;
}

/** Top-left if clear, else top-right if clear, else top center. */
function pickSpot(thumb: HTMLElement, button: HTMLElement): Spot {
  const box = thumb.getBoundingClientRect();
  const top = box.top;
  const bottom = box.top + SPOT_ZONE;
  if (!isTaken(thumb, button, { left: box.left, right: box.left + SPOT_ZONE, top, bottom })) return 'tl';
  const hoverIcons = thumb.querySelector(SEL.thumbnailHoverOverlays) ?? thumb.parentElement?.querySelector(SEL.thumbnailHoverOverlays);
  if (!hoverIcons && !isTaken(thumb, button, { left: box.right - SPOT_ZONE, right: box.right, top, bottom })) return 'tr';
  return 'tc';
}

function videoFor(thumb: HTMLAnchorElement): BookmarkTarget | null {
  const videoId = videoIdFromUrl(thumb.href);
  if (!videoId) return null;
  const isShort = new URL(thumb.href, location.origin).pathname.startsWith('/shorts/');
  const card = thumb.closest(SEL.videoCard) ?? thumb.parentElement;
  const title =
    (card && textOf(SEL.tileTitle, card)) ||
    thumb.getAttribute('title') ||
    thumb.querySelector('img')?.getAttribute('alt') ||
    'YouTube video';
  return {
    videoId,
    title,
    url: isShort ? `https://www.youtube.com/shorts/${videoId}` : `https://www.youtube.com/watch?v=${videoId}`,
  };
}

/**
 * Puts a bookmark button on every video thumbnail. Clicking it opens a menu of
 * the folders chosen in settings; picking one saves the video there.
 */
export function startBookmarkButtons(ctx: ContentScriptContext): void {
  let openButton: HTMLButtonElement | null = null;
  let scheduled: number | null = null;
  let closeTimer: number | null = null;

  function closeMenu(): void {
    if (closeTimer !== null) window.clearTimeout(closeTimer);
    closeTimer = null;
    openButton?.setAttribute('aria-expanded', 'false');
    openButton = null;
    if (overlay.get().bookmarkMenu) overlay.set({ bookmarkMenu: null });
  }

  async function openMenu(button: HTMLButtonElement, thumb: HTMLAnchorElement): Promise<void> {
    if (openButton === button) return closeMenu();
    closeMenu();
    const video = videoFor(thumb);
    if (!video) return;
    const r = button.getBoundingClientRect();
    openButton = button;
    button.setAttribute('aria-expanded', 'true');
    overlay.set({
      bookmarkMenu: { video, anchor: { top: r.top, bottom: r.bottom, left: r.left, right: r.right }, folders: undefined, savedTo: null, error: null },
    });
    try {
      const folders = await sendMessage('bookmarkFolders', { videoId: video.videoId });
      const menu = overlay.get().bookmarkMenu;
      if (menu?.video.videoId === video.videoId) overlay.set({ bookmarkMenu: { ...menu, folders } });
    } catch {
      const menu = overlay.get().bookmarkMenu;
      if (menu) overlay.set({ bookmarkMenu: { ...menu, folders: [], error: "Couldn't read your bookmarks. Reload the page and try again." } });
    }
  }

  overlayActions.closeBookmarkMenu = closeMenu;
  overlayActions.openBookmarkSettings = () => {
    closeMenu();
    void sendMessage('openSettings', { section: 'bookmarks' });
  };
  overlayActions.toggleBookmark = async (folder) => {
    const menu = overlay.get().bookmarkMenu;
    if (!menu) return;
    const saving = !folder.saved;
    try {
      const folders = await sendMessage('setBookmark', { folderId: folder.id, saved: saving, video: menu.video });
      const current = overlay.get().bookmarkMenu;
      if (current?.video.videoId !== menu.video.videoId) return;
      overlay.set({ bookmarkMenu: { ...current, folders, savedTo: saving ? folder.title : null, error: null } });
      if (saving) closeTimer = window.setTimeout(closeMenu, SAVED_NOTICE_MS);
    } catch {
      const current = overlay.get().bookmarkMenu;
      if (current) overlay.set({ bookmarkMenu: { ...current, error: "Couldn't save the bookmark. Try again." } });
    }
  };

  function addButton(thumb: HTMLAnchorElement): void {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = BOOKMARK_BUTTON;
    button.setAttribute('aria-label', 'Bookmark this video');
    button.setAttribute('aria-haspopup', 'menu');
    button.setAttribute('aria-expanded', 'false');
    button.dataset.spot = 'tl';
    button.innerHTML = ICON;
    // The button sits inside the thumbnail link: keep presses from opening the video.
    for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'dblclick'] as const) {
      button.addEventListener(type, (e) => e.stopPropagation());
    }
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      void openMenu(button, thumb);
    });
    if (getComputedStyle(thumb).position === 'static') thumb.style.position = 'relative';
    thumb.dataset.ffBm = '';
    thumb.append(button);
    // Corners are checked when the button is about to show, once the thumbnail is laid out.
    thumb.addEventListener('mouseenter', () => {
      if (openButton !== button) button.dataset.spot = pickSpot(thumb, button);
    });
  }

  function scan(): void {
    const enabled = live.settings.bookmarks.enabled;
    for (const thumb of document.querySelectorAll<HTMLAnchorElement>(SEL.thumbnailLink)) {
      const existing = thumb.querySelector<HTMLButtonElement>(`:scope > .${BOOKMARK_BUTTON}`);
      if (!enabled) {
        existing?.remove();
        continue;
      }
      if (existing || !videoIdFromUrl(thumb.href) || !thumb.querySelector('img')) continue;
      if (thumb.getBoundingClientRect().width < MIN_THUMB_WIDTH && thumb.offsetParent !== null) continue;
      addButton(thumb);
    }
    if (!enabled) closeMenu();
  }

  const schedule = () => {
    if (scheduled !== null) return;
    scheduled = ctx.setTimeout(() => {
      scheduled = null;
      scan();
    }, 300);
  };

  // Close on a click elsewhere, Escape, scrolling (the menu would drift), or navigation.
  const host = () => document.querySelector(OVERLAY_NAME);
  ctx.addEventListener(
    document,
    'pointerdown',
    (e) => {
      if (!openButton) return;
      const path = e.composedPath();
      if (!path.includes(openButton) && !path.some((n) => n === host())) closeMenu();
    },
    { capture: true },
  );
  ctx.addEventListener(document, 'keydown', (e) => {
    if (openButton && e.key === 'Escape') closeMenu();
  });
  ctx.addEventListener(window, 'scroll', () => openButton && closeMenu(), { capture: true, passive: true });
  ctx.addEventListener(window, 'resize', () => openButton && closeMenu());
  ctx.addEventListener(document, 'yt-navigate-start' as keyof DocumentEventMap, () => closeMenu());

  onContextChange(schedule);
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  ctx.onInvalidated(() => {
    observer.disconnect();
    closeMenu();
    for (const button of document.querySelectorAll(`.${BOOKMARK_BUTTON}`)) button.remove();
  });
  scan();
}
