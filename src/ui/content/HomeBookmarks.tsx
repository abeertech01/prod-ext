import type { BookmarkedVideo } from '@/core/messaging/protocol';
import { useStore } from '../store';
import { overlay, overlayActions, type HomeBookmarksState } from './state';

/**
 * Class names for the bookmarked-videos section. It sits in YouTube's page itself
 * (not a shadow root), so its cards can share YouTube's grid sizes; the styles are
 * in the YouTube page styles.
 */
export const HB = {
  root: 'ff-hb',
  header: 'ff-hb-header',
  heading: 'ff-hb-heading',
  modes: 'ff-hb-modes',
  mode: 'ff-hb-mode',
  grid: 'ff-hb-grid',
  item: 'ff-hb-item',
  thumb: 'ff-hb-thumb',
  title: 'ff-hb-title',
  line: 'ff-hb-line',
  note: 'ff-hb-note',
  footer: 'ff-hb-footer',
  more: 'ff-hb-more',
} as const;

const MODES: { value: HomeBookmarksState['mode']; label: string }[] = [
  { value: 'mixed', label: 'Bookmarks + suggestions' },
  { value: 'only', label: 'Only bookmarks' },
];

/** The large thumbnail, falling back to the small one that every video has. */
function Thumbnail({ videoId }: { videoId: string }) {
  return (
    <img
      src={`https://i.ytimg.com/vi/${videoId}/hq720.jpg`}
      alt=""
      loading="lazy"
      onError={(e) => {
        const img = e.currentTarget;
        if (img.src.includes('/hq720.jpg')) img.src = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
        else img.style.visibility = 'hidden';
      }}
    />
  );
}

function VideoCard({ video }: { video: BookmarkedVideo }) {
  return (
    <div className={HB.item}>
      <a className={HB.thumb} href={video.url} tabIndex={-1} aria-hidden="true">
        <Thumbnail videoId={video.videoId} />
      </a>
      <a className={HB.title} href={video.url} title={video.title}>
        {video.title}
      </a>
      <div className={HB.line}>Bookmarked · {video.folder}</div>
    </div>
  );
}

/** Bookmarked videos at the top of the home page, with the switch between the two modes. */
export function HomeBookmarks() {
  const state = useStore(overlay, (s) => s.homeBookmarks);
  // Nothing to show (no bookmark access, or no YouTube videos in the folders): the home page is left as it is.
  if (state.status === 'unavailable' || (state.status === 'ready' && state.videos.length === 0)) return null;
  const { mode, videos, shown, status } = state;
  const onScreen = videos.slice(0, shown);
  const left = videos.length - onScreen.length;

  return (
    <>
      <div className={HB.header}>
        <h2 className={HB.heading}>From your bookmarks</h2>
        <div className={HB.modes} role="radiogroup" aria-label="What the home page shows">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={m.value === mode}
              className={HB.mode}
              onClick={() => m.value !== mode && overlayActions.setHomeMode(m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {onScreen.length > 0 && (
        <div className={HB.grid}>
          {onScreen.map((v) => (
            <VideoCard key={v.videoId} video={v} />
          ))}
        </div>
      )}

      {mode === 'only' && status === 'ready' && videos.length > 0 && (
        <div className={HB.footer}>
          {left > 0 ? (
            <button type="button" className={HB.more} onClick={() => overlayActions.loadMoreBookmarks()}>
              Load more · {left} left
            </button>
          ) : (
            <p className={HB.note}>That's all {videos.length === 1 ? 'your bookmarked video' : `${videos.length} of your bookmarked videos`}.</p>
          )}
        </div>
      )}
    </>
  );
}
