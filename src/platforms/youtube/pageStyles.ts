import { HB } from '@/ui/content/HomeBookmarks';
import { SEL } from './selectors';

/** Classes toggled on <html> to switch page-level behaviour on and off. */
export const ROOT_CLASS = {
  hideSidebar: 'ff-hide-sidebar',
  noAutoplay: 'ff-no-autoplay',
  homeCapped: 'ff-home-capped',
  revealNoMatch: 'ff-reveal-nomatch',
  revealDistraction: 'ff-reveal-distraction',
  shortsLocked: 'ff-shorts-locked',
  /** The home page shows bookmarked videos only: YouTube's suggestions are hidden. */
  bookmarksOnly: 'ff-bookmarks-only',
} as const;

/** Class of the bookmark button added to every thumbnail. */
export const BOOKMARK_BUTTON = 'ff-bm-btn';

/** `data-ff-state` values on feed items. */
export const ITEM_STATE = {
  pending: 'pending',
  shown: 'shown',
  noMatch: 'hidden-nomatch',
  distraction: 'hidden-distraction',
} as const;

/** Prefix every selector in a comma list with `html.<cls>`. */
function when(cls: string, selectors: string): string {
  return selectors
    .split(',')
    .map((s) => `html.${cls} ${s.trim()}`)
    .join(',\n');
}

