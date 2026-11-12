import { buildAllowSet } from '@/core/filter/allowlist';
import { compileFilter, type CompiledFilter } from '@/core/filter/engine';
import { DEFAULT_SETTINGS } from '@/core/settings/defaults';
import type { Settings, SubscriptionCache } from '@/core/settings/schema';
import { getSettings, subscriptionsItem, watchSettings } from '@/core/settings/storage';

export interface LiveContext {
  settings: Settings;
  filter: CompiledFilter;
  allowSet: Set<string>;
  /** Bumped whenever filter-relevant inputs change, so cached decisions can be dropped. */
  revision: number;
}

let subscriptions: SubscriptionCache = { channels: [], syncedAt: null };
export const live: LiveContext = {
  settings: DEFAULT_SETTINGS,
  filter: compileFilter(DEFAULT_SETTINGS.filter),
  allowSet: new Set(),
  revision: 0,
};

const listeners = new Set<() => void>();

function rebuild(settings: Settings) {
  live.settings = settings;
  live.filter = compileFilter(settings.filter);
  live.allowSet = buildAllowSet(
    subscriptions.channels,
    settings.allowList.manual,
    settings.allowList.excluded,
    settings.filter.useSubscriptions,
  );
  live.revision++;
  listeners.forEach((l) => l());
}

export async function loadContext(): Promise<() => void> {
  subscriptions = await subscriptionsItem.getValue();
  rebuild(await getSettings());
  const unwatchSettings = watchSettings(rebuild);
  const unwatchSubs = subscriptionsItem.watch((value) => {
    subscriptions = value;
    rebuild(live.settings);
  });
  return () => {
    unwatchSettings();
    unwatchSubs();
  };
}

export function onContextChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
