import type { ContentScriptContext } from '#imports';

export type PageType = 'home' | 'watch' | 'shorts' | 'search' | 'other';

export interface PageInfo {
  type: PageType;
  /** Video on screen in the main player (watch) or Shorts player. */
  videoId: string | null;
  url: string;
}

export function videoIdFromUrl(href: string): string | null {
  try {
    const url = new URL(href, location.origin);
    const shorts = url.pathname.match(/^\/shorts\/([\w-]{6,})/);
    if (shorts) return shorts[1]!;
    if (url.pathname === '/watch') return url.searchParams.get('v');
  } catch {
    // Not a URL.
  }
  return null;
}

export function readPage(href = location.href): PageInfo {
  const url = new URL(href);
  const path = url.pathname;
  let type: PageType = 'other';
  if (path === '/' || path === '') type = 'home';
  else if (path === '/watch') type = 'watch';
  else if (path.startsWith('/shorts/')) type = 'shorts';
  else if (path === '/results') type = 'search';
  return { type, videoId: videoIdFromUrl(href), url: href };
}

/**
 * Call `cb(next, prev)` on every SPA navigation. YouTube fires
 * `yt-navigate-finish`; WXT's `wxt:locationchange` covers anything else.
 */
export function onNavigate(ctx: ContentScriptContext, cb: (next: PageInfo, prev: PageInfo | null) => void): void {
  let prev: PageInfo | null = null;
  const fire = () => {
    const next = readPage();
    if (prev && prev.url === next.url) return;
    const last = prev;
    prev = next;
    cb(next, last);
  };
  ctx.addEventListener(window, 'wxt:locationchange', fire);
  ctx.addEventListener(document, 'yt-navigate-finish' as keyof DocumentEventMap, fire);
  fire();
}
