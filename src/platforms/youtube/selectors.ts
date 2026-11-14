/**
 * Every YouTube DOM selector lives here. YouTube renames and restructures its
 * components often; when something stops working, this is the file to fix.
 * Lists are tried in order, so put the current markup first and keep older
 * variants as fallbacks.
 */
export const SEL = {
  // ── Home feed ────────────────────────────────────────────────────────────
  homeBrowse: 'ytd-browse[page-subtype="home"]',
  homeGridContents: 'ytd-browse[page-subtype="home"] ytd-rich-grid-renderer > #contents',
  homeItem: 'ytd-browse[page-subtype="home"] ytd-rich-item-renderer',
  /** Shelves (e.g. Shorts) whose items don't count toward the home cap. */
  shelf: 'ytd-rich-shelf-renderer, ytd-rich-section-renderer',
  /** Outermost wrapper of a shelf, hidden as a whole when all its items are filtered. */
  shelfContainer: 'ytd-rich-section-renderer',
  homeContinuation: 'ytd-browse[page-subtype="home"] ytd-continuation-item-renderer',

  // ── Video tiles (home grid, sidebar) ─────────────────────────────────────
  tileVideoLink: 'a[href*="/watch?v="], a[href^="/shorts/"], a[href*="youtube.com/shorts/"]',
  tileTitle: [
    '#video-title',
    '.yt-lockup-metadata-view-model__title',
    'h3 a[title]',
    '.shortsLockupViewModelHostMetadataTitle',
    'h3',
  ],
  tileChannelHandleLink: 'a[href^="/@"]',
  tileChannelIdLink: 'a[href^="/channel/UC"]',
  tileChannelName: [
    'ytd-channel-name #text',
    '#channel-name #text',
    '.yt-content-metadata-view-model__metadata-text',
  ],

  // ── Thumbnails (bookmark button) ─────────────────────────────────────────
  /** The thumbnail link of a video card, in every layout (home, search, sidebar, Shorts shelves). */
  thumbnailLink:
    'a#thumbnail, a.ytLockupViewModelContentImage, a.yt-lockup-view-model__content-image, a.shortsLockupViewModelHostEndpoint, a.reel-item-endpoint',
  /** YouTube's "Watch later" / "Add to queue" icons, shown top-right on hover. */
  thumbnailHoverOverlays: '#hover-overlays, yt-thumbnail-hover-overlay-toggle-actions-view-model',
  videoCard:
    'ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer, ytd-reel-item-renderer, yt-lockup-view-model, ytm-shorts-lockup-view-model',

  // ── Watch page ───────────────────────────────────────────────────────────
  related: 'ytd-watch-flexy #related',
  relatedItem: '#related ytd-compact-video-renderer, #related yt-lockup-view-model',
  watchTitle: ['ytd-watch-metadata h1 yt-formatted-string', 'ytd-watch-metadata h1', '#title h1'],
  watchOwner: 'ytd-watch-metadata #owner, ytd-video-owner-renderer',
  watchChannelName: ['ytd-watch-metadata ytd-channel-name a', 'ytd-video-owner-renderer ytd-channel-name a'],
  likeButtonPressed: [
    'ytd-watch-metadata like-button-view-model button[aria-pressed="true"]',
    'ytd-watch-metadata #segmented-like-button button[aria-pressed="true"]',
  ],

  // ── Player ───────────────────────────────────────────────────────────────
  /** Also matches the mini-player, which reuses #movie_player. */
  mainVideo: '#movie_player video.html5-main-video',
  autoplayToggleOn: '.ytp-autonav-toggle-button[aria-checked="true"], .ytp-autonav-toggle [aria-checked="true"]',
  autoplayCancel: '.ytp-autonav-endscreen-upnext-cancel-button',
  endScreenSuggestions: '.ytp-endscreen-content, .ytp-fullscreen-grid, .ytp-autonav-endscreen',
  inlinePreview: 'ytd-video-preview, #video-preview, #inline-preview-player',

  // ── Shorts ───────────────────────────────────────────────────────────────
  shortsVideo: [
    'ytd-reel-video-renderer[is-active] video',
    'ytd-shorts #shorts-player video',
    'ytd-shorts video',
  ],
  shortsScroller: 'ytd-shorts #shorts-inner-container',
  shortsNavButtons: 'ytd-shorts #navigation-button-up, ytd-shorts #navigation-button-down, ytd-shorts .navigation-container',
  /** A Short's own panels (comments, replies, description), which scroll by themselves. */
  shortsPanels: 'ytd-shorts ytd-engagement-panel-section-list-renderer, ytd-shorts #shorts-panel-container, ytd-shorts #engagement-panel',
  /** The "Shorts" entry in the full sidebar and in the narrow icon-only one. */
  sidebarShorts: [
    'ytd-guide-entry-renderer:has(a#endpoint[title="Shorts"])',
    'ytd-guide-entry-renderer:has(a[href^="/shorts"])',
    'ytd-mini-guide-entry-renderer[aria-label="Shorts"]',
    'ytd-mini-guide-entry-renderer:has(a[href^="/shorts"])',
  ].join(', '),
} as const;

export function queryFirst<T extends Element = HTMLElement>(
  selectors: string | readonly string[],
  root: ParentNode = document,
): T | null {
  for (const selector of typeof selectors === 'string' ? [selectors] : selectors) {
    const el = root.querySelector<T>(selector);
    if (el) return el;
  }
  return null;
}

export function textOf(selectors: readonly string[], root: ParentNode = document): string {
  for (const selector of selectors) {
    const el = root.querySelector<HTMLElement>(selector);
    const text = (el?.getAttribute('title') || el?.textContent || '').trim();
    if (text) return text.replace(/\s+/g, ' ');
  }
  return '';
}
