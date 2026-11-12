import type { ContentScriptContext } from '#imports';
import type { PageInfo } from './page';
import { SEL, queryFirst } from './selectors';

/** The video the user is actually watching: Shorts player, main player, or mini-player. */
export function activeVideo(page: PageInfo): HTMLVideoElement | null {
  if (page.type === 'shorts') return queryFirst<HTMLVideoElement>(SEL.shortsVideo);
  return queryFirst<HTMLVideoElement>(SEL.mainVideo);
}

const playbackLocks = new Set<string>();

/** Keep videos paused while any feature holds a lock (the Shorts limit). */
export function lockPlayback(reason: string, page: PageInfo): void {
  playbackLocks.add(reason);
  activeVideo(page)?.pause();
}

export function unlockPlayback(reason: string): void {
  playbackLocks.delete(reason);
}

export function isPlaybackLocked(): boolean {
  return playbackLocks.size > 0;
}

/** `play` doesn't bubble, so listen in the capture phase for every video on the page. */
export function onAnyVideoPlay(ctx: ContentScriptContext, cb: (video: HTMLVideoElement) => void): void {
  ctx.addEventListener(
    document,
    'play',
    (e) => {
      if (e.target instanceof HTMLVideoElement) cb(e.target);
    },
    { capture: true },
  );
}
