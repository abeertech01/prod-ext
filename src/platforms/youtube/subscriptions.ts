import type { SyncResult } from '@/core/messaging/protocol';
import type { ChannelRef } from '@/core/settings/schema';
import { subscriptionsItem } from '@/core/settings/storage';
import { normalizeHandle } from '@/core/filter/allowlist';
import { innertubePost } from './innertube';
import { extractJsonAfter, walkJson } from './json';

const MAX_PAGES = 40;
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

function collect(data: unknown, into: Map<string, ChannelRef>): string | null {
  let continuation: string | null = null;
  walkJson(data, (obj) => {
    const r = obj.channelRenderer;
    if (r?.channelId) {
      const base: string | undefined = r.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl;
      const handleText: string | undefined = r.subscriberCountText?.simpleText;
      const handle = base?.startsWith('/@') ? base.slice(1) : handleText?.startsWith('@') ? handleText : undefined;
      into.set(r.channelId, {
        id: r.channelId,
        handle: handle ? normalizeHandle(handle) : undefined,
        name: r.title?.simpleText ?? r.title?.runs?.[0]?.text ?? handle ?? r.channelId,
      });
    }
    const token = obj.continuationCommand?.token;
    if (typeof token === 'string') continuation = token;
  });
  return continuation;
}

/** Read the signed-in user's subscriptions from youtube.com/feed/channels. */
export async function syncSubscriptions(): Promise<SyncResult> {
  try {
    const res = await fetch('/feed/channels', { credentials: 'include' });
    const html = await res.text();
    if (/"LOGGED_IN":false/.test(html)) return { ok: false, error: 'Sign in to YouTube to sync your subscriptions.' };
    const data = extractJsonAfter(html, 'ytInitialData');
    if (!data) return { ok: false, error: "Couldn't read your subscriptions page." };

    const channels = new Map<string, ChannelRef>();
    const context = extractJsonAfter(html, '"INNERTUBE_CONTEXT":');
    let token = collect(data, channels);
    for (let page = 0; token && page < MAX_PAGES; page++) {
      const next = await innertubePost('browse', { continuation: token }, context ?? undefined);
      const before = token;
      token = collect(next, channels);
      if (token === before) break;
    }

    await subscriptionsItem.setValue({ channels: [...channels.values()], syncedAt: Date.now() });
    return { ok: true, count: channels.size };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Sync once a day in the background while the user browses YouTube. */
export async function syncSubscriptionsIfStale(): Promise<void> {
  const { syncedAt } = await subscriptionsItem.getValue();
  if (!syncedAt || Date.now() - syncedAt > SYNC_INTERVAL_MS) await syncSubscriptions();
}
