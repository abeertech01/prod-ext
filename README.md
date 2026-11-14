# Focus Filter

A browser extension that helps you use social media on your own terms. It filters distracting YouTube videos, stops endless Shorts and Reels, limits the Instagram feed and Facebook stories. YouTube, Facebook and Instagram are supported.

## Getting started

```bash
pnpm install
pnpm dev            # Opens Chrome (profile kept in .wxt/chrome-data) with hot reload
pnpm dev:firefox    # Firefox
pnpm test           # Vitest (core logic)
pnpm compile        # Type-check
pnpm build          # → .output/chrome-mv3   (also build:firefox, build:edge, build:safari)
pnpm zip            # Store-ready zip
```

To run hot reload in your everyday Chrome instead, add a `web-ext.config.ts` containing `export default defineWebExtConfig({ disabled: true })` (imported from `wxt`). Then load `.output/chrome-mv3-dev` unpacked while `pnpm dev` is running.

To load a build by hand, open `chrome://extensions`, turn on Developer mode, click **Load unpacked**, and pick `.output/chrome-mv3`.

For Safari, `pnpm build:safari` produces the web extension. You then wrap it in an app with `xcrun safari-web-extension-converter .output/safari-mv2`.

## Architecture

```
src/
  core/                 Platform-agnostic. No DOM, no site knowledge.
    filter/             Tokenizer, rule language, allow-list, decision engine
    settings/           Schema, defaults, versioned storage items
    messaging/          Typed protocol (@webext-core/messaging)
    platform/adapter.ts The interface every site adapter implements
  platforms/youtube/    The YouTube adapter
    selectors.ts        Every YouTube DOM selector. Fix this file first when YouTube changes
  platforms/social/     Shared code: daily allowance context and playback lock (both sites); Reels lock and autoplay rules (both sites); stories limit (Instagram for now)
  platforms/facebook/   The Facebook adapter
    selectors.ts        Every Facebook English label. Fix this file first when Facebook changes
  ui/                   React components (Shadow DOM overlay, popup, settings)
  platforms/instagram/  The Instagram adapter (selectors.ts holds every selector and label)
  entrypoints/          background, youtube.content, facebook.content, instagram.content, popup, options
```

- **Adding a platform** means adding `platforms/<site>/` and a content-script entrypoint. Core doesn't change.
- **Background** relays "Sync now" from settings to an open YouTube tab, and opens settings on install.
- **Storage** items are versioned (`version` + `migrations` in `core/settings/storage.ts`). Stored settings are deep-merged over defaults, so new settings keys need no migration.
- **Injected UI** (the hidden-videos row, the Load more card, toasts) renders in Shadow DOM with `isolateEvents`, so its events never reach YouTube's keyboard shortcuts. Tailwind v3 is used instead of v4 for two reasons. v4's `@property`-based utilities don't work inside shadow roots. And a PostCSS step converts `rem` to `px`, because YouTube sets `html { font-size: 10px }`.

## How the features work

