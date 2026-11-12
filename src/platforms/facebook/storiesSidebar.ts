import type { ContentScriptContext } from '#imports';
import type { CoverState } from '@/ui/social/state';
import type { SocialPage } from '../social/page';
import { fbLive, fbSite } from './context';
import { LABEL } from './selectors';
import { fbUi } from './ui';

/** The sidebar is a narrow column; anything wider is the whole page. */
const MAX_SIDEBAR_SHARE = 0.45;
const FALLBACK_BACKGROUND = '#242526';

/** "Your story" / "All stories" headings: elements whose own text is the label. */
function sidebarLabels(): HTMLElement[] {
  const labels: HTMLElement[] = [];
  for (const el of document.querySelectorAll<HTMLElement>('h1, h2, h3, h4, [role="heading"], span')) {
    if (el.childElementCount > 0) continue;
    if (!LABEL.storiesSidebar.includes((el.textContent ?? '').trim().toLowerCase())) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.left < innerWidth * MAX_SIDEBAR_SHARE) labels.push(el);
  }
  return labels;
}

/** The sidebar column: the outermost narrow box around the heading. */
function sidebarColumn(label: HTMLElement): HTMLElement {
  let column = label;
  for (let el = label.parentElement; el && el !== document.body; el = el.parentElement) {
    if (el.getBoundingClientRect().width > innerWidth * MAX_SIDEBAR_SHARE) break;
    column = el;
  }
  return column;
}

function backgroundOf(el: HTMLElement): string {
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    const bg = getComputedStyle(node).backgroundColor;
    if (bg && bg !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(bg)) return bg;
  }
  return FALLBACK_BACKGROUND;
}

function measure(): CoverState | null {
  const labels = sidebarLabels();
  if (!labels.length) return null;
  const top = Math.max(0, Math.min(...labels.map((l) => l.getBoundingClientRect().top)) - 8);
  const column = sidebarColumn(labels[0]!).getBoundingClientRect();
  if (column.width < 120) return null;
  return { top, left: column.left, width: column.width, height: innerHeight - top, background: backgroundOf(labels[0]!) };
}

const same = (a: CoverState | null, b: CoverState | null) =>
  a === b || (!!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height && a.background === b.background);

/**
 * On the stories page, the list of people on the left ("Your story", "All
 * stories") is covered, so the arrows are the only way to other people's stories.
 */
export function startStoriesSidebarCover(ctx: ContentScriptContext, getPage: () => SocialPage) {
  const { store } = fbUi;
  let scheduled: number | null = null;

  function update(): void {
    // With no limit, stories work as Facebook normally does.
    const active = getPage().type === 'stories' && fbLive.settings.facebook.stories.mode !== 'unlimited';
    const next = active ? measure() : null;
    if (!same(store.get().cover, next)) store.set({ cover: next });
  }

  const schedule = () => {
    if (scheduled !== null) return;
    scheduled = ctx.setTimeout(() => {
      scheduled = null;
      update();
    }, 100);
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  ctx.addEventListener(window, 'resize', schedule);
  // The list can scroll or reflow without the page changing.
  ctx.setInterval(update, 1000);
  fbSite.onChange(schedule);
  ctx.onInvalidated(() => observer.disconnect());
  return { onNavigate: update };
}
