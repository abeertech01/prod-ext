import { Card, NumberField, Toggle } from '@/ui/components/controls';
import type { SectionProps } from '../App';

export function FilteringSection({ settings, update }: SectionProps) {
  const f = settings.filter;
  const setFilter = (patch: Partial<typeof f>) => update((s) => ({ ...s, filter: { ...s.filter, ...patch } }));
  return (
    <>
      <Card
        title="Suggested videos"
        description="Filters the home feed and the sidebar next to a video, for long videos and Shorts. Search results are never filtered. Trusted channels are shown first; everything else must pass your keywords."
      >
        <Toggle label="Filter suggested videos" checked={f.enabled} onChange={(enabled) => setFilter({ enabled })} />
        <Toggle
          label="Offer “show” for distracting videos"
          description="Hidden videos are removed from the grid and counted in one line above it. Turn this off to hide the reveal link for videos caught by the distraction key; the count for other filtered videos is always shown."
          checked={f.showDistractionReveal}
          onChange={(showDistractionReveal) => setFilter({ showDistractionReveal })}
          disabled={!f.enabled}
        />
      </Card>

      <Card title="Feed limits">
        <Toggle
          label="Turn off autoplay"
          description="No hover previews on the home feed, and the next video doesn't start by itself when one ends."
          checked={f.autoplayDisabled}
          onChange={(autoplayDisabled) => setFilter({ autoplayDisabled })}
        />
        <Toggle
          label="Hide sidebar suggestions while watching"
          description="Also hides the suggestion grid at the end of a video. When shown, the sidebar is filtered like the home feed."
          checked={f.sidebarHidden}
          onChange={(sidebarHidden) => setFilter({ sidebarHidden })}
        />
        <Toggle
          label="Turn off infinite scroll on the home feed"
          description="The home feed loads one batch of videos. To see more, you click “Load more”, a limited number of times per visit."
          checked={f.homeCapEnabled}
          onChange={(homeCapEnabled) => setFilter({ homeCapEnabled })}
        />
        <NumberField
          label="Videos per batch"
          value={f.homeCap}
          onChange={(homeCap) => setFilter({ homeCap })}
          min={4}
          max={200}
          suffix="videos"
          disabled={!f.homeCapEnabled}
        />
        <NumberField
          label="“Load more” clicks per visit"
          description="Counted again each time you open the home page. 0 means the first batch is all you get."
          value={f.homeLoadMore}
          onChange={(homeLoadMore) => setFilter({ homeLoadMore })}
          min={0}
          max={10}
          disabled={!f.homeCapEnabled}
        />
      </Card>
    </>
  );
}
