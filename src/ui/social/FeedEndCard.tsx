import type { FeedLimits } from '@/core/social/daily';
import { useStore } from '../store';
import type { SocialUi } from './state';

/** Below the home feed: "Load more", or today's posts are done. */
export function FeedEndCard({ ui, limits, stillWorks }: { ui: SocialUi; limits: FeedLimits; stillWorks: string }) {
  const feed = useStore(ui.store, (s) => s.feed);
  if (feed.phase === 'more') {
    return (
      <div className="mx-auto my-6 flex max-w-[500px] flex-col items-center gap-3 text-center font-sans">
        <p className="text-[14px] leading-5 text-zinc-500 dark:text-zinc-400">
          {feed.seenToday} of {limits.dailyPosts} posts today. The feed doesn't scroll on by itself.
        </p>
        <button
          type="button"
          onClick={() => ui.actions.loadMore()}
          className="rounded-full bg-zinc-900 px-5 py-2 text-[15px] font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Load more · {feed.loadsLeft} left
        </button>
      </div>
    );
  }
  if (feed.phase !== 'end') return null;
  return (
    <div className="mx-auto my-6 max-w-[500px] rounded-2xl border border-zinc-300 bg-white p-6 text-center font-sans dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-1 text-[17px] font-semibold text-zinc-800 dark:text-zinc-100">That's your {limits.dailyPosts} posts for today</div>
      <p className="text-[14px] leading-5 text-zinc-500 dark:text-zinc-400">New posts show up again tomorrow. {stillWorks}</p>
    </div>
  );
}
