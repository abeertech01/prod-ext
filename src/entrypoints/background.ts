import { browser } from 'wxt/browser';
import { defineBackground } from '#imports';
import { listFolders, pickFolders } from '@/core/bookmarks/folders';
import { collectVideos } from '@/core/bookmarks/videos';
import { onMessage, sendMessage, type BookmarkFoldersResult, type SyncResult } from '@/core/messaging/protocol';
import { getSettings } from '@/core/settings/storage';
import { videoIdFromUrl } from '@/platforms/youtube/page';

/** Storage keys left behind by the removed daily time limit. */
const OBSOLETE_KEYS = ['usage', 'quoteCache'];

export default defineBackground(() => {
  // ── Subscriptions (needs a signed-in YouTube tab) ──────────────────────
  onMessage('requestSubscriptionSync', async (): Promise<SyncResult> => {
    const tabs = await browser.tabs.query({ url: '*://www.youtube.com/*' });
    for (const tab of tabs) {
      if (tab.id === undefined) continue;
      try {
        return await sendMessage('syncSubscriptions', undefined, tab.id);
      } catch {
        // Tab without our content script (e.g. opened before install); try the next.
      }
    }
    return { ok: false, error: 'Open youtube.com in a tab (signed in), then try again.' };
  });

  // ── Bookmarks (content scripts can't reach the bookmarks API) ──────────
  /** Links in the folder that point at this video, whatever their extra URL parameters. */
  async function linksTo(folderId: string, videoId: string) {
    const children = await browser.bookmarks.getChildren(folderId);
    return children.filter((c) => c.url && videoIdFromUrl(c.url) === videoId);
  }

  async function folderStates(videoId: string): Promise<BookmarkFoldersResult> {
    if (!browser.bookmarks) return null;
    const { bookmarks } = await getSettings();
    const chosen = pickFolders(listFolders(await browser.bookmarks.getTree()), bookmarks.folderIds);
    return Promise.all(chosen.map(async (f) => ({ ...f, saved: (await linksTo(f.id, videoId)).length > 0 })));
  }

  onMessage('bookmarkFolders', ({ data }) => folderStates(data.videoId));

  // Every video in the chosen folders, for the top of the YouTube home page.
  onMessage('bookmarkedVideos', async () => {
    if (!browser.bookmarks) return null;
    const { bookmarks } = await getSettings();
    const chosen = pickFolders(listFolders(await browser.bookmarks.getTree()), bookmarks.folderIds);
    const trees = await Promise.all(chosen.map((f) => browser.bookmarks.getSubTree(f.id).then((t) => t[0]!)));
    return collectVideos(trees, videoIdFromUrl);
  });

  onMessage('setBookmark', async ({ data: { folderId, saved, video } }) => {
    if (!browser.bookmarks) return null;
    const existing = await linksTo(folderId, video.videoId);
    if (saved && existing.length === 0) await browser.bookmarks.create({ parentId: folderId, title: video.title, url: video.url });
    if (!saved) await Promise.all(existing.map((b) => browser.bookmarks.remove(b.id)));
    return folderStates(video.videoId);
  });

  onMessage('openSettings', async ({ data }) => {
    await browser.tabs.create({ url: browser.runtime.getURL(`/options.html#${data.section}`) });
  });

  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') void browser.runtime.openOptionsPage();
    if (reason === 'update') void browser.storage.local.remove(OBSOLETE_KEYS);
  });
});
