import type { ContentScriptContext } from '#imports';
import { INSTAGRAM_FEED } from '@/core/social/daily';
import { mountReact } from '@/ui/mount';
import { FeedEndCard } from '@/ui/social/FeedEndCard';
import { SocialOverlay } from '@/ui/social/Overlay';
import { createSocialUi } from '@/ui/social/state';
import { IG_END_ATTR } from './pageStyles';

export const igUi = createSocialUi('Instagram');

export async function mountIgUi(ctx: ContentScriptContext): Promise<void> {
  await Promise.all([
    mountReact(ctx, 'focus-filter-overlay', <SocialOverlay ui={igUi} />, 'body', 'last', false),
    mountReact(
      ctx,
      'focus-filter-ig-feed-end',
      <FeedEndCard ui={igUi} limits={INSTAGRAM_FEED} stillWorks="Messages, notifications, search and profiles still work as usual." />,
      `[${IG_END_ATTR}]`,
      'last',
      true,
    ),
  ]);
}
