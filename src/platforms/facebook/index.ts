import type { ContentScriptContext } from '#imports';
import type { PlatformAdapter } from '@/core/platform/adapter';
import { isPlaybackLocked, onAnyVideoPlay } from '../social/player';
import { startReelsLock } from '../social/reels';
import { fbLive, fbSite } from './context';
import { startFbFeed } from './feed';
import { onFbNavigate, readFbPage, type FbPage } from './page';
import { FB_ROOT_CLASS, injectFbStyles } from './pageStyles';
import { startFbSections } from './sections';
import { startStoriesSidebarCover } from './storiesSidebar';
import { startFbStoryCount } from './storyCount';
import { fbUi, mountFbUi } from './ui';

export const facebookAdapter: PlatformAdapter = {
  id: 'facebook',
  async start(ctx: ContentScriptContext) {
    ctx.onInvalidated(injectFbStyles());
    ctx.onInvalidated(await fbSite.load());

    let page: FbPage = readFbPage();
    const getPage = () => page;

    // While the Reels lock or the stories limit holds playback, nothing plays.
    onAnyVideoPlay(ctx, (video) => {
      if (isPlaybackLocked()) video.pause();
    });
    fbUi.actions.leave = () => location.assign('/');

    await mountFbUi(ctx);
    startFbFeed(ctx);
    startFbSections(ctx);
    const reels = startReelsLock(ctx, getPage, {
      ui: fbUi,
      rootClass: FB_ROOT_CLASS.reelsLocked,
      allowed: () => fbLive.settings.facebook.reelsScrolling,
      onChange: fbSite.onChange,
    });
    const sidebarCover = startStoriesSidebarCover(ctx, getPage);
    const storyCount = startFbStoryCount(ctx, getPage);

    onFbNavigate(ctx, (next, prev) => {
      page = next;
      reels.onNavigate(next, prev);
      sidebarCover.onNavigate();
      storyCount.onNavigate(next, prev);
    });
  },
};
