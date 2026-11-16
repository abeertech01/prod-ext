import type { HomeMode } from '@/core/settings/schema';
import { Card } from '@/ui/components/controls';
import type { SectionProps } from '../App';

const MODES: { mode: HomeMode; label: string; description: string }[] = [
  {
    mode: 'mixed',
    label: 'Bookmarks + suggestions',
    description: '5 random videos from your YouTube bookmark folders at the top, then the usual filtered suggestions.',
  },
  {
    mode: 'only',
    label: 'Only bookmarks',
    description: 'Only videos from your YouTube bookmark folders, with a “Load more” button. No suggestions.',
  },
  {
    mode: 'off',
    label: 'Nothing',
    description:
      'A blank home page: no videos, no Shorts, no topic chips. Search, watch pages and subscriptions work as usual. To get the videos back, come back here.',
  },
];

export function HomePageSection({ settings, update }: SectionProps) {
  const value = settings.bookmarks.homeMode;
  const setMode = (homeMode: HomeMode) => update((s) => ({ ...s, bookmarks: { ...s.bookmarks, homeMode } }));
  return (
    <Card
      title="What the home page shows"
      description="The first two can also be switched with the buttons at the top of YouTube's home page. Bookmarked videos come from the folders chosen under Bookmarks."
    >
      <div role="radiogroup" aria-label="What the home page shows" className="py-2">
        {MODES.map((m) => (
          <label key={m.mode} className="flex cursor-pointer items-start gap-3 py-2">
            <input type="radio" name="home-mode" checked={value === m.mode} onChange={() => setMode(m.mode)} className="mt-1 accent-teal-600" />
            <span>
              <span className="block text-[14px] font-medium text-zinc-900 dark:text-zinc-100">{m.label}</span>
              <span className="block text-[13px] text-zinc-500 dark:text-zinc-400">{m.description}</span>
            </span>
          </label>
        ))}
      </div>
    </Card>
  );
}