| Feature | Notes |
|---|---|
| **Shorts** | The first Short in a session (opened from search, home, the sidebar, or a link) plays. Wheel, touch, arrow keys, and the up/down buttons are blocked after `allowedScrolls` more (default 0). If one still gets through, it's paused behind a notice. No text is shown on Shorts until you try to scroll past the limit; then a rose "Scrolling is disabled" toast with the logo in white appears for about 2 seconds. |
| **Filtering** | Covers the home feed and the watch-page sidebar. Search is never filtered. Allow-listed channels go first. Every other video goes through the keyword engine: the title is checked first, and description and tags are fetched only when the title doesn't decide. Hidden videos are removed from the grid entirely, with one "N videos hidden by filter — show" line above it. A reveal lasts only for the tab session. |
| **Allow-list** | Subscriptions are synced from `youtube.com/feed/channels` once a day, or with "Sync now" in settings. Manual entries can be a handle, a URL, or a channel ID. A "Trust channel" toast appears after you like a video, or watch half of it, from an untrusted channel whose video passed the keyword filter. |
| **Rule syntax** | One rule per line, whole words, case-insensitive. `a/b` means either word. `a + b` means both words in the same field. `a - b` means a, but not when b is also present. |
| **Home feed** | No infinite scroll. The feed loads one batch (24 videos that pass the filter), then shows a **Load more · N left** button. Each click loads one more batch, up to 2 clicks per visit to the home page (both numbers are in settings). A batch also ends after looking through 3× its size in suggestions, or when YouTube runs out. The feed ends early if a click finds nothing new. An end card says why. A shelf whose items are all filtered out is hidden entirely. |
| **Bookmarks** | Hovering a video thumbnail (home, search, sidebar, Shorts shelves) shows a bookmark button: top-left if that corner is clear, else top-right if clear, else top center. Clicking it lists the bookmark folders chosen in Settings → Bookmarks; picking one saves the video's link there (checked folders already hold it; clicking one removes it). The background does the bookmark work, since content scripts can't use the bookmarks API. Not available in Safari. |
| **Facebook feed, stories, menus, suggested content, Reels, video** | Stories: limited to N people a day (10 by default, counted by person; people watched on an earlier visit don't reopen that day), hidden (except from someone's profile), or unlimited; stories opened from a profile always play, don't count, and lead to nobody else; the stories page's list of people is covered; the user's own story is never limited. Video, Marketplace and Gaming menu items and "Trending"/suggested-video panels are hidden. In every feed, sponsored posts, suggested posts, posts from groups, pages and people the user doesn't follow (a "Join", "Follow" or "Add friend" button in the header), suggested pages, and Reels rows that scroll sideways are hidden (a single Reel shared as a post stays); "People you may know" is hidden unless turned on, and group suggestions show unless turned off. Scrolling from an open Reel to the next one is blocked (toast + hidden next/previous buttons) unless allowed in settings; comments beside a Reel still scroll. Videos play only after a click or key press, never loop, and nothing starts by itself after a video ends; stories are left to advance normally. On the home feed, every post is covered (a loading skeleton hides the page until the covers are up); "Show post" opens one, up to 35 a day. The count shows on the covers and in the popup, survives reloads and resets at midnight; scrolling isn't limited. |
| **Instagram feed** | Sponsored posts, suggested posts (including posts with a "Follow" button and everything after "You're all caught up") and Reels rows are hidden; a Reel shared as a single post stays. "Suggested for you" account rows (feed and sidebar) are hidden unless turned on. The home feed shows 10 posts a day in batches of 5 with one "Load more"; counted separately from Facebook, and reloading doesn't reset it. |
| **Instagram Reels, Explore, stories, video** | The Explore and Reels links are hidden, and opening Explore or the Reels feed goes straight back to the home feed (search still works). Scrolling to the next Reel is blocked unless allowed in settings; comments beside a Reel still scroll. Stories: limited to N people a day (6 by default), hidden, or unlimited. Same autoplay rules as Facebook. |

## Interpretation choices

Places where the spec left room, and what I picked:

- **"react" in Key 3.** Key 3 lists `react` (as in reaction videos), and Key 2 lists React the framework. Taken literally, Key 3 would veto every React tutorial. The default Key 3 rule is therefore `react - programming/tutorial/framework/code`. The `-` operator is general, so users can write their own exceptions.
- **"gone sexual"** is hard-coded as a safety veto (`ALWAYS_VETO_RULES`). It applies even when Key 3 is off or the user deletes it from the list.
- **Plurals** listed in the spec as "(s)" are written as alternatives, e.g. `gadget/gadgets`. A few obvious plurals were added the same way, e.g. `startup/startups`.
- **Key 4 pairing** uses any Key 1/2 word, including ambiguous words like `python`. So "productivity system for python" passes when Key 4 is on.
- **"Sidebar suggestions disabled"** also hides YouTube's end-of-video suggestion grid. Creator end-screen cards stay.

## Known limits

- **Facebook** scrambles its class names, so detection relies on roles, links and English labels ("Your story", "All stories"). Stories were checked by hand on a real signed-in account.
- **Instagram** is handled the same way (tags, roles, links and English labels such as "Sponsored", "Suggested for you", "Follow"). Also tested only on a stand-in page; expect `platforms/instagram/selectors.ts` to need adjusting.

- **YouTube markup changes often.** Selectors live in `platforms/youtube/selectors.ts`, with fallbacks for older layouts. Logged-out flows were checked against live YouTube in November 2026: filtering, sidebar, autoplay, Load more, Shorts lock and toast, and the trust toast. Signed-in subscription sync was not, because it needs a real account.
- **Subscription sync** follows up to 40 pages of continuations. Very large subscription lists may be truncated.
