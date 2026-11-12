import type { ContentScriptContext } from '#imports';

const locks = new Set<string>();

/** Keep every video paused while any feature holds a lock (Reels past the limit, stories over the limit). */
export function lockPlayback(reason: string): void {
  locks.add(reason);
  for (const video of document.querySelectorAll('video')) video.pause();
}

export function unlockPlayback(reason: string): void {
  locks.delete(reason);
}

export function isPlaybackLocked(): boolean {
  return locks.size > 0;
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
