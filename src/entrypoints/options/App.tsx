import { useEffect, useState } from 'react';
import type { Settings } from '@/core/settings/schema';
import { useSettings } from '@/ui/hooks/useStorage';
import { BookmarksSection } from './sections/Bookmarks';
import { ChannelsSection } from './sections/Channels';
import { FacebookSection } from './sections/Facebook';
import { FilteringSection } from './sections/Filtering';
import { HomePageSection } from './sections/HomePage';
import { InstagramSection } from './sections/Instagram';
import { KeywordsSection } from './sections/Keywords';
import { ShortsSection } from './sections/Shorts';

export interface SectionProps {
  settings: Settings;
  update: (fn: (s: Settings) => Settings) => void;
}

/** The sidebar, grouped by site, so it's clear which site each page is about. */
const GROUPS = [
  {
    site: 'YouTube',
    sections: [
      { id: 'shorts', label: 'Shorts', Component: ShortsSection },
      { id: 'home', label: 'Home page', Component: HomePageSection },
      { id: 'filtering', label: 'Video filtering', Component: FilteringSection },
      { id: 'keywords', label: 'Keywords', Component: KeywordsSection },
      { id: 'channels', label: 'Trusted channels', Component: ChannelsSection },
      { id: 'bookmarks', label: 'Bookmarks', Component: BookmarksSection },
    ],
  },
  { site: 'Facebook', sections: [{ id: 'facebook', label: 'Feed, stories & Reels', Component: FacebookSection }] },
  { site: 'Instagram', sections: [{ id: 'instagram', label: 'Feed, stories & Reels', Component: InstagramSection }] },
] as const;

const SECTIONS = GROUPS.flatMap((g) => g.sections.map((s) => ({ ...s, site: g.site })));
const FIRST = SECTIONS[0]!;

function readHash() {
  const id = location.hash.slice(1);
  return SECTIONS.some((s) => s.id === id) ? id : FIRST.id;
}

export function App() {
  const [settings, update] = useSettings();
  const [active, setActive] = useState(readHash);
  useEffect(() => {
    const onHash = () => setActive(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const section = SECTIONS.find((s) => s.id === active) ?? FIRST;

  return (
    <div className="mx-auto flex min-h-screen max-w-[980px] flex-col gap-6 px-4 py-8 font-sans text-zinc-900 md:flex-row dark:text-zinc-100">
      <nav className="md:w-[200px] md:shrink-0" aria-label="Settings sections">
        <div className="mb-4 px-3">
          <div className="text-[18px] font-semibold">Focus Filter</div>
          <div className="text-[12px] text-zinc-500">Settings save automatically</div>
        </div>
        <div className="flex flex-col gap-4">
          {GROUPS.map((g) => (
            <div key={g.site}>
              <div className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{g.site}</div>
              <ul className="flex flex-wrap gap-1 md:flex-col">
                {g.sections.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      aria-current={s.id === section.id ? 'page' : undefined}
                      className={`block rounded-lg px-3 py-2 text-[14px] font-medium ${
                        s.id === section.id ? 'bg-teal-600 text-white' : 'text-zinc-600 hover:bg-zinc-200/70 dark:text-zinc-300 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>
      <main className="min-w-0 flex-1">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500">{section.site}</div>
        <h1 className="mb-4 text-[22px] font-semibold">{section.label}</h1>
        {settings ? <section.Component settings={settings} update={update} /> : null}
      </main>
    </div>
  );
}
