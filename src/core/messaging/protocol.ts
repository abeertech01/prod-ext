import { defineExtensionMessaging } from '@webext-core/messaging';
import type { BookmarkFolder } from '../bookmarks/folders';

export interface SyncResult {
  ok: boolean;
  count?: number;
  error?: string;
}

export interface BookmarkFolderState extends BookmarkFolder {
  /** This folder already holds the video. */
  saved: boolean;
}

/** `null` when the browser has no bookmarks API (Safari). */
export type BookmarkFoldersResult = BookmarkFolderState[] | null;

export interface BookmarkTarget {
  videoId: string;
  url: string;
  title: string;
}

/** A video saved in one of the chosen bookmark folders. */
export interface BookmarkedVideo extends BookmarkTarget {
  /** The folder it's saved in. */
  folder: string;
}

/** Videos the filter hid on a YouTube tab's current page, and whether each kind is shown anyway. */
export interface HiddenVideos {
  noMatch: number;
  distraction: number;
  reveal: { noMatch: boolean; distraction: boolean };
  /** The user allows showing distracting videos (a setting). */
  canRevealDistraction: boolean;
}

interface ProtocolMap {
  /** Content → background: every video in the chosen folders; `null` without a bookmarks API (Safari). */
  bookmarkedVideos(): BookmarkedVideo[] | null;
  /** Content → background: the chosen folders, and which of them hold this video. */
  bookmarkFolders(data: { videoId: string }): BookmarkFoldersResult;
  /** Content → background: add the video to a folder (`saved: true`) or remove it from there. */
  setBookmark(data: { folderId: string; saved: boolean; video: BookmarkTarget }): BookmarkFoldersResult;
  /** Content → background: open a section of the settings page. */
  openSettings(data: { section: string }): void;
  /** Options → background: sync subscriptions through an open YouTube tab. */
  requestSubscriptionSync(): SyncResult;
  /** Popup → content (YouTube tab): what the filter hid on this page. */
  hiddenVideos(): HiddenVideos;
  /** Popup → content (YouTube tab): show one kind of hidden video anyway, or hide it again. */
  revealHidden(data: { kind: 'noMatch' | 'distraction'; value: boolean }): HiddenVideos;
  /** Background → content (YouTube tab): fetch and store subscriptions. */
  syncSubscriptions(): SyncResult;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
