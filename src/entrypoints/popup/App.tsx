import { browser } from 'wxt/browser';
import { Button, Toggle } from '@/ui/components/controls';
import { FACEBOOK_FEED, type StoriesSetting } from '@/core/social/daily';
import type { PlatformId } from '@/core/settings/schema';
import { useFacebookDaily, useSettings } from '@/ui/hooks/useStorage';

/** Facebook posts opened today with "Show post". */
function FacebookPosts() {
  const opened = useFacebookDaily()?.openedPosts ?? 0;
  return (
    <section className="mt-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[13px] font-medium">Facebook posts today</h2>
        <span className="text-[13px] tabular-nums text-zinc-500">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{opened}</span> of {FACEBOOK_FEED.dailyPosts} opened
        </span>
      </div>
    </section>
  );
}

/** People whose Facebook stories were opened today. */
function FacebookStories({ setting }: { setting: StoriesSetting }) {
  const daily = useFacebookDaily();
  const people = daily?.storyProfiles ?? [];
  const names = daily?.storyNames ?? [];
  return (
    <section className="mt-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[13px] font-medium">Facebook stories today</h2>
        <span className="text-[13px] tabular-nums text-zinc-500">
          {setting.mode === 'limited' ? (
            <>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{people.length}</span> of {setting.profilesPerDay} profiles
            </>
          ) : setting.mode === 'hidden' ? (
            'Hidden'
          ) : (
            'No limit'
          )}
        </span>
      </div>
      {people.length > 0 && (
        <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-[12px] leading-5 text-zinc-600 dark:text-zinc-300">
          {people.map((key, i) => (
            <li key={key}>{names[i] || key}</li>
          ))}
        </ol>
      )}
    </section>
  );
}

const PLATFORMS: { id: PlatformId; label: string }[] = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
];

export function App() {
  const [settings, update] = useSettings();
  if (!settings) return <div className="h-[180px] w-[340px] bg-zinc-50 dark:bg-zinc-950" />;
  const { platforms } = settings;

  return (
    <main className="w-[340px] bg-zinc-50 p-4 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="mb-3">
        <h1 className="text-[15px] font-semibold">Focus Filter</h1>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white px-4 pt-3 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-[12px] font-medium uppercase tracking-wide text-zinc-500">Rules apply on</h2>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {PLATFORMS.map((p) => (
            <Toggle
              key={p.id}
              label={p.label}
              checked={platforms[p.id]}
              onChange={(on) => update((s) => ({ ...s, platforms: { ...s.platforms, [p.id]: on } }))}
            />
          ))}
        </div>
        <p className="pb-3 text-[12px] leading-5 text-zinc-500">When a site is off, it works as usual. Its open tabs reload to apply the change.</p>
      </section>

      {platforms.youtube && (
        <section className="mt-3 rounded-xl border border-zinc-200 bg-white px-4 py-1 dark:border-zinc-800 dark:bg-zinc-900">
          <Toggle
            label="YouTube video filtering"
            checked={settings.filter.enabled}
            onChange={(enabled) => update((s) => ({ ...s, filter: { ...s.filter, enabled } }))}
          />
        </section>
      )}

      {platforms.facebook && (
        <>
          <FacebookPosts />
          <FacebookStories setting={settings.facebook.stories} />
        </>
      )}

      <div className="mt-3 flex justify-end">
        <Button variant="secondary" onClick={() => void browser.runtime.openOptionsPage()}>
          All settings
        </Button>
      </div>
    </main>
  );
}
