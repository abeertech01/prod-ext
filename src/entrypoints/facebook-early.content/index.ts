import { defineContentScript } from '#imports';
import { startSkeleton } from '@/platforms/facebook/skeleton';

/**
 * Starts the moment a Facebook page begins loading, before Facebook draws its
 * first posts. It only puts up the home feed's loading skeleton; the main
 * Facebook script takes it down once the posts are covered.
 */
export default defineContentScript({
  matches: ['*://www.facebook.com/*', '*://web.facebook.com/*'],
  runAt: 'document_start',
  main() {
    startSkeleton();
  },
});
