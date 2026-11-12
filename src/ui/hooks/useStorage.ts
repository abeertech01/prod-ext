import { useCallback, useEffect, useState } from 'react';
import type { Settings, SubscriptionCache } from '@/core/settings/schema';
import { facebookDailyItem, getSettings, subscriptionsItem, updateSettings, watchSettings } from '@/core/settings/storage';
import { localDayKey, type DailyAllowance } from '@/core/social/daily';

export function useSettings(): [Settings | null, (update: (s: Settings) => Settings) => void] {
  const [settings, setSettings] = useState<Settings | null>(null);
  useEffect(() => {
    void getSettings().then(setSettings);
    return watchSettings(setSettings);
  }, []);
  const update = useCallback((fn: (s: Settings) => Settings) => {
    // Optimistic so inputs stay responsive; storage is the source of truth.
    setSettings((current) => (current ? fn(current) : current));
    void updateSettings(fn);
  }, []);
  return [settings, update];
}

export function useSubscriptions(): SubscriptionCache | null {
  const [subs, setSubs] = useState<SubscriptionCache | null>(null);
  useEffect(() => {
    void subscriptionsItem.getValue().then(setSubs);
    return subscriptionsItem.watch(setSubs);
  }, []);
  return subs;
}

/** Today's Facebook allowance, or null when nothing has been used today. */
export function useFacebookDaily(): DailyAllowance | null {
  const [daily, setDaily] = useState<DailyAllowance | null>(null);
  useEffect(() => {
    const set = (d: DailyAllowance | null) => setDaily(d && d.dayKey === localDayKey(new Date()) ? d : null);
    void facebookDailyItem.getValue().then(set);
    return facebookDailyItem.watch(set);
  }, []);
  return daily;
}
