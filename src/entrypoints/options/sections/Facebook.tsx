import { Card, Toggle } from '@/ui/components/controls';
import type { SectionProps } from '../App';
import { StoriesCard } from './StoriesCard';

export function FacebookSection({ settings, update }: SectionProps) {
  const fb = settings.facebook;
  const setFb = (patch: Partial<typeof fb>) => update((s) => ({ ...s, facebook: { ...s.facebook, ...patch } }));

  return (
    <>
      <Card title="Reels" description="Reel rows that scroll sideways are removed from the feed. A Reel shared as a single post stays. You can watch a Reel you open.">
        <Toggle
          label="Allow scrolling to the next Reel"
          description="Off: after the Reel you opened, scrolling on to the next one is blocked."
          checked={fb.reelsScrolling}
          onChange={(reelsScrolling) => setFb({ reelsScrolling })}
        />
      </Card>

      <StoriesCard
        site="Facebook"
        value={fb.stories}
        onChange={(stories) => setFb({ stories })}
        hiddenDescription="Stories are blocked, except when you open someone's stories from their profile."
      />

      <Card
        title="Suggested content"
        description="Sponsored posts, suggested posts, posts from people you aren't friends with and don't follow, and suggested pages are always hidden."
      >
        <Toggle label="Show “People you may know”" checked={fb.peopleYouMayKnow} onChange={(peopleYouMayKnow) => setFb({ peopleYouMayKnow })} />
        <Toggle label="Show group suggestions" checked={fb.groupSuggestions} onChange={(groupSuggestions) => setFb({ groupSuggestions })} />
      </Card>

      <Card title="Always on">
        <ul className="list-disc space-y-1.5 py-3 pl-5 text-[13px] leading-5 text-zinc-600 dark:text-zinc-300">
          <li>Works with Facebook set to English.</li>
        </ul>
      </Card>
    </>
  );
}
