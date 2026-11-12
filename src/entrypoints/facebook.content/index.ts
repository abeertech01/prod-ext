import '@/assets/tailwind.css';
import { defineContentScript } from '#imports';
import { facebookAdapter } from '@/platforms/facebook';

export default defineContentScript({
  matches: ['*://www.facebook.com/*', '*://web.facebook.com/*'],
  runAt: 'document_idle',
  // Bundle this entry's CSS into each shadow-root UI instead of the page.
  cssInjectionMode: 'ui',
  async main(ctx) {
    await facebookAdapter.start(ctx);
  },
});
