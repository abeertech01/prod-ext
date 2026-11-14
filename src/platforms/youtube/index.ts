import type { ContentScriptContext } from '#imports';
import { onMessage } from '@/core/messaging/protocol';
import type { PlatformAdapter } from '@/core/platform/adapter';
import { startAutoplayBlocker } from './autoplay';
import { startBookmarkButtons } from './bookmarks';
import { loadContext } from './context';
import { startFeedFilter } from './feedFilter';
import { startHomeBookmarks } from './homeBookmarks';
import { onNavigate, readPage, type PageInfo } from './page';
import { injectPageStyles } from './pageStyles';
import { isPlaybackLocked, onAnyVideoPlay } from './player';
import { startShortsBlocker } from './shorts';
import { syncSubscriptions, syncSubscriptionsIfStale } from './subscriptions';
import { startTrustPrompt } from './trust';
import { mountHomeBookmarks, mountUi } from './ui';

export const youtubeAdapter: PlatformAdapter = {
  id: 'youtube',
  async start(ctx: ContentScriptContext) {
    ctx.onInvalidated(injectPageStyles());
    ctx.onInvalidated(await loadContext());

    let page: PageInfo = readPage();
    const getPage = () => page;

    // While the Shorts limit holds playback, nothing plays.
    onAnyVideoPlay(ctx, (video) => {
      if (isPlaybackLocked()) video.pause();
    });

    await mountUi(ctx);
    mountHomeBookmarks(ctx);
    startFeedFilter(ctx, getPage);
    startAutoplayBlocker(ctx, getPage);
    startTrustPrompt(ctx, getPage);
    startBookmarkButtons(ctx);
    const shorts = startShortsBlocker(ctx, getPage);
    const homeBookmarks = startHomeBookmarks(ctx, getPage);

    onNavigate(ctx, (next, prev) => {
      page = next;
      shorts.onNavigate(next, prev);
      homeBookmarks.onNavigate(next, prev);
    });

    const removeSync = onMessage('syncSubscriptions', () => syncSubscriptions());
    ctx.onInvalidated(removeSync);
    void syncSubscriptionsIfStale();
  },
};
