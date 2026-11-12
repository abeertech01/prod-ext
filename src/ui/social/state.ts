import { createStore, type Store } from '../store';

export type SocialNotice =
  | { kind: 'reels' }
  | { kind: 'stories-limit'; limit: number }
  | { kind: 'stories-off'; fromProfiles?: boolean }
  | { kind: 'stories-watched' }
  | { kind: 'stories-elsewhere'; returnTo: string };

/**
 * The feed shows posts in batches. `loading`: today's allowance isn't used up
 * yet. `more`: a "Load more" click is left. `end`: today's posts are done.
 */
export interface FeedState {
  phase: 'off' | 'loading' | 'more' | 'end';
  seenToday: number;
  loadsLeft: number;
}

/** A solid panel over part of the page (the stories page's list of people). */
export interface CoverState {
  top: number;
  left: number;
  width: number;
  height: number;
  /** The covered area's own background, so the panel blends in. */
  background: string;
}

export interface SocialOverlayState {
  /** When a blocked Reels scroll last happened; shows the "Scrolling is disabled" toast. */
  scrollBlockedAt: number;
  notice: SocialNotice | null;
  feed: FeedState;
  cover: CoverState | null;
}

export interface SocialUi {
  /** Shown in the UI, e.g. "Facebook". */
  site: string;
  store: Store<SocialOverlayState>;
  /** Wired up by the site's adapter; the UI only calls these. */
  actions: { leave: () => void; loadMore: () => void };
}

/** UI state for one social site (Facebook, Instagram). */
export function createSocialUi(site: string): SocialUi {
  return {
    site,
    store: createStore<SocialOverlayState>({
      scrollBlockedAt: 0,
      notice: null,
      feed: { phase: 'off', seenToday: 0, loadsLeft: 0 },
      cover: null,
    }),
    actions: { leave: () => {}, loadMore: () => {} },
  };
}
