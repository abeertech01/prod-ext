import { useState, type ReactNode } from 'react';
import { channelKeys, parseChannelInput, sameChannel } from '@/core/filter/allowlist';
import { sendMessage, type SyncResult } from '@/core/messaging/protocol';
import type { ChannelRef } from '@/core/settings/schema';
import { Button, Card, Notice, Toggle } from '@/ui/components/controls';
import { useSubscriptions } from '@/ui/hooks/useStorage';
import type { SectionProps } from '../App';

function label(channel: Pick<ChannelRef, 'id' | 'handle' | 'name'>): string {
  return channel.name && channel.name !== channel.handle ? channel.name : channel.handle ?? channel.id ?? 'Unknown channel';
}

function ChannelRow({ channel, action }: { channel: ChannelRef; action: ReactNode }) {
  const href = channel.handle ? `https://www.youtube.com/${channel.handle}` : channel.id ? `https://www.youtube.com/channel/${channel.id}` : undefined;
  return (
    <li className="flex items-center justify-between gap-3 py-2 text-[14px]">
      <span className="min-w-0 truncate">
        <span className="font-medium">{label(channel)}</span>
        {channel.handle && channel.name !== channel.handle && <span className="ml-2 text-[12px] text-zinc-500">{channel.handle}</span>}
        {href && (
          <a href={href} target="_blank" rel="noreferrer" className="ml-2 text-[12px] text-teal-600 hover:underline">
            open
          </a>
        )}
      </span>
      {action}
    </li>
  );
}

export function ChannelsSection({ settings, update }: SectionProps) {
  const subs = useSubscriptions();
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [sync, setSync] = useState<SyncResult | 'running' | null>(null);
  const { manual, excluded } = settings.allowList;
  const excludedSet = new Set(excluded);
  const setAllowList = (patch: Partial<typeof settings.allowList>) =>
    update((s) => ({ ...s, allowList: { ...s.allowList, ...patch } }));

  const add = () => {
    const parsed = parseChannelInput(input);
    if (!parsed) return setInputError('Paste a channel link, an @handle, or a channel ID (starts with UC).');
    if (manual.some((e) => sameChannel(e, parsed))) return setInputError('Already trusted.');
    const keys = new Set(channelKeys(parsed));
    setAllowList({
      manual: [...manual, { ...parsed, name: parsed.handle ?? parsed.id ?? input, addedAt: Date.now() }],
      excluded: excluded.filter((k) => !keys.has(k)),
    });
    setInput('');
    setInputError('');
  };

  const runSync = async () => {
    setSync('running');
    try {
      setSync(await sendMessage('requestSubscriptionSync'));
    } catch (err) {
      setSync({ ok: false, error: String(err) });
    }
  };

  const subscriptions = subs?.channels ?? [];
  const isExcluded = (c: ChannelRef) => channelKeys(c).some((k) => excludedSet.has(k));
  const activeSubs = subscriptions.filter((c) => !isExcluded(c));
  const removedSubs = subscriptions.filter(isExcluded);

  return (
    <>
      <Card
        title="Trusted channels"
        description="Videos from trusted channels skip the keyword check and always show (except “gone sexual”). Everyone else goes through your keywords. You can also trust a channel from YouTube: after you like a video or watch half of it, a “Trust channel” button appears."
      >
        <form
          className="flex gap-2 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="youtube.com/@channel, @handle or UC…"
            aria-label="Channel to trust"
            className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-[14px] dark:border-zinc-600 dark:bg-zinc-900"
          />
          <Button type="submit" disabled={!input.trim()}>
            Trust
          </Button>
        </form>
        {inputError && <p className="pb-2 text-[12px] text-rose-600">{inputError}</p>}
        {manual.length === 0 ? (
          <p className="py-3 text-[13px] text-zinc-500">No channels added by hand yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {manual.map((c) => (
              <ChannelRow
                key={channelKeys(c).join('|')}
                channel={c}
                action={
                  <Button variant="danger" onClick={() => setAllowList({ manual: manual.filter((m) => m !== c) })}>
                    Remove
                  </Button>
                }
              />
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="Your subscriptions"
        description={
          subs?.syncedAt
            ? `${subscriptions.length} channels, last synced ${new Date(subs.syncedAt).toLocaleString()}. Syncs once a day while you use YouTube.`
            : "Not synced yet. Open YouTube while signed in, or sync now. With no subscriptions, every video goes through your keywords."
        }
      >
        <Toggle
          label="Trust my subscriptions"
          checked={settings.filter.useSubscriptions}
          onChange={(useSubscriptions) => update((s) => ({ ...s, filter: { ...s.filter, useSubscriptions } }))}
        />
        <div className="flex items-center gap-3 py-3">
          <Button variant="secondary" onClick={runSync} disabled={sync === 'running'}>
            {sync === 'running' ? 'Syncing…' : 'Sync now'}
          </Button>
          {sync && sync !== 'running' && (
            <span className={`text-[13px] ${sync.ok ? 'text-emerald-600' : 'text-rose-600'}`}>
              {sync.ok ? `Synced ${sync.count} channels.` : sync.error}
            </span>
          )}
        </div>
        {settings.filter.useSubscriptions && activeSubs.length > 0 && (
          <ul className="max-h-[420px] divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
            {activeSubs.map((c) => (
              <ChannelRow
                key={channelKeys(c).join('|')}
                channel={c}
                action={
                  <Button variant="danger" onClick={() => setAllowList({ excluded: [...excluded, ...channelKeys(c)] })}>
                    Don't trust
                  </Button>
                }
              />
            ))}
          </ul>
        )}
        {removedSubs.length > 0 && (
          <>
            <Notice>Subscriptions you chose not to trust. Their videos go through your keywords.</Notice>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {removedSubs.map((c) => (
                <ChannelRow
                  key={channelKeys(c).join('|')}
                  channel={c}
                  action={
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const keys = new Set(channelKeys(c));
                        setAllowList({ excluded: excluded.filter((k) => !keys.has(k)) });
                      }}
                    >
                      Trust again
                    </Button>
                  }
                />
              ))}
            </ul>
          </>
        )}
      </Card>
    </>
  );
}
