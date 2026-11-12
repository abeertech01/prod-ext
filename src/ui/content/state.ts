import type { BookmarkFolderState, BookmarkTarget } from '@/core/messaging/protocol';
import type { ChannelRef } from '@/core/settings/schema';
import { createStore } from '../store';

export type Surface = 'home' | 'related';

export interface FeedCounts {
  noMatch: number;
  distraction: number;
}

/**
 * The home feed loads in batches. `loading`: filling the current batch.
 * `more`: batch done, a "Load more" click is left. `end`: no more loads.
 */
export interface HomeFeedState {
  phase: 'off' | 'loading' | 'more' | 'end';
  shown: number;
  loadsLeft: number;
  /** Why the feed ended: loads used up, YouTube ran out, or the last load found nothing new. */
  endReason: 'limit' | 'exhausted' | 'dry' | null;
}

/** The folder picker opened from a thumbnail's bookmark button. */
export interface BookmarkMenuState {
  video: BookmarkTarget;
  /** The button's position on screen, to place the menu next to it. */
  anchor: { top: number; bottom: number; left: number; right: number };
  /** `undefined` while loading; `null` when the browser has no bookmarks API. */
  folders: BookmarkFolderState[] | null | undefined;
  /** Folder the video was just saved to; the menu shows it, then closes. */
  savedTo: string | null;
  error: string | null;
}

export interface OverlayState {
  shorts: { scrollsLeft: number; locked: boolean; overLimit: boolean } | null;
  /** When a blocked Shorts scroll last happened; shows the "Scrolling is disabled" toast. */
  shortsBlockedAt: number;
  trust: { channel: ChannelRef; videoId: string } | null;
  feed: Record<Surface, FeedCounts>;
  reveal: { noMatch: boolean; distraction: boolean };
  showDistractionReveal: boolean;
  homeFeed: HomeFeedState;
  bookmarkMenu: BookmarkMenuState | null;
}

export const overlay = createStore<OverlayState>({
  shorts: null,
  shortsBlockedAt: 0,
  trust: null,
  feed: { home: { noMatch: 0, distraction: 0 }, related: { noMatch: 0, distraction: 0 } },
  reveal: { noMatch: false, distraction: false },
  showDistractionReveal: true,
  homeFeed: { phase: 'off', shown: 0, loadsLeft: 0, endReason: null },
  bookmarkMenu: null,
});

/** Wired up by the platform adapter; the UI only calls these. */
export const overlayActions = {
  trustChannel: (_channel: ChannelRef) => {},
  dismissTrust: () => {},
  setReveal: (_kind: keyof OverlayState['reveal'], _value: boolean) => {},
  leaveShorts: () => {},
  loadMoreHome: () => {},
  toggleBookmark: (_folder: BookmarkFolderState) => {},
  closeBookmarkMenu: () => {},
  openBookmarkSettings: () => {},
};
