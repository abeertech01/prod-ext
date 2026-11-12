import type { StoriesSetting } from '@/core/social/daily';
import { Card, NumberField } from '@/ui/components/controls';

/** Stories: limited to N people a day, hidden, or no limit. */
export function StoriesCard({
  site,
  value,
  onChange,
  hiddenDescription = 'The Stories section is removed.',
}: {
  site: string;
  value: StoriesSetting;
  onChange: (next: StoriesSetting) => void;
  hiddenDescription?: string;
}) {
  const modes: { mode: StoriesSetting['mode']; label: string; description: string }[] = [
    { mode: 'limited', label: 'Limited', description: 'Stories from a set number of people per day.' },
    { mode: 'hidden', label: 'Hidden', description: hiddenDescription },
    { mode: 'unlimited', label: 'No limit', description: `Stories work as ${site} normally does.` },
  ];
  const name = `stories-mode-${site.toLowerCase()}`;
  return (
    <Card title="Stories" description="Counted by person: all of one person's stories use one of the day's slots. Resets at midnight.">
      <div role="radiogroup" aria-label="Stories" className="py-2">
        {modes.map((m) => (
          <label key={m.mode} className="flex cursor-pointer items-start gap-3 py-2">
            <input type="radio" name={name} checked={value.mode === m.mode} onChange={() => onChange({ ...value, mode: m.mode })} className="mt-1 accent-teal-600" />
            <span>
              <span className="block text-[14px] font-medium text-zinc-900 dark:text-zinc-100">{m.label}</span>
              <span className="block text-[13px] text-zinc-500 dark:text-zinc-400">{m.description}</span>
            </span>
          </label>
        ))}
      </div>
      <NumberField
        label="People per day"
        value={value.profilesPerDay}
        onChange={(profilesPerDay) => onChange({ ...value, profilesPerDay })}
        min={1}
        max={999}
        suffix="people"
        disabled={value.mode !== 'limited'}
      />
    </Card>
  );
}
