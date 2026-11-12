import { IG } from './selectors';

/** Classes toggled on <html>. */
export const IG_ROOT_CLASS = {
  reelsLocked: 'ff-ig-reels-locked',
  /** Today's posts are used up for now: anything Instagram loads after the feed is hidden too. */
  feedCapped: 'ff-ig-feed-capped',
  /** On a blocked page (Explore, Reels feed) while it's sent back home. */
  blocked: 'ff-ig-blocked',
} as const;

/** `data-ff-ig` values on elements we hide. */
export const IG_HIDDEN = {
  sponsored: 'sponsored',
  suggested: 'suggested',
  accounts: 'accounts',
  reels: 'reels',
  capped: 'capped',
  section: 'section',
  stories: 'stories',
} as const;

/** Marks the feed's post list, and the spot after it where the end card goes. */
export const IG_FEED_ATTR = 'data-ff-ig-feed';
export const IG_END_ATTR = 'data-ff-ig-end';

/** `data-ff-ig-pending`: a feed post that hasn't finished rendering; kept invisible until it's classified. */
const css = `
[data-ff-ig] { display: none !important; }
[data-ff-ig-pending] { opacity: 0 !important; pointer-events: none !important; }
html.${IG_ROOT_CLASS.reelsLocked} :is(${IG.reelNavButtons}) { display: none !important; }
html.${IG_ROOT_CLASS.feedCapped} [${IG_FEED_ATTR}] ~ :not([${IG_END_ATTR}]) { display: none !important; }
html.${IG_ROOT_CLASS.blocked} :is(${IG.main}) { visibility: hidden !important; }
`;

export function injectIgStyles(): () => void {
  const style = document.createElement('style');
  style.id = 'focus-filter-ig-styles';
  style.textContent = css;
  (document.head ?? document.documentElement).append(style);
  return () => style.remove();
}

export function setIgRootClass(name: string, on: boolean): void {
  document.documentElement.classList.toggle(name, on);
}
