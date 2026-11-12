import { BlockingNotice, ScrollToast } from '../components/ScrollToast';
import { useStore } from '../store';
import { BookmarkMenu } from './BookmarkMenu';
import { SHORTS_WARNING } from './copy';
import { overlay, overlayActions } from './state';

function ShortsNotice() {
  const shorts = useStore(overlay, (s) => s.shorts);
  const blockedAt = useStore(overlay, (s) => s.shortsBlockedAt);
  if (!shorts) return null;
  if (shorts.overLimit) {
    return (
      <BlockingNotice
        title="Shorts scrolling is off"
        body={`You've watched the Shorts you allowed yourself. ${SHORTS_WARNING}`}
        action="Leave Shorts"
        onAction={() => overlayActions.leaveShorts()}
      />
    );
  }
  return <ScrollToast blockedAt={blockedAt} />;
}

function TrustToast() {
  const trust = useStore(overlay, (s) => s.trust);
  if (!trust) return null;
  return (
    <div className="pointer-events-auto fixed bottom-14 left-3 flex max-w-[360px] items-center gap-3 rounded-xl bg-zinc-900 px-4 py-3 text-[13px] text-white shadow-2xl">
      <span className="flex-1">
        Enjoying <strong>{trust.channel.name}</strong>? Trusted channels skip the keyword filter.
      </span>
      <button type="button" onClick={() => overlayActions.trustChannel(trust.channel)} className="whitespace-nowrap rounded-lg bg-teal-500 px-3 py-1.5 font-semibold text-zinc-900 hover:bg-teal-400">
        Trust channel
      </button>
      <button type="button" onClick={() => overlayActions.dismissTrust()} aria-label="Dismiss" className="px-1 text-[16px] opacity-70 hover:opacity-100">
        ×
      </button>
    </div>
  );
}

export function Overlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[2147483000] font-sans">
      <ShortsNotice />
      <TrustToast />
      <BookmarkMenu />
    </div>
  );
}
