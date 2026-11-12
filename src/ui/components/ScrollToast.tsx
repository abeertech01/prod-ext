import { useEffect, useState } from 'react';

/** How long the toast stays after the last blocked scroll. */
const TOAST_MS = 1_800;

/** The logo's ring-and-dot mark, in the current text color. */
function LogoMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="3.5" />
      <circle cx="12" cy="12" r="3.5" fill="currentColor" />
    </svg>
  );
}

/** "Scrolling is disabled", shown for a moment each time a blocked scroll happens (`blockedAt`). */
export function ScrollToast({ blockedAt }: { blockedAt: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!blockedAt) return;
    setVisible(true);
    const id = window.setTimeout(() => setVisible(false), TOAST_MS);
    return () => window.clearTimeout(id);
  }, [blockedAt]);
  if (!visible) return null;
  return (
    <div role="status" className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-rose-600 py-2 pl-3 pr-4 text-[14px] font-semibold text-white shadow-lg">
      <LogoMark />
      Scrolling is disabled
    </div>
  );
}

/** A full-screen notice that holds the page until the user leaves (Shorts or Reels past the limit, stories over the limit). */
export function BlockingNotice({ title, body, action, onAction }: { title: string; body: string; action: string; onAction: () => void }) {
  return (
    <div className="pointer-events-auto fixed inset-0 flex items-center justify-center bg-black/75 p-4">
      <div className="max-w-[420px] rounded-2xl bg-white p-6 text-center text-zinc-800 shadow-2xl dark:bg-zinc-900 dark:text-zinc-100">
        <h2 className="mb-2 text-[20px] font-semibold">{title}</h2>
        <p className="mb-4 text-[14px] leading-6 text-zinc-600 dark:text-zinc-300">{body}</p>
        <button type="button" onClick={onAction} className="rounded-lg bg-teal-600 px-4 py-2 text-[14px] font-semibold text-white hover:bg-teal-700">
          {action}
        </button>
      </div>
    </div>
  );
}
