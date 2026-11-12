import type { ContentScriptContext } from '#imports';
import type { PlatformAdapter } from '@/core/platform/adapter';
import { startAutoplayRules } from '../social/autoplay';
import type { SocialPage } from '../social/page';
import { isPlaybackLocked, onAnyVideoPlay } from '../social/player';
import { startReelsLock } from '../social/reels';
import { startStoriesLimit } from '../social/stories';
import { igLive, igSite } from './context';
import { startIgFeed } from './feed';
import { onIgNavigate, readIgPage } from './page';
import { IG_ROOT_CLASS, injectIgStyles, setIgRootClass } from './pageStyles';
import { startIgSections } from './sections';
import { igUi, mountIgUi } from './ui';

export const instagramAdapter: PlatformAdapter = {
  id: 'instagram',
  async start(ctx: ContentScriptContext) {
    ctx.onInvalidated(injectIgStyles());
    ctx.onInvalidated(await igSite.load());

    let page: SocialPage = readIgPage();
    const getPage = () => page;

    // Explore and the Reels feed: straight back to the home feed, no notice.
    const leaveIfBlocked = (p: SocialPage) => {
      setIgRootClass(IG_ROOT_CLASS.blocked, p.type === 'blocked');
      if (p.type === 'blocked') location.replace('/');
      return p.type === 'blocked';
    };
    if (leaveIfBlocked(page)) return;

    // While the Reels or stories limit holds playback, nothing plays.
    onAnyVideoPlay(ctx, (video) => {
      if (isPlaybackLocked()) video.pause();
    });
    igUi.actions.leave = () => location.assign('/');

    await mountIgUi(ctx);
    const feed = startIgFeed(ctx, getPage);
    startIgSections(ctx);
    const autoplay = startAutoplayRules(ctx, getPage);
    const reels = startReelsLock(ctx, getPage, {
      ui: igUi,
      rootClass: IG_ROOT_CLASS.reelsLocked,
      allowed: () => igLive.settings.instagram.reelsScrolling,
      onChange: igSite.onChange,
    });
    const stories = startStoriesLimit(ctx, getPage, {
      site: igSite,
      ui: igUi,
      setting: () => igLive.settings.instagram.stories,
    });

    onIgNavigate(ctx, (next, prev) => {
      page = next;
      if (leaveIfBlocked(next)) return;
      autoplay.onNavigate(next);
      reels.onNavigate(next, prev);
      stories.onNavigate(next, prev);
      feed.onNavigate();
    });
  },
};
