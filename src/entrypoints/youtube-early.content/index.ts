import { defineContentScript } from '#imports';
import { getSettings } from '@/core/settings/storage';
import { startHomeOffEarly } from '@/platforms/youtube/homeOff';

/**
 * Starts the moment a YouTube page begins loading, before YouTube draws its
 * home feed. When the home page is turned off ("Nothing"), it hides the feed
 * so the videos never show, not even for a moment.
 */
export default defineContentScript({
  matches: ['*://www.youtube.com/*'],
  runAt: 'document_start',
  main() {
    startHomeOffEarly(async () => {
      const settings = await getSettings();
      return settings.platforms.youtube && settings.bookmarks.homeMode === 'off';
    });
  },
});
