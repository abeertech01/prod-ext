import type { StoriesSetting } from '../social/daily';

export type FilterKeyId = 'business' | 'tech' | 'distraction' | 'selfHelp';

export interface FilterKeyConfig {
  enabled: boolean;
  /** One rule per entry. See `core/filter/rules.ts` for the syntax. */
  rules: string[];
}

export interface ChannelRef {
  /** YouTube channel ID (`UC…`), when known. */
  id?: string;
  /** Lower-cased handle including the leading `@`, when known. */
  handle?: string;
  name: string;
}

export interface AllowListEntry extends ChannelRef {
  addedAt: number;
}

export interface Settings {
  shorts: {
    /** How many Shorts the user may scroll past the first one. */
    allowedScrolls: number;
  };
  filter: {
    enabled: boolean;
    /** Disable inline preview playback on the home feed and autoplay at the end of a video. */
    autoplayDisabled: boolean;
    /** Hide the "up next" suggestions sidebar (and end-screen suggestions) while watching. */
    sidebarHidden: boolean;
    /** Load the home feed in batches instead of scrolling forever. */
    homeCapEnabled: boolean;
    /** Videos per batch. */
    homeCap: number;
    /** "Load more" clicks allowed per visit to the home page, after the first batch. */
    homeLoadMore: number;
    /** Offer a "show" link for videos hidden by the distraction key. */
    showDistractionReveal: boolean;
    /** Treat the user's YouTube subscriptions as allow-listed. */
    useSubscriptions: boolean;
    keys: Record<FilterKeyId, FilterKeyConfig>;
  };
  allowList: {
    manual: AllowListEntry[];
    /** Channel keys (see `channelKeys`) removed from the subscription-derived list. */
    excluded: string[];
  };
  facebook: {
    /** Let the user scroll from one Reel to the next. */
    reelsScrolling: boolean;
    /** Show "People you may know" in the feed. */
    peopleYouMayKnow: boolean;
    /** Show group suggestions ("Your group suggestions") in the feed. */
    groupSuggestions: boolean;
    stories: StoriesSetting;
  };
  instagram: {
    /** Let the user scroll from one Reel to the next. */
    reelsScrolling: boolean;
    /** Show "Suggested for you" account rows. */
    suggestedAccounts: boolean;
    stories: StoriesSetting;
  };
  bookmarks: {
    /** Show the bookmark button on video thumbnails. */
    enabled: boolean;
    /** Browser bookmark folders offered when the button is clicked, in this order. */
    folderIds: string[];
  };
}

export interface SubscriptionCache {
  channels: ChannelRef[];
  syncedAt: number | null;
}
