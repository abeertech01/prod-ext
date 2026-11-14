import type { ContentScriptContext } from '#imports';
import { shuffle } from '@/core/bookmarks/videos';
import { sendMessage } from '@/core/messaging/protocol';
import { updateSettings } from '@/core/settings/storage';
import { overlay, overlayActions, type HomeBookmarksState } from '@/ui/content/state';
import { live, onContextChange } from './context';
import type { PageInfo } from './page';
import { ROOT_CLASS, setRootClass } from './pageStyles';

/** Bookmarked videos above the suggestions in "Bookmarks + suggestions". */
export const MIXED_COUNT = 5;
/** Videos per batch in "Only bookmarks": enough to fill the home page. */
export const BOOKMARK_BATCH = 24;

const firstBatch = (mode: HomeBookmarksState['mode']) => (mode === 'only' ? BOOKMARK_BATCH : MIXED_COUNT);

/**
 * Bookmarked videos at the top of the home page. Each visit to the home page
 * shuffles every video in the chosen bookmark folders and shows the first 5
 * above the usual suggestions, or, in "Only bookmarks", batches of 24 in
 * place of the suggestions, with a "Load more" button.
 */
export function startHomeBookmarks(ctx: ContentScriptContext, getPage: () => PageInfo) {
  let request = 0;
  let folderKey = '';

  const set = (patch: Partial<HomeBookmarksState>) => overlay.set({ homeBookmarks: { ...overlay.get().homeBookmarks, ...patch } });

  /**
   * Suggestions are hidden in "Only bookmarks", unless there's nothing to show instead:
   * no bookmark access, or no YouTube videos in the folders.
   */
  function applyMode(): void {
    const { mode, status, videos } = overlay.get().homeBookmarks;
    const nothing = status === 'unavailable' || (status === 'ready' && videos.length === 0);
    setRootClass(ROOT_CLASS.bookmarksOnly, mode === 'only' && !nothing);
  }

  /** A new visit: read the folders again and pick a new random set. */
  async function refresh(): Promise<void> {
    const id = ++request;
    const mode = live.settings.bookmarks.homeMode;
    set({ status: 'loading', mode });
    applyMode();
    let videos: HomeBookmarksState['videos'] | null;
    try {
      videos = await sendMessage('bookmarkedVideos', undefined);
    } catch {
      videos = [];
    }
    if (id !== request || ctx.isInvalid) return;
    if (videos === null) set({ status: 'unavailable', videos: [], shown: 0 });
    else set({ status: 'ready', videos: shuffle(videos), shown: firstBatch(overlay.get().homeBookmarks.mode) });
    applyMode();
  }

  overlayActions.setHomeMode = (mode) => {
    set({ mode, shown: firstBatch(mode) });
    applyMode();
    window.scrollTo({ top: 0 });
    void updateSettings((s) => ({ ...s, bookmarks: { ...s.bookmarks, homeMode: mode } }));
  };

  overlayActions.loadMoreBookmarks = () => {
    const { shown, videos } = overlay.get().homeBookmarks;
    set({ shown: Math.min(videos.length, shown + BOOKMARK_BATCH) });
  };

  // The mode changed in another tab, or the chosen folders changed in settings.
  onContextChange(() => {
    const { homeMode, folderIds } = live.settings.bookmarks;
    const key = folderIds.join(',');
    if (key !== folderKey) {
      folderKey = key;
      if (getPage().type === 'home') void refresh();
      return;
    }
    if (homeMode !== overlay.get().homeBookmarks.mode) {
      set({ mode: homeMode, shown: firstBatch(homeMode) });
      applyMode();
    }
  });
  folderKey = live.settings.bookmarks.folderIds.join(',');

  return {
    onNavigate(next: PageInfo, prev: PageInfo | null) {
      if (next.type === 'home' && prev?.type !== 'home') void refresh();
    },
  };
}
