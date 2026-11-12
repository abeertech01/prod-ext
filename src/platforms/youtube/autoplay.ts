import type { ContentScriptContext } from '#imports';
import { live, onContextChange } from './context';
import type { PageInfo } from './page';
import { ROOT_CLASS, setRootClass } from './pageStyles';
import { onAnyVideoPlay } from './player';
import { SEL } from './selectors';

/**
 * Autoplay off: no hover previews on the home feed, and nothing plays by
 * itself when a video ends (YouTube's autoplay toggle is switched off once
 * per page, so the user can still flip it back on for that video).
 */
export function startAutoplayBlocker(ctx: ContentScriptContext, getPage: () => PageInfo): void {
  let handledUrl: string | null = null;

  const sync = () => setRootClass(ROOT_CLASS.noAutoplay, live.settings.filter.autoplayDisabled);
  sync();
  onContextChange(sync);

  onAnyVideoPlay(ctx, (video) => {
    if (live.settings.filter.autoplayDisabled && video.closest(SEL.inlinePreview)) {
      video.muted = true;
      video.pause();
    }
  });

  ctx.setInterval(() => {
    const page = getPage();
    if (!live.settings.filter.autoplayDisabled || page.type !== 'watch') return;
    if (handledUrl !== page.url) {
      const toggle = document.querySelector<HTMLElement>(SEL.autoplayToggleOn);
      if (toggle) {
        toggle.click();
        handledUrl = page.url;
      }
    }
    const cancel = document.querySelector<HTMLElement>(SEL.autoplayCancel);
    if (cancel && cancel.offsetParent !== null) cancel.click();
  }, 1000);
}