const css = `
[data-ff-state="${ITEM_STATE.pending}"],
html:not(.${ROOT_CLASS.revealNoMatch}) [data-ff-state="${ITEM_STATE.noMatch}"],
html:not(.${ROOT_CLASS.revealDistraction}) [data-ff-state="${ITEM_STATE.distraction}"],
[data-ff-capped],
[data-ff-empty] { display: none !important; }

${when(ROOT_CLASS.revealNoMatch, `[data-ff-state="${ITEM_STATE.noMatch}"]`)},
${when(ROOT_CLASS.revealDistraction, `[data-ff-state="${ITEM_STATE.distraction}"]`)} { opacity: .55; }

${when(ROOT_CLASS.homeCapped, SEL.homeContinuation)} { display: none !important; }

${when(ROOT_CLASS.hideSidebar, `${SEL.related}, ${SEL.endScreenSuggestions}`)} { display: none !important; }

${when(ROOT_CLASS.noAutoplay, SEL.inlinePreview)} { display: none !important; }

/* Bookmark button: shown while the thumbnail is hovered, or while its menu is open. */
.${BOOKMARK_BUTTON} {
  position: absolute; top: 6px; z-index: 10;
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; padding: 0; margin: 0; border: 0; border-radius: 999px;
  background: rgba(15, 15, 15, .8); color: #fff; cursor: pointer;
  opacity: 0; pointer-events: none; transition: opacity .12s ease;
}
.${BOOKMARK_BUTTON}[data-spot="tl"] { left: 6px; }
.${BOOKMARK_BUTTON}[data-spot="tr"] { right: 6px; }
.${BOOKMARK_BUTTON}[data-spot="tc"] { left: 50%; transform: translateX(-50%); }
[data-ff-bm]:hover > .${BOOKMARK_BUTTON},
.${BOOKMARK_BUTTON}:focus-visible,
.${BOOKMARK_BUTTON}[aria-expanded="true"] { opacity: 1; pointer-events: auto; }
.${BOOKMARK_BUTTON}:hover { background: #000; }
.${BOOKMARK_BUTTON} svg { width: 18px; height: 18px; }

${when(ROOT_CLASS.shortsLocked, SEL.shortsScroller)} { overflow: hidden !important; scroll-snap-type: none !important; }
${when(ROOT_CLASS.shortsLocked, SEL.shortsNavButtons)} { display: none !important; }

/* "Only bookmarks": none of YouTube's suggestions, and nothing makes it load more. */
${when(ROOT_CLASS.bookmarksOnly, `${SEL.homeGridContents}, ${SEL.homeContinuation}, focus-filter-home-banner, focus-filter-home-end`)} { display: none !important; }

/*
 * Bookmarked videos at the top of the home feed, in YouTube's own look. They sit in the home
 * grid, so its variables (videos per row, spacing) size the cards like YouTube's.
 * Light colours by default; YouTube marks dark mode with html[dark].
 */
.${HB.root} {
  --ff-hb-text: #0f0f0f; --ff-hb-muted: #606060; --ff-hb-chip: rgba(0, 0, 0, 0.05); --ff-hb-chip-hover: rgba(0, 0, 0, 0.1); --ff-hb-inverse: #fff;
  align-self: stretch; box-sizing: border-box; margin: 24px 16px 8px; font-family: Roboto, Arial, sans-serif;
}
html[dark] .${HB.root} { --ff-hb-text: #f1f1f1; --ff-hb-muted: #aaa; --ff-hb-chip: rgba(255, 255, 255, 0.1); --ff-hb-chip-hover: rgba(255, 255, 255, 0.2); --ff-hb-inverse: #0f0f0f; }
.${HB.header} {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px;
  margin: 0 calc(var(--ytd-rich-grid-item-margin, 16px) / 2) 16px;
}
.${HB.heading} { margin: 0; font-size: 20px; line-height: 28px; font-weight: 700; color: var(--ff-hb-text); }
.${HB.modes} { display: flex; gap: 12px; }
.${HB.mode} {
  height: 32px; padding: 0 12px; border: 0; border-radius: 8px; cursor: pointer;
  font: 500 14px/32px Roboto, Arial, sans-serif; background: var(--ff-hb-chip); color: var(--ff-hb-text);
}
.${HB.mode}:hover { background: var(--ff-hb-chip-hover); }
.${HB.mode}[aria-checked="true"] { background: var(--ff-hb-text); color: var(--ff-hb-inverse); cursor: default; }
.${HB.grid} { display: flex; flex-wrap: wrap; }
.${HB.item} {
  box-sizing: border-box; min-width: 0;
  width: calc(100% / var(--ytd-rich-grid-items-per-row, 4) - var(--ytd-rich-grid-item-margin, 16px));
  margin: 0 calc(var(--ytd-rich-grid-item-margin, 16px) / 2) var(--ytd-rich-grid-row-margin, 40px);
}
.${HB.thumb} { display: block; position: relative; aspect-ratio: 16 / 9; overflow: hidden; border-radius: 12px; background: var(--ff-hb-chip); }
.${HB.thumb} img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.${HB.title} {
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; margin-top: 12px;
  font-size: 16px; line-height: 22px; font-weight: 500; color: var(--ff-hb-text); text-decoration: none; word-break: break-word;
}
.${HB.line} { margin-top: 4px; font-size: 14px; line-height: 20px; color: var(--ff-hb-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.${HB.note} { margin: 0 calc(var(--ytd-rich-grid-item-margin, 16px) / 2) 16px; font-size: 14px; line-height: 20px; color: var(--ff-hb-muted); }
.${HB.footer} { display: flex; justify-content: center; margin: 8px 0 32px; }
.${HB.footer} .${HB.note} { margin: 0; }
.${HB.more} {
  height: 36px; padding: 0 16px; border: 0; border-radius: 18px; cursor: pointer;
  font: 500 14px/36px Roboto, Arial, sans-serif; background: var(--ff-hb-chip); color: var(--ff-hb-text);
}
.${HB.more}:hover { background: var(--ff-hb-chip-hover); }

/* Shorts can't be browsed from the sidebar. */
${SEL.sidebarShorts} { display: none !important; }
`;

export function injectPageStyles(): () => void {
  const style = document.createElement('style');
  style.id = 'focus-filter-page-styles';
  style.textContent = css;
  (document.head ?? document.documentElement).append(style);
  return () => style.remove();
}

export function setRootClass(name: string, on: boolean): void {
  document.documentElement.classList.toggle(name, on);
}
