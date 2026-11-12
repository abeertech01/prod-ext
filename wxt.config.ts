import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  // `pnpm dev` opens Chrome with a profile kept in .wxt/, so YouTube sign-in
  // and extension settings survive between dev sessions.
  webExt: {
    chromiumArgs: ['--user-data-dir=./.wxt/chrome-data'],
    startUrls: ['https://www.youtube.com/'],
  },
  manifest: ({ browser }) => ({
    name: 'Focus Filter',
    description:
      'Use social media on your terms: filter distracting videos, stop endless Shorts and Reels, and limit the Facebook and Instagram feeds.',
    permissions: ['storage', 'bookmarks'],
    host_permissions: ['*://www.youtube.com/*', '*://www.facebook.com/*', '*://web.facebook.com/*', '*://www.instagram.com/*'],
    action: { default_title: 'Focus Filter' },
    ...(browser === 'firefox' && {
      browser_specific_settings: {
        gecko: {
          // Replace with your own ID before publishing to addons.mozilla.org.
          id: 'focus-filter@extension.local',
          // Nothing about the user leaves the browser.
          data_collection_permissions: { required: ['none'] },
        },
      },
    }),
  }),
});
