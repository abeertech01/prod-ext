import '@/assets/tailwind.css';
import { defineContentScript } from '#imports';
import { youtubeAdapter } from '@/platforms/youtube';

export default defineContentScript({
  matches: ['*://www.youtube.com/*'],
  runAt: 'document_idle',
  // Bundle this entry's CSS into each shadow-root UI instead of the page.
  cssInjectionMode: 'ui',
  async main(ctx) {
    await youtubeAdapter.start(ctx);
  },
});
