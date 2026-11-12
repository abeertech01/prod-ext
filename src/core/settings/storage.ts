import { storage } from '#imports';
import { DEFAULT_SETTINGS } from './defaults';
import { withDefaults } from './merge';
import { addBrainrotExceptions } from './migrations';
import type { DailyAllowance } from '../social/daily';
import type { Settings, SubscriptionCache } from './schema';

/**
 * Every item is versioned. To change a shape: bump `version` and add a
 * migration keyed by the new version number, e.g. `2: (v1) => ({ ...v1, x: 0 })`.
 */
export const settingsItem = storage.defineItem<Settings>('local:settings', {
  fallback: DEFAULT_SETTINGS,
  version: 2,
  migrations: { 2: addBrainrotExceptions },
});

export const subscriptionsItem = storage.defineItem<SubscriptionCache>('local:subscriptions', {
  fallback: { channels: [], syncedAt: null },
  version: 1,
  migrations: {},
});

export const facebookDailyItem = storage.defineItem<DailyAllowance | null>('local:facebookDaily', {
  fallback: null,
  version: 1,
  migrations: {},
});

export const instagramDailyItem = storage.defineItem<DailyAllowance | null>('local:instagramDaily', {
  fallback: null,
  version: 1,
  migrations: {},
});

export async function getSettings(): Promise<Settings> {
  return withDefaults(await settingsItem.getValue());
}

export async function updateSettings(update: (current: Settings) => Settings): Promise<Settings> {
  const next = update(await getSettings());
  await settingsItem.setValue(next);
  return next;
}

export function watchSettings(cb: (settings: Settings) => void): () => void {
  return settingsItem.watch((value) => cb(withDefaults(value)));
}
