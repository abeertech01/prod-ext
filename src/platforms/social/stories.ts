import type { ContentScriptContext } from '#imports';
import { checkStory, type StoriesSetting } from '@/core/social/daily';
import type { SocialUi } from '@/ui/social/state';
import type { SiteContext } from './context';
import type { SocialPage } from './page';
import { lockPlayback, unlockPlayback } from './player';

const LOCK = 'stories-limit';

export interface StoriesLimitOptions {
  site: SiteContext;
  ui: SocialUi;
  setting: () => StoriesSetting;
}

/**
 * Stories from a set number of people per day, or none, or no limit. The
 * person comes from the address (`/stories/<person>/…`) and counts as soon as
 * their story shows; rewatching them is free for the rest of the day.
 */
export function startStoriesLimit(_ctx: ContentScriptContext, getPage: () => SocialPage, opts: StoriesLimitOptions) {
  const { site, ui } = opts;
  const { store } = ui;

  const clearNotice = () => {
    if (store.get().notice?.kind.startsWith('stories')) store.set({ notice: null });
  };

  /** Visible in DevTools on <html>, to check by hand. */
  function showState(): void {
    const { mode, profilesPerDay } = opts.setting();
    document.documentElement.dataset.ffStories = mode === 'limited' ? `${site.today().storyProfiles.length}/${profilesPerDay}` : mode;
  }

  function update(): void {
    const page = getPage();
    showState();
    if (page.type !== 'stories' || !page.storyProfile) {
      unlockPlayback(LOCK);
      return clearNotice();
    }
    const stories = opts.setting();
    const before = site.today();
    const res = checkStory(before, page.storyProfile, stories);
    if (res.daily !== before) site.updateDaily(() => res.daily);

    if (res.verdict === 'allowed') {
      unlockPlayback(LOCK);
      return clearNotice();
    }
    lockPlayback(LOCK);
    store.set({ notice: res.verdict === 'off' ? { kind: 'stories-off' } : { kind: 'stories-limit', limit: stories.profilesPerDay } });
  }

  site.onChange(update);
  return {
    onNavigate(_next: SocialPage, _prev: SocialPage | null) {
      update();
    },
  };
}
