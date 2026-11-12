import { useEffect, useState } from 'react';
import type { Settings } from '@/core/settings/schema';
import { useSettings } from '@/ui/hooks/useStorage';
import { BookmarksSection } from './sections/Bookmarks';
import { ChannelsSection } from './sections/Channels';
import { FacebookSection } from './sections/Facebook';
import { FilteringSection } from './sections/Filtering';
import { InstagramSection } from './sections/Instagram';
import { KeywordsSection } from './sections/Keywords';
import { ShortsSection } from './sections/Shorts';

export interface SectionProps {
  settings: Settings;
  update: (fn: (s: Settings) => Settings) => void;
}

const SECTIONS = [
  { id: 'shorts', label: 'Shorts', Component: ShortsSection },
  { id: 'filtering', label: 'Filtering', Component: FilteringSection },
  { id: 'keywords', label: 'Keywords', Component: KeywordsSection },
  { id: 'channels', label: 'Trusted channels', Component: ChannelsSection },
  { id: 'bookmarks', label: 'Bookmarks', Component: BookmarksSection },
  { id: 'facebook', label: 'Facebook', Component: FacebookSection },
  { id: 'instagram', label: 'Instagram', Component: InstagramSection },
] as const;

function readHash() {
  const id = location.hash.slice(1);
  return SECTIONS.some((s) => s.id === id) ? id : SECTIONS[0].id;
}

export function App() {
  const [settings, update] = useSettings();
  const [active, setActive] = useState(readHash);
  useEffect(() => {
    const onHash = () => setActive(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const section = SECTIONS.find((s) => s.id === active) ?? SECTIONS[0];

  return (
    <div className="mx-auto flex min-h-screen max-w-[980px] flex-col gap-6 px-4 py-8 font-sans text-zinc-900 md:flex-row dark:text-zinc-100">
      <nav className="md:w-[200px] md:shrink-0" aria-label="Settings sections">
        <div className="mb-4 px-3">
          <div className="text-[18px] font-semibold">Focus Filter</div>
          <div className="text-[12px] text-zinc-500">Settings save automatically</div>
        </div>
        <ul className="flex flex-wrap gap-1 md:flex-col">
          {SECTIONS.map((s) => (
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
      </nav>
      <main className="min-w-0 flex-1">
        <h1 className="mb-4 text-[22px] font-semibold">{section.label}</h1>
        {settings ? <section.Component settings={settings} update={update} /> : null}
      </main>
    </div>
  );
}
