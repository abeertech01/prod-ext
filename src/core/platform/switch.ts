import type { ContentScriptContext } from '#imports';
import type { PlatformId } from '../settings/schema';
import { getSettings, watchSettings } from '../settings/storage';

/**
 * Starts a site's rules only while the site is switched on in the popup. A site
 * that's off is left exactly as it is: nothing is started. When the switch is
 * flipped, the page reloads so the change takes effect (a tab in the background
 * reloads when the user next looks at it).
 */
export async function startIfOn(ctx: ContentScriptContext, id: PlatformId, start: () => void | Promise<void>, onOff?: () => void): Promise<void> {
  const on = (await getSettings()).platforms[id];
  let reloading = false;
  const unwatch = watchSettings((settings) => {
    if (settings.platforms[id] === on || reloading) return;
    reloading = true;
    if (!document.hidden) return location.reload();
    ctx.addEventListener(document, 'visibilitychange', () => {
      if (!document.hidden) location.reload();
    });
  });
  ctx.onInvalidated(unwatch);
  if (on) await start();
  else onOff?.();
}
