import type { ContentScriptContext } from '#imports';
import { onSocialNavigate, type SocialPage, type SocialPageType } from '../social/page';

export function readIgPage(href = location.href): SocialPage {
  const url = new URL(href);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const reel = path.match(/^(?:\/[\w.]+)?\/reels?\/(?!audio\b)([\w-]+)/);
  const story = path.match(/^\/stories\/([^/]+)(?:\/([^/]+))?/);
  let type: SocialPageType = 'other';
  let storyProfile: string | null = null;
  if (path === '/') type = 'home';
  // The Explore grid and the Reels feed are blocked. Search (/explore/search on phones) still works.
  else if ((/^\/explore(\/|$)/.test(path) && !path.startsWith('/explore/search')) || path === '/reels') type = 'blocked';
  else if (reel) type = 'reel';
  else if (story) {
    type = 'stories';
    // A highlight belongs to one profile; count it under its own ID.
    storyProfile = story[1] === 'highlights' ? `highlights:${story[2] ?? ''}` : story[1]!;
  } else if (/^(?:\/[\w.]+)?\/(p|tv)\/[\w-]+/.test(path)) type = 'post';
  return { type, reelId: reel?.[1] ?? null, storyProfile, url: href };
}

/** Call `cb(next, prev)` whenever the site's single-page navigation changes the URL. */
export function onIgNavigate(ctx: ContentScriptContext, cb: (next: SocialPage, prev: SocialPage | null) => void): void {
  onSocialNavigate(ctx, readIgPage, cb);
}
