import type { ContentScriptContext } from '#imports';
import { channelKeys, isAllowListed, normalizeHandle, sameChannel } from '@/core/filter/allowlist';
import { decide } from '@/core/filter/engine';
import type { ChannelRef } from '@/core/settings/schema';
import { updateSettings } from '@/core/settings/storage';
import { overlay, overlayActions } from '@/ui/content/state';
import { live } from './context';
import { getVideoMeta } from './metadata';
import type { PageInfo } from './page';
import { activeVideo } from './player';
import { SEL, queryFirst, textOf } from './selectors';

/** Fraction of a video that counts as "watched". */
const WATCHED_FRACTION = 0.5;

function readWatchChannel(): ChannelRef | null {
  const owner = document.querySelector(SEL.watchOwner);
  if (!owner) return null;
  const handle = owner.querySelector(SEL.tileChannelHandleLink)?.getAttribute('href')?.match(/^\/(@[^/?#]+)/)?.[1];
  const id = owner.querySelector(SEL.tileChannelIdLink)?.getAttribute('href')?.match(/^\/channel\/(UC[\w-]{22})/)?.[1];
  if (!handle && !id) return null;
  return { handle: handle ? normalizeHandle(handle) : undefined, id, name: textOf(SEL.watchChannelName) || handle || id || 'this channel' };
}

export async function trustChannel(channel: ChannelRef): Promise<void> {
  const keys = new Set(channelKeys(channel));
  await updateSettings((s) => ({
    ...s,
    allowList: {
      manual: s.allowList.manual.some((e) => sameChannel(e, channel))
        ? s.allowList.manual
        : [...s.allowList.manual, { ...channel, addedAt: Date.now() }],
      excluded: s.allowList.excluded.filter((k) => !keys.has(k)),
    },
  }));
}

/**
 * Offer "Trust this channel" when a video from a non-allow-listed channel got
 * through the keyword filter and the user watched at least half of it or
 * liked it.
 */
export function startTrustPrompt(ctx: ContentScriptContext, getPage: () => PageInfo) {
  const settled = new Set<string>();
  let checking: string | null = null;

  overlayActions.trustChannel = (channel) => {
    const videoId = overlay.get().trust?.videoId;
    if (videoId) settled.add(videoId);
    overlay.set({ trust: null });
    void trustChannel(channel);
  };
  overlayActions.dismissTrust = () => {
    const videoId = overlay.get().trust?.videoId;
    if (videoId) settled.add(videoId);
    overlay.set({ trust: null });
  };

  async function check(): Promise<void> {
    const page = getPage();
    const videoId = page.type === 'watch' ? page.videoId : null;
    const current = overlay.get().trust;
    if (current && current.videoId !== videoId) overlay.set({ trust: null });
    if (!videoId || !live.settings.filter.enabled || settled.has(videoId) || current || checking === videoId) return;

    const channel = readWatchChannel();
    if (!channel || isAllowListed(live.allowSet, channel)) return;
    const video = activeVideo(page);
    const watched = !!video && Number.isFinite(video.duration) && video.duration > 0 && (video.ended || video.currentTime / video.duration >= WATCHED_FRACTION);
    const liked = !!queryFirst(SEL.likeButtonPressed);
    if (!watched && !liked) return;

    checking = videoId;
    try {
      const meta = await getVideoMeta(videoId);
      const title = textOf(SEL.watchTitle);
      const decision = decide({ title, description: meta?.description, tags: meta?.tags }, false, live.filter, 'full');
      // Only meaningful when an inclusion key let it through.
      if (decision.verdict === 'show' && decision.reason === 'included' && getPage().videoId === videoId) {
        overlay.set({ trust: { channel: { ...channel, id: channel.id ?? meta?.channelId }, videoId } });
      } else {
        settled.add(videoId);
      }
    } finally {
      checking = null;
    }
  }

  ctx.setInterval(() => void check(), 3000);
}
