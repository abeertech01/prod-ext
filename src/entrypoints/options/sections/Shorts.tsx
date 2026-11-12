import { Card, Notice, NumberField, Toggle } from '@/ui/components/controls';
import { SHORTS_WARNING } from '@/ui/content/copy';
import type { SectionProps } from '../App';

export function ShortsSection({ settings, update }: SectionProps) {
  const setShorts = (patch: Partial<typeof settings.shorts>) => update((s) => ({ ...s, shorts: { ...s.shorts, ...patch } }));
  return (
    <Card title="Shorts" description="Open a Short from search, home or the sidebar, and you can watch it. Scrolling to the next one is turned off.">
      <Toggle label="Block scrolling to the next Short" checked={settings.shorts.blockScrolling} onChange={(blockScrolling) => setShorts({ blockScrolling })} />
      <NumberField
        label="Shorts allowed after the first"
        description="How many times you can scroll on before scrolling stops."
        value={settings.shorts.allowedScrolls}
        onChange={(allowedScrolls) => setShorts({ allowedScrolls })}
        min={0}
        max={50}
      />
      <Notice tone="warn">{SHORTS_WARNING} {settings.shorts.allowedScrolls > 0 && 'Keep this number small.'}</Notice>
    </Card>
  );
}
