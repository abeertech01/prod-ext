import { INSTAGRAM_FEED } from '@/core/social/daily';
import { Card, Toggle } from '@/ui/components/controls';
import type { SectionProps } from '../App';
import { StoriesCard } from './StoriesCard';

export function InstagramSection({ settings, update }: SectionProps) {
  const ig = settings.instagram;
  const setIg = (patch: Partial<typeof ig>) => update((s) => ({ ...s, instagram: { ...s.instagram, ...patch } }));

  return (
    <>
      <Card title="Reels" description="Reel rows are removed from the feed and the Reels tab is gone. A Reel shared as a single post stays, and you can watch a Reel you open.">
        <Toggle
          label="Allow scrolling to the next Reel"
          description="Off: after the Reel you opened, scrolling on to the next one is blocked."
          checked={ig.reelsScrolling}
          onChange={(reelsScrolling) => setIg({ reelsScrolling })}
        />
      </Card>

      <StoriesCard site="Instagram" value={ig.stories} onChange={(stories) => setIg({ stories })} />

      <Card title="Suggested content" description="Sponsored posts, suggested posts and posts from accounts you don't follow are always hidden.">
        <Toggle label="Show “Suggested for you” accounts" checked={ig.suggestedAccounts} onChange={(suggestedAccounts) => setIg({ suggestedAccounts })} />
      </Card>

      <Card title="Always on">
        <ul className="list-disc space-y-1.5 py-3 pl-5 text-[13px] leading-5 text-zinc-600 dark:text-zinc-300">
          <li>
            The home feed shows {INSTAGRAM_FEED.dailyPosts} posts a day, {INSTAGRAM_FEED.batch} at a time, with a “Load more” button in between. Reloading doesn't reset it. Counted separately from Facebook.
          </li>
          <li>Explore is hidden and its page goes back to the home feed. Search still works.</li>
          <li>Videos don't play by themselves, don't repeat, and nothing plays after a video ends.</li>
          <li>Works with Instagram set to English.</li>
        </ul>
      </Card>
    </>
  );
}
