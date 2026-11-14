import { SEL } from './selectors';

/** Classes toggled on <html> to switch page-level behaviour on and off. */
export const ROOT_CLASS = {
  hideSidebar: 'ff-hide-sidebar',
  noAutoplay: 'ff-no-autoplay',
  homeCapped: 'ff-home-capped',
  revealNoMatch: 'ff-reveal-nomatch',
  revealDistraction: 'ff-reveal-distraction',
  shortsLocked: 'ff-shorts-locked',
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
