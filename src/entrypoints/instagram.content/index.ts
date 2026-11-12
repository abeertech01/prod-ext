import '@/assets/tailwind.css';
import { defineContentScript } from '#imports';
import { instagramAdapter } from '@/platforms/instagram';

export default defineContentScript({
  matches: ['*://www.instagram.com/*'],
  runAt: 'document_idle',
  // Bundle this entry's CSS into each shadow-root UI instead of the page.
  cssInjectionMode: 'ui',
  async main(ctx) {
    await instagramAdapter.start(ctx);
  },
});
