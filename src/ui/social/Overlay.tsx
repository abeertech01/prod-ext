import { BlockingNotice, ScrollToast } from '../components/ScrollToast';
import { useStore } from '../store';
import type { SocialUi } from './state';

function Notice({ ui }: { ui: SocialUi }) {
  const notice = useStore(ui.store, (s) => s.notice);
  if (!notice) return null;
  const leave = () => ui.actions.leave();
  if (notice.kind === 'reels') {
    return <BlockingNotice title="Reels scrolling is off" body="You can watch the Reel you opened, but not scroll on to the next ones." action="Leave Reels" onAction={leave} />;
  }
  if (notice.kind === 'stories-off') {
    const body = `You turned off stories in Focus Filter's settings.${notice.fromProfiles ? " Someone's stories still open from their profile." : ''}`;
    return <BlockingNotice title="Stories are turned off" body={body} action={`Back to ${ui.site}`} onAction={leave} />;
  }
  if (notice.kind === 'stories-elsewhere') {
    return (
      <BlockingNotice
        title="That's all of this person's stories"
        body="Stories opened from someone's profile show only that person's stories."
        action="Go back"
        onAction={() => location.assign(notice.returnTo)}
      />
    );
  }
  if (notice.kind === 'stories-watched') {
    return (
      <BlockingNotice
        title="You've already watched these stories"
        body="You watched this person's stories earlier today. They open again tomorrow."
        action={`Back to ${ui.site}`}
        onAction={leave}
      />
    );
  }
  return (
    <BlockingNotice
      title="That's your stories for today"
      body={`You've watched stories from ${notice.limit} ${notice.limit === 1 ? 'person' : 'people'} today. Stories from new people open again tomorrow.`}
      action={`Back to ${ui.site}`}
      onAction={leave}
    />
  );
}

/** Covers the stories page's list of people: they can't be seen or clicked. */
function Cover({ ui }: { ui: SocialUi }) {
  const cover = useStore(ui.store, (s) => s.cover);
  if (!cover) return null;
  const block = (e: { preventDefault(): void; stopPropagation(): void }) => {
    e.preventDefault();
    e.stopPropagation();
  };
  return (
    <div
      onWheel={(e) => e.stopPropagation()}
      onClick={block}
      onMouseDown={block}
      className="pointer-events-auto fixed flex items-start justify-center px-6 pt-6 text-center text-[13px] leading-5 text-zinc-400"
      style={{ top: cover.top, left: cover.left, width: cover.width, height: cover.height, background: cover.background }}
    >
      Use the arrows beside the story to move to the next one.
    </div>
  );
}

export function SocialOverlay({ ui }: { ui: SocialUi }) {
  const blockedAt = useStore(ui.store, (s) => s.scrollBlockedAt);
  return (
    <div className="pointer-events-none fixed inset-0 z-[2147483000] font-sans">
      <Cover ui={ui} />
      <Notice ui={ui} />
      <ScrollToast blockedAt={blockedAt} />
    </div>
  );
}
