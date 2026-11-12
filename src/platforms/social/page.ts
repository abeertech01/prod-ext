import type { ContentScriptContext } from '#imports';

/** The kind of page a social site is showing; each site maps its URLs onto these. */
export type SocialPageType = 'home' | 'reel' | 'stories' | 'video' | 'post' | 'profile' | 'blocked' | 'other';

export interface SocialPage {
  type: SocialPageType;
  reelId: string | null;
  /** The person (story bucket) whose stories are open. */
  storyProfile: string | null;
  url: string;
}

/**
 * Call `cb(next, prev)` whenever the site's single-page navigation changes the URL.
 * WXT's event can fire before `location` updates, so the new URL is read from the event.
 */
export function onSocialNavigate(
  ctx: ContentScriptContext,
  read: (href: string) => SocialPage,
  cb: (next: SocialPage, prev: SocialPage | null) => void,
): void {
  let prev: SocialPage | null = null;
  const fire = (href: string) => {
    const next = read(href);
    if (prev && prev.url === next.url) return;
    const last = prev;
    prev = next;
    cb(next, last);
  };
  ctx.addEventListener(window, 'wxt:locationchange', (e) => fire(e.newUrl.href));
  ctx.addEventListener(window, 'popstate', () => fire(location.href));
  fire(location.href);
}
