import type { ContentScriptContext } from '#imports';
import { FeedBanner, HomeFeedCard } from '@/ui/content/FeedBanner';
import { HB, HomeBookmarks } from '@/ui/content/HomeBookmarks';
import { createRoot } from 'react-dom/client';
import { Overlay } from '@/ui/content/Overlay';
import { mountReact } from '@/ui/mount';
import { SEL } from './selectors';

/** Tag name of the shadow host that holds the overlay (modals, toasts, menus). */
export const OVERLAY_NAME = 'focus-filter-overlay';
/** Tag name of the "N videos hidden by filter" row above the home feed. */
const BANNER_NAME = 'focus-filter-home-banner';

export async function mountUi(ctx: ContentScriptContext): Promise<void> {
  await Promise.all([
    mountReact(ctx, OVERLAY_NAME, <Overlay />, 'body', 'last', false),
    mountReact(ctx, BANNER_NAME, <FeedBanner surface="home" />, SEL.homeGridContents, 'before', true),
    mountReact(ctx, 'focus-filter-home-end', <HomeFeedCard />, SEL.homeGridContents, 'after', true),
    mountReact(ctx, 'focus-filter-related-banner', <FeedBanner surface="related" />, SEL.related, 'first', true),
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
    // Above the "N videos hidden by filter" row, which belongs to the suggestions below.
    const banner = contents.previousElementSibling?.localName === BANNER_NAME ? contents.previousElementSibling : null;
    const anchor = banner ?? contents;
    if (host.nextElementSibling !== anchor) anchor.before(host);
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
