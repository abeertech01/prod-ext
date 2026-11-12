import type { ContentScriptContext } from '#imports';
import { mountReact } from '@/ui/mount';
import { SocialOverlay } from '@/ui/social/Overlay';
import { createSocialUi } from '@/ui/social/state';

export const fbUi = createSocialUi('Facebook');

export async function mountFbUi(ctx: ContentScriptContext): Promise<void> {
  await mountReact(ctx, 'focus-filter-overlay', <SocialOverlay ui={fbUi} />, 'body', 'last', false);
}
