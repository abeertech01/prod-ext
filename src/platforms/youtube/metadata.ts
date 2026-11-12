import { innertubePost } from './innertube';
import { extractJsonAfter } from './json';

export interface VideoMeta {
  channelId?: string;
  author?: string;
  description: string;
  tags: string[];
  isLive: boolean;
}

const MAX_CONCURRENT = 3;
const cache = new Map<string, Promise<VideoMeta | null>>();
let running = 0;
const waiting: (() => void)[] = [];

async function limited<T>(task: () => Promise<T>): Promise<T> {
  if (running >= MAX_CONCURRENT) await new Promise<void>((resolve) => waiting.push(resolve));
  running++;
  try {
    return await task();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

function fromPlayerResponse(data: any): VideoMeta | null {
  const d = data?.videoDetails;
  if (!d) return null;
  return {
    channelId: d.channelId,
    author: d.author,
    description: d.shortDescription ?? '',
    tags: Array.isArray(d.keywords) ? d.keywords : [],
    isLive: Boolean(d.isLive),
  };
}

async function load(videoId: string): Promise<VideoMeta | null> {
  try {
    const meta = fromPlayerResponse(await innertubePost('player', { videoId }));
    if (meta) return meta;
  } catch {
    // Fall through to the watch page.
  }
  const res = await fetch(`/watch?v=${encodeURIComponent(videoId)}`, { credentials: 'include' });
  if (!res.ok) return null;
  return fromPlayerResponse(extractJsonAfter(await res.text(), 'ytInitialPlayerResponse'));
}

/** Description, tags and channel for a video; cached per page session. */
export function getVideoMeta(videoId: string): Promise<VideoMeta | null> {
  let pending = cache.get(videoId);
  if (!pending) {
    pending = limited(() => load(videoId)).catch(() => null);
    cache.set(videoId, pending);
  }
  return pending;
}
