import type { ContentScriptContext } from '#imports';
import type { SocialUi } from '@/ui/social/state';
import type { SocialPage } from './page';
import { lockPlayback, unlockPlayback } from './player';

const LOCK = 'reels-limit';
const SCROLL_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ']);
/** A trackpad fires dozens of wheel events per swipe; refresh the toast at most this often. */
const TOAST_REFRESH_MS = 250;

function isEditable(target: EventTarget | undefined): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

/** Scrolling inside a panel without videos (comments, a caption) isn't moving to another Reel. */
function inTextPanel(target: EventTarget | undefined): boolean {
  for (let el = target instanceof Element ? target : null; el && el !== document.body; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1) return !el.querySelector('video');
  }
  return false;
}

export interface ReelsLockOptions {
  ui: SocialUi;
  /** Root class that hides the site's next/previous Reel buttons. */
  rootClass: string;
  /** The user allowed scrolling to the next Reel in settings. */
  allowed: () => boolean;
  onChange: (listener: () => void) => void;
}

/**
 * Like YouTube Shorts: the Reel the user opens plays, but scrolling to the
 * next one is blocked unless the user allowed it in settings. If another
 * Reel still gets through, it's paused behind a notice.
 */
export function startReelsLock(ctx: ContentScriptContext, getPage: () => SocialPage, opts: ReelsLockOptions) {
  const { store } = opts.ui;
  let seen: string[] = [];
  let locked = false;

  function update(): void {
    const blocking = getPage().type === 'reel' && !opts.allowed();
    locked = blocking;
    document.documentElement.classList.toggle(opts.rootClass, blocking);
    if (blocking && seen.length > 1) {
      lockPlayback(LOCK);
      store.set({ notice: { kind: 'reels' } });
    } else {
      unlockPlayback(LOCK);
      if (store.get().notice?.kind === 'reels') store.set({ notice: null });
    }
  }

  const block = (e: Event) => {
    if (!locked || getPage().type !== 'reel') return;
    const target = e.composedPath()[0];
    if (e instanceof KeyboardEvent && (!SCROLL_KEYS.has(e.key) || isEditable(target))) return;
    if (!(e instanceof KeyboardEvent) && inTextPanel(target)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (Date.now() - store.get().scrollBlockedAt >= TOAST_REFRESH_MS) store.set({ scrollBlockedAt: Date.now() });
  };
  for (const type of ['wheel', 'touchmove', 'keydown'] as const) {
    ctx.addEventListener(window, type, block, { capture: true, passive: false });
  }

  opts.onChange(update);

  return {
    onNavigate(next: SocialPage, prev: SocialPage | null) {
      if (next.type !== 'reel' || !next.reelId) seen = [];
      else {
        if (prev?.type !== 'reel') seen = [];
        if (!seen.includes(next.reelId)) seen.push(next.reelId);
      }
      update();
    },
  };
}
