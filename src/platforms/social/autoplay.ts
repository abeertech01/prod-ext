import type { ContentScriptContext } from '#imports';
import type { SocialPage } from './page';
import { onAnyVideoPlay } from './player';

/** A play this soon after the user clicked, tapped or pressed a key is theirs. */
const GESTURE_MS = 1_500;
/** After the user opens a Reel, video or post page, its video may start on its own once, within this time. */
const OPEN_PAGE_MS = 8_000;
const NON_GESTURE_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', 'Tab', 'Shift', 'Control', 'Alt', 'Meta']);
const OPENED_PAGES = new Set<SocialPage['type']>(['reel', 'video', 'post']);

/**
 * Videos play only when the user starts them: no autoplay in the feed, no
 * looping, and nothing starts by itself after a video ends. Stories are left
 * alone; they move from one to the next by design.
 */
export function startAutoplayRules(ctx: ContentScriptContext, getPage: () => SocialPage) {
  let lastGesture = 0;
  let openPageUntil = 0;

  const gesture = () => (lastGesture = Date.now());
  ctx.addEventListener(document, 'pointerdown', gesture, { capture: true });
  ctx.addEventListener(document, 'touchend', gesture, { capture: true });
  ctx.addEventListener(
    document,
    'keydown',
    (e) => {
      if (!NON_GESTURE_KEYS.has(e.key)) gesture();
    },
    { capture: true },
  );
  // Scrolling to another Reel (when allowed) is the user choosing it.
  ctx.addEventListener(
    window,
    'wheel',
    () => {
      if (getPage().type === 'reel') gesture();
    },
    { capture: true, passive: true },
  );

  // Reels loop by default.
  const noLoop = (video: HTMLVideoElement) => {
    if (video.loop) video.loop = false;
    video.removeAttribute('loop');
  };
  ctx.addEventListener(
    document,
    'loadedmetadata',
    (e) => {
      if (e.target instanceof HTMLVideoElement) noLoop(e.target);
    },
    { capture: true },
  );

  onAnyVideoPlay(ctx, (video) => {
    noLoop(video);
    if (getPage().type === 'stories') return;
    const now = Date.now();
    if (now - lastGesture < GESTURE_MS) return;
    if (now < openPageUntil) {
      openPageUntil = 0;
      return;
    }
    video.pause();
  });

  return {
    onNavigate(next: SocialPage) {
      const userOpened = Date.now() - lastGesture < GESTURE_MS * 2;
      openPageUntil = userOpened && OPENED_PAGES.has(next.type) ? Date.now() + OPEN_PAGE_MS : 0;
    },
  };
}
