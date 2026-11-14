/**
 * Every Facebook selector and label lives here. Facebook's class names are generated and
 * change constantly, so matching relies on roles, links and the visible
 * English labels. When something stops working, fix this file first.
 */

export const FB = {
  /** Older layout and some other feeds. The home feed is found by its heading (`LABEL.feedHeadings`). */
  feed: 'div[role="feed"]',
  main: '[role="main"]',
  rightRail: '[role="complementary"]',
  /** Top bar and left menu. */
  menus: '[role="navigation"], [role="banner"]',
  headings: 'h2, h3, h4, [role="heading"]',
  buttons: '[role="button"], button',
  /** Next/previous buttons beside an open Reel. */
  reelNavButtons:
    '[aria-label="Next card" i], [aria-label="Previous card" i], [aria-label="Next reel" i], [aria-label="Previous reel" i]',
  sponsoredMarkers:
    '[aria-label="Sponsored" i], [aria-label="Ad" i], a[href*="/ads/about"], a[href^="/ads/"], a[href*="facebook.com/ads/"]',
} as const;

/** Menu links to hide (paths). */
export const DISTRACTING_PATHS = ['/watch', '/marketplace', '/gaming'];

/** Visible labels, lower-case. */
export const LABEL = {
  /** Headings over the list of people on the stories page. */
  storiesSidebar: ['your story', 'all stories'],
  /** Hidden heading right before the home feed's list of posts. */
  feedHeadings: ['feed posts'],
  sponsored: 'sponsored',
  /** Newer label under an ad's name: "Ad · 🌐" or "Ad · AI content · 🌐". */
  ad: 'ad',
  /** Header line of a suggested post. */
  suggestedPost: ['suggested for you', 'suggested post'],
  /**
   * Buttons in a post's header that mean the user doesn't follow its author yet:
   * a group or page ("Join", "Follow") or a person ("Follow", "Add friend").
   */
  followButtons: ['join', 'join group', 'follow', 'add friend'],
  peopleYouMayKnow: ['people you may know'],
  /** Group suggestion sections; shown unless turned off in settings. */
  groupSuggestions: ['your group suggestions', 'suggested groups', 'groups you might like'],
  /** Feed sections that are all suggestions. */
  suggestedSections: [
    'suggested pages',
    'pages you might like',
    'suggested for you',
    'suggested videos',
    'videos for you',
  ],
  /** Heading of the Stories box Facebook puts inside the feed. */
  storiesSection: ['stories'],
  /** Headings of Reels rows that scroll sideways. */
  reelsSections: ['reels', 'reels and short videos', 'reels for you'],
  /** Trending and suggested-video panels. */
  panels: ['trending', 'trending now', 'up next', 'more videos', 'suggested videos', 'videos for you'],
};
