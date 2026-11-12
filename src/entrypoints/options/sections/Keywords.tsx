import { useEffect, useState } from 'react';
import { validateRule } from '@/core/filter/rules';
import { DEFAULT_SETTINGS } from '@/core/settings/defaults';
import type { FilterKeyId } from '@/core/settings/schema';
import { Button, Card, Notice, Toggle } from '@/ui/components/controls';
import type { SectionProps } from '../App';

const KEYS: { id: FilterKeyId; title: string; description: string }[] = [
  { id: 'business', title: 'Key 1 · Business', description: 'Shows videos that match.' },
  { id: 'tech', title: 'Key 2 · Tech industry', description: 'Shows videos that match.' },
  {
    id: 'distraction',
    title: 'Key 3 · Distraction',
    description: 'Hides videos that match, even if another key matched. Trusted channels skip this list, except “gone sexual”, which is always hidden.',
  },
  {
    id: 'selfHelp',
    title: 'Key 4 · Self-improvement',
    description: 'Shows a video only when one of these words appears together with a Key 1 or Key 2 word, e.g. “productivity” + “developer”. Has no effect unless Key 1 or Key 2 is on.',
  },
];

function toLines(text: string): string[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean);
}

function KeyEditor({ id, title, description, settings, update }: (typeof KEYS)[number] & SectionProps) {
  const key = settings.filter.keys[id];
  const [draft, setDraft] = useState(key.rules.join('\n'));
  useEffect(() => setDraft(key.rules.join('\n')), [key.rules]);
  const invalid = toLines(draft).filter((line) => validateRule(line));
  const setKey = (patch: Partial<typeof key>) =>
    update((s) => ({ ...s, filter: { ...s.filter, keys: { ...s.filter.keys, [id]: { ...s.filter.keys[id], ...patch } } } }));
  const inactive = id === 'selfHelp' && !settings.filter.keys.business.enabled && !settings.filter.keys.tech.enabled;

  return (
    <Card title={title} description={description}>
      <Toggle label="Enabled" checked={key.enabled} onChange={(enabled) => setKey({ enabled })} />
      {key.enabled && inactive && <Notice tone="warn">Turn on Key 1 or Key 2 for this key to do anything.</Notice>}
      <div className="py-3">
        <textarea
          aria-label={`${title} rules, one per line`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => setKey({ rules: toLines(draft) })}
          rows={8}
          spellCheck={false}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-[13px] leading-5 dark:border-zinc-600 dark:bg-zinc-900"
        />
        {invalid.length > 0 && <p className="mt-1 text-[12px] text-rose-600">Ignored (no words to match): {invalid.join(', ')}</p>}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[12px] text-zinc-500">{toLines(draft).length} rules · saved when you click away</span>
          <Button variant="secondary" onClick={() => setKey({ rules: DEFAULT_SETTINGS.filter.keys[id].rules })}>
            Reset to defaults
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function KeywordsSection(props: SectionProps) {
  return (
    <>
      <Card title="How keywords work" description="These apply to videos from channels you haven't trusted. The title is checked first; the description and tags are only checked when the title doesn't decide.">
        <ul className="list-disc space-y-1 py-3 pl-5 text-[13px] leading-5 text-zinc-600 dark:text-zinc-300">
          <li>Key 1 and/or Key 2 on: a video shows if it matches either.</li>
          <li>Key 3 on: matching videos are hidden, overriding everything else.</li>
          <li>Only Key 3 on: everything shows except Key 3 matches.</li>
          <li>No keys on: nothing is filtered.</li>
        </ul>
        <div className="py-3 text-[13px] leading-6">
          <div className="mb-1 font-medium">One rule per line. Whole words, capital letters don't matter.</div>
          <code className="rounded bg-zinc-100 px-1.5 dark:bg-zinc-800">stock market</code> phrase ·{' '}
          <code className="rounded bg-zinc-100 px-1.5 dark:bg-zinc-800">gadget/gadgets</code> either word ·{' '}
          <code className="rounded bg-zinc-100 px-1.5 dark:bg-zinc-800">python + tutorial/code</code> both, in the same title, description or tags ·{' '}
          <code className="rounded bg-zinc-100 px-1.5 dark:bg-zinc-800">react - tutorial</code> unless that word is also there
        </div>
      </Card>
      {KEYS.map((key) => (
        <KeyEditor key={key.id} {...key} {...props} />
      ))}
    </>
  );
}
