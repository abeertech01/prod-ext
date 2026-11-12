import type { ContentScriptContext } from '#imports';
import { FeedBanner, HomeFeedCard } from '@/ui/content/FeedBanner';
import { Overlay } from '@/ui/content/Overlay';
import { mountReact } from '@/ui/mount';
import { SEL } from './selectors';

/** Tag name of the shadow host that holds the overlay (modals, toasts, menus). */
export const OVERLAY_NAME = 'focus-filter-overlay';

export async function mountUi(ctx: ContentScriptContext): Promise<void> {
  await Promise.all([
    mountReact(ctx, OVERLAY_NAME, <Overlay />, 'body', 'last', false),
    mountReact(ctx, 'focus-filter-home-banner', <FeedBanner surface="home" />, SEL.homeGridContents, 'before', true),
    mountReact(ctx, 'focus-filter-home-end', <HomeFeedCard />, SEL.homeGridContents, 'after', true),
    mountReact(ctx, 'focus-filter-related-banner', <FeedBanner surface="related" />, SEL.related, 'first', true),
  ]);
}
