/**
 * The home feed's loading skeleton. Facebook draws its first posts before the
 * extension has loaded its settings and covered them, so while the page loads,
 * the middle column is hidden behind grey shapes: the "What's on your mind"
 * box, the Stories row and a couple of posts. It's styling only, so it needs
 * nothing from storage and can go up the moment the page starts loading.
 */

const ROOT_CLASS = 'ff-fb-loading';
const SKELETON_ID = 'ff-fb-skeleton';
const STYLE_ID = 'ff-fb-skeleton-style';
/** If the extension never finishes starting, the page still shows after this long. */
const GIVE_UP_MS = 6_000;
/** Facebook's feed column width. */
const FEED_WIDTH = 680;
/** Same height as a post's cover, so nothing jumps when the covers replace the skeleton. */
const POST_HEIGHT = 448;

const css = `
html.${ROOT_CLASS} [role="main"] { opacity: 0 !important; pointer-events: none !important; }
#${SKELETON_ID} {
  --ff-card: var(--card-background, #fff);
  --ff-shape: var(--secondary-button-background, #e4e6eb);
  position: absolute; z-index: 2; display: flex; flex-direction: column; gap: 16px;
  pointer-events: none; font-size: 0;
}
html.__fb-dark-mode #${SKELETON_ID} {
  --ff-card: var(--card-background, #242526);
  --ff-shape: var(--secondary-button-background, #3a3b3c);
}
#${SKELETON_ID} .ff-card { background: var(--ff-card); border-radius: 8px; box-shadow: 0 1px 2px var(--shadow-2, rgba(0, 0, 0, 0.2)); padding: 12px 16px; }
#${SKELETON_ID} .ff-shape { background: var(--ff-shape); border-radius: 6px; animation: ff-fb-pulse 1.4s ease-in-out infinite; }
#${SKELETON_ID} .ff-round { border-radius: 50%; flex: none; }
#${SKELETON_ID} .ff-row { display: flex; align-items: center; gap: 8px; }
#${SKELETON_ID} .ff-col { display: flex; flex-direction: column; gap: 8px; }
#${SKELETON_ID} .ff-stories { display: flex; gap: 8px; }
#${SKELETON_ID} .ff-story { flex: 1; height: 200px; border-radius: 10px; }
@keyframes ff-fb-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
`;

const shape = (style: string, extra = '') => `<div class="ff-shape ${extra}" style="${style}"></div>`;

const composer = `<div class="ff-card"><div class="ff-row">${shape('width:40px;height:40px', 'ff-round')}${shape('flex:1;height:40px;border-radius:20px')}</div></div>`;

const stories = `<div class="ff-stories">${shape('', 'ff-story').repeat(5)}</div>`;

const post = `<div class="ff-card" style="height:${POST_HEIGHT}px;box-sizing:border-box">
  <div class="ff-row">${shape('width:40px;height:40px', 'ff-round')}<div class="ff-col">${shape('width:140px;height:12px')}${shape('width:90px;height:10px')}</div></div>
  <div class="ff-col" style="margin:16px 0">${shape('width:92%;height:12px')}${shape('width:70%;height:12px')}</div>
  ${shape(`height:${POST_HEIGHT - 170}px;border-radius:8px`)}
  <div class="ff-row" style="margin-top:14px">${shape('width:70px;height:12px')}${shape('width:70px;height:12px')}${shape('width:70px;height:12px')}</div>
</div>`;

function isHome(): boolean {
  const path = location.pathname.replace(/\/+$/, '') || '/';
  return path === '/' || path === '/home.php';
}

/** Place the skeleton over the feed column, which sits in the middle of the main area. */
function place(skeleton: HTMLElement): void {
  const main = document.querySelector('[role="main"]');
  if (!main) return;
  const r = main.getBoundingClientRect();
  const width = Math.min(FEED_WIDTH, r.width - 32);
  if (width <= 0) return;
  skeleton.style.width = `${width}px`;
  skeleton.style.left = `${r.left + scrollX + (r.width - width) / 2}px`;
  skeleton.style.top = `${r.top + scrollY + 16}px`;
  skeleton.hidden = false;
}

/** Runs as the page starts loading, before Facebook draws anything. */
export function startSkeleton(): void {
  if (!isHome() || document.getElementById(SKELETON_ID)) return;
  const root = document.documentElement;
  root.classList.add(ROOT_CLASS);

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = css;
  root.append(style);

  const skeleton = document.createElement('div');
  skeleton.id = SKELETON_ID;
  skeleton.hidden = true;
  skeleton.innerHTML = composer + stories + post + post;
  root.append(skeleton);

  // Facebook builds the page bit by bit; keep the skeleton over the feed column as it does.
  let frame: number | null = null;
  const observer = new MutationObserver(() => {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      if (!root.classList.contains(ROOT_CLASS)) return observer.disconnect();
      place(skeleton);
    });
  });
  observer.observe(root, { childList: true, subtree: true });
  addEventListener('resize', () => place(skeleton));
  setTimeout(endSkeleton, GIVE_UP_MS);
}

/** The covers are in place: show the page. Safe to call when there's no skeleton. */
export function endSkeleton(): void {
  document.documentElement.classList.remove(ROOT_CLASS);
  document.getElementById(SKELETON_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();
}
