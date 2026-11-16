import type { ContentScriptContext } from '#imports';
import { HomeFeedCard } from '@/ui/content/FeedBanner';
import { HB, HomeBookmarks } from '@/ui/content/HomeBookmarks';
import { createRoot } from 'react-dom/client';
import { Overlay } from '@/ui/content/Overlay';
import { mountReact } from '@/ui/mount';
import { SEL } from './selectors';

/** Tag name of the shadow host that holds the overlay (modals, toasts, menus). */
export const OVERLAY_NAME = 'focus-filter-overlay';

export async function mountUi(ctx: ContentScriptContext): Promise<void> {
  await Promise.all([
    mountReact(ctx, OVERLAY_NAME, <Overlay />, 'body', 'last', false),
    mountReact(ctx, 'focus-filter-home-end', <HomeFeedCard />, SEL.homeGridContents, 'after', true),
  ]);
}

/**
 * The bookmarked videos at the top of the home feed. Unlike the rest of the UI, it lives in
 * YouTube's page, not a shadow root: placed in the home grid just above the videos, its cards
 * take YouTube's own grid sizes (videos per row, spacing). Put back whenever YouTube rebuilds
 * the grid.
 */
export function mountHomeBookmarks(ctx: ContentScriptContext): void {
  const host = document.createElement('div');
  host.className = HB.root;
  const root = createRoot(host);
  root.render(<HomeBookmarks />);

  let frame: number | null = null;
  const place = () => {
    frame = null;
    const contents = document.querySelector(SEL.homeGridContents);
    if (!contents) return;
    if (host.nextElementSibling !== contents) contents.before(host);
  };
  const observer = new MutationObserver(() => {
    if (frame === null) frame = requestAnimationFrame(place);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  place();
  ctx.onInvalidated(() => {
    observer.disconnect();
    root.unmount();
    host.remove();
  });
}
