import { useStore } from '../store';
import { overlay, overlayActions } from './state';

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** Below the home feed: the "Load more" button, or why the feed ended. */
export function HomeFeedCard() {
  const feed = useStore(overlay, (s) => s.homeFeed);
  if (feed.phase === 'more') {
    return (
      <div className="mx-auto my-8 flex max-w-[520px] flex-col items-center gap-3 text-center font-sans">
        <p className="text-[13px] leading-5 text-zinc-500">
          {feed.shown > 0 ? `${plural(feed.shown, 'video')} so far.` : 'Nothing matched your filters yet.'} The feed doesn't scroll on by itself.
        </p>
        <button
          type="button"
          className="rounded-full bg-zinc-900 px-5 py-2 text-[14px] font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          onClick={() => overlayActions.loadMoreHome()}
        >
          Load more · {feed.loadsLeft} left
        </button>
      </div>
    );
  }
  if (feed.phase !== 'end') return null;
  const [title, body] =
    feed.endReason === 'limit'
      ? ["That's the end of your feed", `You've used all your loads for this visit, so the home page stops here instead of scrolling forever.`]
      : feed.endReason === 'dry'
        ? ['Nothing more matched your filters', 'The last load found no new videos that pass your filters, so the feed stops here.']
        : feed.shown > 0
          ? ["That's everything for now", `YouTube has no more suggestions. ${plural(feed.shown, 'video')} matched your filters.`]
          : ['Nothing in your feed matched your filters', 'YouTube has no more suggestions to check.'];
  return (
    <div className="mx-auto my-8 max-w-[520px] rounded-2xl border border-zinc-300 p-6 text-center font-sans dark:border-zinc-700">
      <div className="mb-1 text-[16px] font-semibold text-zinc-800 dark:text-zinc-100">{title}</div>
      <p className="text-[13px] leading-5 text-zinc-500">{body} Search for something specific if you came here with a purpose.</p>
    </div>
  );
}
