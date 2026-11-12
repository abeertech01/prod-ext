import type { AllowListEntry, ChannelRef } from '../settings/schema';

export function normalizeHandle(handle: string): string {
  let h = handle.trim();
  try {
    h = decodeURIComponent(h);
  } catch {
    // Keep the raw value if it isn't valid URI encoding.
  }
  h = h.toLowerCase();
  return h.startsWith('@') ? h : `@${h}`;
}

/** Stable lookup keys for a channel: `id:UC…` and/or `@handle`. */
export function channelKeys(channel: Pick<ChannelRef, 'id' | 'handle'>): string[] {
  const keys: string[] = [];
  if (channel.id) keys.push(`id:${channel.id}`);
  if (channel.handle) keys.push(normalizeHandle(channel.handle));
  return keys;
}

export function buildAllowSet(
  subscriptions: ChannelRef[],
  manual: AllowListEntry[],
  excluded: string[],
  useSubscriptions: boolean,
): Set<string> {
  const blocked = new Set(excluded);
  const allowed = new Set<string>();
  if (useSubscriptions) {
    for (const sub of subscriptions) {
      const keys = channelKeys(sub);
      if (keys.some((k) => blocked.has(k))) continue;
      keys.forEach((k) => allowed.add(k));
    }
  }
  for (const entry of manual) channelKeys(entry).forEach((k) => allowed.add(k));
  return allowed;
}

export function isAllowListed(allowSet: Set<string>, channel: Pick<ChannelRef, 'id' | 'handle'> | null | undefined): boolean {
  if (!channel) return false;
  return channelKeys(channel).some((k) => allowSet.has(k));
}

export function sameChannel(a: Pick<ChannelRef, 'id' | 'handle'>, b: Pick<ChannelRef, 'id' | 'handle'>): boolean {
  const keys = new Set(channelKeys(a));
  return channelKeys(b).some((k) => keys.has(k));
}

/**
 * Parse what a user pastes into "add channel": a handle, a channel ID, or a
 * channel URL in any of those forms.
 */
export function parseChannelInput(input: string): Pick<ChannelRef, 'id' | 'handle'> | null {
  const value = input.trim();
  if (!value) return null;
  const idMatch = value.match(/(?:^|\/channel\/)(UC[\w-]{22})(?:[/?#]|$)/);
  if (idMatch) return { id: idMatch[1]! };
  const handleMatch = value.match(/(?:^|youtube\.com\/)(@[^/?#\s]+)/i);
  if (handleMatch) return { handle: normalizeHandle(handleMatch[1]!) };
  if (/^[\w.-]{3,30}$/.test(value)) return { handle: normalizeHandle(value) };
  return null;
}
