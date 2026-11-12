import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { overlay, overlayActions } from './state';

const MENU_WIDTH = 260;
const GAP = 8;
/** Below this much room above the button, the menu opens below it instead. */
const MIN_ROOM_ABOVE = 220;

function Check() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-teal-600" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true">
      <path fill="currentColor" d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.6l2 2h8.4A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-11Z" />
    </svg>
  );
}

/** The folder picker that opens above a thumbnail's bookmark button. */
export function BookmarkMenu() {
  const menu = useStore(overlay, (s) => s.bookmarkMenu);
  const first = useRef<HTMLButtonElement>(null);
  const ready = !!menu?.folders?.length;
  useEffect(() => {
    if (ready) first.current?.focus();
  }, [ready]);
  if (!menu) return null;

  const { anchor, folders, savedTo, error } = menu;
  const center = (anchor.left + anchor.right) / 2;
  const left = Math.min(Math.max(GAP, center - MENU_WIDTH / 2), window.innerWidth - MENU_WIDTH - GAP);
  const above = anchor.top >= MIN_ROOM_ABOVE;
  const position = above ? { bottom: window.innerHeight - anchor.top + GAP } : { top: anchor.bottom + GAP };

  let body;
  if (savedTo) {
    body = (
      <div className="flex items-center gap-2 px-3 py-3 text-[14px] font-medium">
        <Check /> Saved to {savedTo}
      </div>
    );
  } else if (folders === undefined) {
    body = <div className="px-3 py-3 text-[13px] text-zinc-500">Loading folders…</div>;
  } else if (folders === null) {
    body = <div className="px-3 py-3 text-[13px] text-zinc-500">This browser doesn't let extensions use bookmarks.</div>;
  } else if (folders.length === 0) {
    body = (
      <div className="px-3 py-3 text-[13px] leading-5 text-zinc-600 dark:text-zinc-300">
        {error ?? 'No bookmark folders chosen yet. Pick the folders you save YouTube videos to in settings.'}
        {!error && (
          <button type="button" onClick={() => overlayActions.openBookmarkSettings()} className="mt-2 block font-semibold text-teal-600 hover:underline">
            Choose folders
          </button>
        )}
      </div>
    );
  } else {
    body = (
      <>
        <ul className="max-h-[260px] overflow-y-auto py-1" role="menu">
          {folders.map((f, i) => (
            <li key={f.id} role="none">
              <button
                ref={i === 0 ? first : undefined}
                type="button"
                role="menuitemcheckbox"
                aria-checked={f.saved}
                onClick={() => overlayActions.toggleBookmark(f)}
                title={f.saved ? 'Saved here. Click to remove.' : undefined}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-zinc-100 focus:bg-zinc-100 focus:outline-none dark:hover:bg-zinc-800 dark:focus:bg-zinc-800"
              >
                <FolderIcon />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px]">{f.title}</span>
                  {f.parentPath && <span className="block truncate text-[11px] text-zinc-500">{f.parentPath}</span>}
                </span>
                {f.saved && <Check />}
              </button>
            </li>
          ))}
        </ul>
        {error && <p className="px-3 pb-2 text-[12px] text-rose-600">{error}</p>}
        <div className="border-t border-zinc-100 px-3 py-2 dark:border-zinc-800">
          <button type="button" onClick={() => overlayActions.openBookmarkSettings()} className="text-[12px] font-medium text-zinc-500 hover:text-teal-600">
            Manage folders
          </button>
        </div>
      </>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Save to a bookmark folder"
      onKeyDown={(e) => e.key === 'Escape' && overlayActions.closeBookmarkMenu()}
      className="pointer-events-auto fixed overflow-hidden rounded-xl bg-white text-zinc-900 shadow-2xl ring-1 ring-black/10 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-white/10"
      style={{ left, width: MENU_WIDTH, ...position }}
    >
      {!savedTo && <div className="px-3 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Save to</div>}
      {body}
    </div>
  );
}
