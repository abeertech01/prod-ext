import { FB } from './selectors';

/** Classes toggled on <html>. */
export const FB_ROOT_CLASS = {
  /** On a Reel with scrolling to the next one blocked: the next/previous buttons are hidden. */
  reelsLocked: 'ff-fb-reels-locked',
} as const;

/** `data-ff-fb` values on elements we hide. */
export const FB_HIDDEN = {
  sponsored: 'sponsored',
  suggested: 'suggested',
  pymk: 'pymk',
  groups: 'groups',
  /** A Reels row that scrolls sideways. */
  reels: 'reels',
  /** A distracting menu item or panel. */
  section: 'section',
  /** A card in the home Stories row that can't open today. */
  story: 'story',
} as const;

/** `data-ff-fb-pending`: a feed post that hasn't finished loading; kept invisible until it's checked. */
const css = `
[data-ff-fb] { display: none !important; }
[data-ff-fb-pending] { opacity: 0 !important; pointer-events: none !important; }
html.${FB_ROOT_CLASS.reelsLocked} :is(${FB.reelNavButtons}) { display: none !important; }
`;

export function injectFbStyles(): () => void {
  const style = document.createElement('style');
  style.id = 'focus-filter-fb-styles';
  style.textContent = css;
  (document.head ?? document.documentElement).append(style);
  return () => style.remove();
}
