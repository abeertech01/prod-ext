/**
 * Every Instagram selector and label lives here. Instagram's class names are
 * generated and change constantly, so matching relies on tags, roles, links
 * and the visible English labels. When something stops working, fix this file first.
 */
export const IG = {
  main: 'main, [role="main"]',
  /** Each feed post (and a single post's page) is an <article>. */
  article: 'article',
  dialog: '[role="dialog"]',
  /** Items in the Stories row at the top of the home feed. */
  storyItems:
    'a[href^="/stories/"], [aria-label^="Story by" i], [aria-label*="\'s story" i], [aria-label*="’s story" i], [aria-label*="unseen story" i]',
  reelNavButtons:
    '[aria-label="Navigate to next Reel" i], [aria-label="Navigate to previous Reel" i], [aria-label="Next reel" i], [aria-label="Previous reel" i]',
  buttons: '[role="button"], button',
  /** Instagram uses plain spans for most headings. */
  labels: 'h2, h3, h4, [role="heading"], span',
  /** Links to a post or Reel; their ID identifies the post. */
  permalinks: 'a[href*="/p/"], a[href*="/reel/"]',
} as const;

/** Menu links to hide (paths, without the trailing slash). */
export const BLOCKED_LINKS = ['/explore', '/reels'];

/** Visible labels, lower-case, with curly apostrophes made straight. */
export const LABEL = {
  /** Header line of an ad. */
  sponsored: ['sponsored', 'ad'],
  /** Header line of a post from an account the user doesn't follow. */
  suggestedPost: ['suggested for you', 'suggested post', 'suggested posts', 'because you liked', 'based on your activity'],
  /** A "Follow" button in a post's header: the user doesn't follow that account. */
  followButtons: ['follow'],
  /** Rows of accounts to follow (feed and sidebar). */
  suggestedAccounts: ['suggested for you', 'suggestions for you', 'suggested accounts'],
  reelsSections: ['reels', 'suggested reels', 'reels for you', 'trending reels'],
  /** Marker at the end of new posts; everything after it is suggested. */
  caughtUp: ["you're all caught up", "you've seen all new posts", 'suggested posts'],
};

export const normalize = (text: string) => text.trim().toLowerCase().replace(/[’‘]/g, "'");
