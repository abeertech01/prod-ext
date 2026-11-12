import type { ContentScriptContext } from '#imports';

import { onSocialNavigate, type SocialPage, type SocialPageType } from '../social/page';

export type FbPage = SocialPage;

/** First path parts that are Facebook sections, not someone's profile. */
const NOT_PROFILES = new Set(
  'ads bookmarks business events feeds friends fundraisers gaming groups hashtag help live login marketplace memories messages news notifications pages photo photos policies privacy reel reels saved search settings share stories watch weather'.split(' '),
);

/** `/name`, `/people/…` or `profile.php?id=…` for a link to someone's profile; null for any other link. */
export function fbProfileKey(href: string): string | null {
  try {
    const url = new URL(href, location.origin);
    if (!/(^|\.)facebook\.com$/.test(url.hostname)) return null;
    const path = url.pathname.replace(/\/+$/, '').toLowerCase();
    if (path === '/profile.php') {
      const id = url.searchParams.get('id');
      return id ? `profile.php?id=${id}` : null;
    }
    if (path.startsWith('/people/')) return path;
    const part = path.slice(1);
    // `.php` pages (like the `/l.php` link redirect) aren't people.
    if (!/^[\w.-]+$/.test(part) || part.endsWith('.php') || NOT_PROFILES.has(part)) return null;
    return path;
  } catch {
    return null;
  }
}

export function readFbPage(href = location.href): FbPage {
  const url = new URL(href);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const reel = path.match(/^\/reel\/([\w-]+)/);
  const story = path.match(/^\/stories\/([^/]+)/);
  let type: SocialPageType = 'other';
  if (path === '/' || path === '/home.php') type = 'home';
  else if (reel) type = 'reel';
  else if (story) type = 'stories';
  else if (path === '/watch' || path === '/video.php' || /\/videos\/[\w.-]+/.test(path)) type = 'video';
  else if (fbProfileKey(href)) type = 'profile';
  return { type, reelId: reel?.[1] ?? null, storyProfile: story?.[1] ?? null, url: href };
}

/** Call `cb(next, prev)` whenever the site's single-page navigation changes the URL. */
export function onFbNavigate(ctx: ContentScriptContext, cb: (next: SocialPage, prev: SocialPage | null) => void): void {
  onSocialNavigate(ctx, readFbPage, cb);
}
