import '@/assets/tailwind.css';
import { defineContentScript } from '#imports';
import { startIfOn } from '@/core/platform/switch';
import { endSkeleton, setSkeletonAllowed } from '@/platforms/facebook/skeleton';
import { facebookAdapter } from '@/platforms/facebook';

export default defineContentScript({
  matches: ['*://www.facebook.com/*', '*://web.facebook.com/*'],
  runAt: 'document_idle',
  // Bundle this entry's CSS into each shadow-root UI instead of the page.
  cssInjectionMode: 'ui',
  async main(ctx) {
    await startIfOn(
      ctx,
      'facebook',
      () => {
        setSkeletonAllowed(true);
        return facebookAdapter.start(ctx);
      },
      // Facebook is switched off: take the loading skeleton down, and don't put it up next time.
      () => {
        setSkeletonAllowed(false);
        endSkeleton();
      },
    );
  },
});
