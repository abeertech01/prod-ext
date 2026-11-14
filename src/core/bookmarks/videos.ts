import type { BookmarkNode } from './folders';

export interface SavedVideo {
  videoId: string;
  url: string;
  title: string;
  /** The folder it's saved in. */
  folder: string;
}

/**
 * Every YouTube video saved in these folders, subfolders included. A video
 * saved in several folders, or several times, is listed once. Links that
 * aren't YouTube videos (channels, playlists, other sites) are skipped.
 */
export function collectVideos(folders: BookmarkNode[], videoIdOf: (url: string) => string | null): SavedVideo[] {
  const seen = new Set<string>();
  const out: SavedVideo[] = [];
  const walk = (node: BookmarkNode, folder: string) => {
    for (const child of node.children ?? []) {
      if (child.children) {
        walk(child, folder);
        continue;
      }
      const videoId = child.url ? videoIdOf(child.url) : null;
      if (!videoId || seen.has(videoId)) continue;
      seen.add(videoId);
      out.push({ videoId, url: child.url!, title: child.title || 'Untitled video', folder });
    }
  };
  for (const f of folders) walk(f, f.title || 'Untitled folder');
  return out;
}

/** A shuffled copy (Fisher–Yates). */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
