import type { ContentScriptContext } from '#imports';
import { overlay, overlayActions } from '@/ui/content/state';
import { live, onContextChange } from './context';
import type { PageInfo } from './page';
import { ROOT_CLASS, setRootClass } from './pageStyles';
import { lockPlayback, unlockPlayback } from './player';

const LOCK = 'shorts-limit';
const SCROLL_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp']);
/** A trackpad fires dozens of wheel events per swipe; refresh the toast at most this often. */
const TOAST_REFRESH_MS = 250;

function isEditable(target: EventTarget | undefined): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

/**
 * A Shorts "session" starts when the user opens a Short from anywhere else
 * (search, home, the sidebar's Shorts button, a link). The first Short is
 * free; after `allowedScrolls` more, scrolling is locked. If a new Short
 * still slips through, it's paused behind a blocking notice.
 */
export function startShortsBlocker(ctx: ContentScriptContext, getPage: () => PageInfo) {
  let seen: string[] = [];
  let locked = false;

  function update(): void {
    const page = getPage();
    const { blockScrolling, allowedScrolls } = live.settings.shorts;
    if (page.type !== 'shorts' || !blockScrolling) {
      locked = false;
      setRootClass(ROOT_CLASS.shortsLocked, false);
      unlockPlayback(LOCK);
      overlay.set({ shorts: null });
      return;
    }
    const scrollsLeft = allowedScrolls - (seen.length - 1);
    const overLimit = scrollsLeft < 0;
    locked = scrollsLeft <= 0;
    setRootClass(ROOT_CLASS.shortsLocked, locked);
    if (overLimit) lockPlayback(LOCK, page);
    else unlockPlayback(LOCK);
    overlay.set({ shorts: { scrollsLeft: Math.max(0, scrollsLeft), locked, overLimit } });
  }

  const block = (e: Event) => {
    if (!locked || getPage().type !== 'shorts') return;
    if (e instanceof KeyboardEvent && (!SCROLL_KEYS.has(e.key) || isEditable(e.composedPath()[0]))) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (Date.now() - overlay.get().shortsBlockedAt >= TOAST_REFRESH_MS) overlay.set({ shortsBlockedAt: Date.now() });
  };
  for (const type of ['wheel', 'touchmove', 'keydown'] as const) {
    ctx.addEventListener(window, type, block, { capture: true, passive: false });
  }

  overlayActions.leaveShorts = () => location.assign('/');
  onContextChange(update);

  return {
    onNavigate(next: PageInfo, prev: PageInfo | null) {
      if (next.type !== 'shorts' || !next.videoId) seen = [];
      else {
        if (prev?.type !== 'shorts') seen = [];
        if (!seen.includes(next.videoId)) seen.push(next.videoId);
      }
      update();
    },
  };
}
