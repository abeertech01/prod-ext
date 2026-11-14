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
  /** The Stories box inside the feed, once today's stories are used up. */
  stories: 'stories',
  /** A Reels row that scrolls sideways. */
  reels: 'reels',
  /** A distracting menu item or panel. */
  section: 'section',
  /** A card in the home Stories row that can't open today. */
  story: 'story',
} as const;

/**
 * A home feed post behind a cover, until the user clicks "Show post". The attribute's
 * value is the button's label; `FB_COVER_COUNT_ATTR` holds the line under it.
 */
export const FB_COVER_ATTR = 'data-ff-fb-covered';
export const FB_COVER_COUNT_ATTR = 'data-ff-fb-cover-count';
/** Set on a cover once today's posts are used up: the button no longer opens anything. */
export const FB_COVER_DONE_ATTR = 'data-ff-fb-cover-done';

/** The "Show post" button in the middle of a cover. */
export const COVER = { height: 460, gap: 12, buttonWidth: 120, buttonHeight: 36 } as const;

/**
 * `data-ff-fb-pending`: a feed item that hasn't finished loading; kept invisible until it's checked.
 * Covered posts keep their content in the page (invisible), so it can still be checked underneath.
 * Facebook's own colour variables keep the cover in its light or dark theme.
 */
const css = `
[data-ff-fb] { display: none !important; }
[data-ff-fb-pending] { opacity: 0 !important; pointer-events: none !important; }
[${FB_COVER_ATTR}] { position: relative !important; height: ${COVER.height}px !important; overflow: hidden !important; }
[${FB_COVER_ATTR}] > * { opacity: 0 !important; pointer-events: none !important; }
[${FB_COVER_ATTR}]::before {
  content: attr(${FB_COVER_COUNT_ATTR}); position: absolute; inset: 0 0 ${COVER.gap}px 0; border-radius: 8px; box-sizing: border-box;
  display: flex; align-items: center; justify-content: center; padding-top: ${COVER.buttonHeight + 44}px;
  background: var(--card-background, #fff); box-shadow: 0 1px 2px var(--shadow-2, rgba(0, 0, 0, 0.2));
  color: var(--secondary-text, #65676b); font: 400 13px/1.4 system-ui, -apple-system, 'Segoe UI', sans-serif;
}
[${FB_COVER_ATTR}]::after {
  content: attr(${FB_COVER_ATTR}); position: absolute; left: 50%; top: ${(COVER.height - COVER.gap) / 2}px; transform: translate(-50%, -50%);
  min-width: ${COVER.buttonWidth}px; padding: 0 16px; box-sizing: border-box; white-space: nowrap;
  height: ${COVER.buttonHeight}px; line-height: ${COVER.buttonHeight}px; text-align: center; border-radius: 6px;
  background: var(--secondary-button-background, #e4e6eb); color: var(--primary-text, #050505);
  font: 600 15px/${COVER.buttonHeight}px system-ui, -apple-system, 'Segoe UI', sans-serif; cursor: pointer;
}
[${FB_COVER_ATTR}][${FB_COVER_DONE_ATTR}]::after { cursor: default; opacity: 0.6; }
html.${FB_ROOT_CLASS.reelsLocked} :is(${FB.reelNavButtons}) { display: none !important; }
`;

export function injectFbStyles(): () => void {
  const style = document.createElement('style');
  style.id = 'focus-filter-fb-styles';
  style.textContent = css;
  (document.head ?? document.documentElement).append(style);
  return () => style.remove();
}
