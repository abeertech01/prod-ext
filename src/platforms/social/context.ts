import type { WxtStorageItem } from '#imports';
import { DEFAULT_SETTINGS } from '@/core/settings/defaults';
import type { Settings } from '@/core/settings/schema';
import { getSettings, watchSettings } from '@/core/settings/storage';
import { currentDaily, type DailyAllowance, type FeedLimits } from '@/core/social/daily';

export interface SiteContext {
  /** Settings and today's allowance, kept current. */
  live: { settings: Settings; daily: DailyAllowance };
  limits: FeedLimits;
  load(): Promise<() => void>;
  onChange(listener: () => void): () => void;
  /** Today's record, starting over if midnight has passed. */
  today(): DailyAllowance;
  /** Update today's record. Writes are queued so quick successive updates don't overwrite each other. */
  updateDaily(fn: (daily: DailyAllowance) => DailyAllowance): DailyAllowance;
}

/** Settings and one site's daily allowance for its content script. */
export function createSiteContext(item: WxtStorageItem<DailyAllowance | null, Record<string, unknown>>, limits: FeedLimits): SiteContext {
  const live = { settings: DEFAULT_SETTINGS, daily: currentDaily(null, new Date(), limits) };
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  let writing: Promise<unknown> = Promise.resolve();

  const today = () => (live.daily = currentDaily(live.daily, new Date(), limits));

  return {
    live,
    limits,
    async load() {
      live.settings = await getSettings();
      live.daily = currentDaily(await item.getValue(), new Date(), limits);
      const unwatchSettings = watchSettings((s) => {
        live.settings = s;
        notify();
      });
      // Other tabs of the same site use the same allowance.
      const unwatchDaily = item.watch((value) => {
        live.daily = currentDaily(value, new Date(), limits);
        notify();
      });
      return () => {
        unwatchSettings();
        unwatchDaily();
      };
    },
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    today,
    updateDaily(fn) {
      const next = fn(today());
      live.daily = next;
      writing = writing.then(() => item.setValue(next)).catch(() => {});
      return next;
    },
  };
}
