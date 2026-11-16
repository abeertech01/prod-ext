/**
 * "Nothing" on the home page: the home feed is turned off. No videos, no Shorts
 * shelf and no topic chips, just one quiet line in the middle of the page.
 *
 * It's styling only, keyed on a class on <html>, so it can go up from the
 * document_start script before YouTube draws anything. This module imports
 * nothing heavy for that reason.
 */

export const HOME_OFF_CLASS = 'ff-home-off';
const STYLE_ID = 'ff-yt-home-off-style';
/**
 * Set in YouTube's own storage while the home page is off, so the next page load
 * can hide the feed synchronously, before the extension's settings are read.
 */
const FLAG_KEY = 'ff-yt-home-off';

export const HOME_OFF_MESSAGE = 'Your home feed is off. Search for what you came for.';

const HOME = 'ytd-browse[page-subtype="home"]';

const css = `
html.${HOME_OFF_CLASS} ${HOME} ytd-rich-grid-renderer,
html.${HOME_OFF_CLASS} ${HOME} ytd-feed-filter-chip-bar-renderer,
html.${HOME_OFF_CLASS} ${HOME} #chips-wrapper { display: none !important; }
html.${HOME_OFF_CLASS} ${HOME}:not([hidden])::before {
  content: "${HOME_OFF_MESSAGE}";
  display: block; flex: 1 1 100%; width: 100%; box-sizing: border-box;
  padding: calc(40vh - 56px) 16px 0; text-align: center;
  font: 400 15px/22px Roboto, Arial, sans-serif;
  color: var(--yt-spec-text-secondary, #606060);
}
`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = css;
  (document.head ?? document.documentElement).append(style);
}

/** Turn the empty home page on or off, and remember it for the next page load. */
export function setHomeOff(off: boolean): void {
  if (off) ensureStyle();
  document.documentElement.classList.toggle(HOME_OFF_CLASS, off);
  try {
    if (off) localStorage.setItem(FLAG_KEY, '1');
    else localStorage.removeItem(FLAG_KEY);
  } catch {
    // Storage blocked: the settings still switch it on once they're read.
  }
}

/**
 * Runs as the page starts loading: hide the feed right away if it was off last time.
 * `readOff` then reads the settings, in case they changed while no YouTube tab was open.
 */
export function startHomeOffEarly(readOff: () => Promise<boolean>): void {
  let flagged = false;
  try {
    flagged = localStorage.getItem(FLAG_KEY) === '1';
  } catch {
    // Storage blocked.
  }
  if (flagged) {
    ensureStyle();
    document.documentElement.classList.add(HOME_OFF_CLASS);
  }
  void readOff().then(setHomeOff, () => {});
}
