import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { listFolders, pickFolders, searchFolders, type BookmarkFolder } from '@/core/bookmarks/folders';
import { Button, Card, Notice, Toggle } from '@/ui/components/controls';
import type { SectionProps } from '../App';

/** All bookmark folders, kept current while the page is open. `null` = no bookmarks API. */
function useBookmarkFolders(): BookmarkFolder[] | null | undefined {
  const [folders, setFolders] = useState<BookmarkFolder[] | null | undefined>(undefined);
  useEffect(() => {
    const api = browser.bookmarks;
    if (!api) return setFolders(null);
    const load = () => void api.getTree().then((tree) => setFolders(listFolders(tree)));
    load();
    const events = [api.onCreated, api.onRemoved, api.onChanged, api.onMoved];
    for (const event of events) event.addListener(load);
    return () => {
      for (const event of events) event.removeListener(load);
    };
  }, []);
  return folders;
}

function FolderLabel({ folder }: { folder: BookmarkFolder }) {
  return (
    <span className="min-w-0">
      <span className="block truncate font-medium">{folder.title}</span>
      {folder.parentPath && <span className="block truncate text-[12px] text-zinc-500">{folder.parentPath}</span>}
    </span>
  );
}

export function BookmarksSection({ settings, update }: SectionProps) {
  const all = useBookmarkFolders();
  const [query, setQuery] = useState('');
  const { enabled, folderIds } = settings.bookmarks;
  const setBookmarks = (patch: Partial<typeof settings.bookmarks>) => update((s) => ({ ...s, bookmarks: { ...s.bookmarks, ...patch } }));

  const chosen = all ? pickFolders(all, folderIds) : [];
  const chosenSet = new Set(folderIds);
  const results = all ? searchFolders(all, query) : [];
  const move = (index: number, by: -1 | 1) => {
    const ids = chosen.map((f) => f.id);
    const [id] = ids.splice(index, 1);
    ids.splice(index + by, 0, id!);
    setBookmarks({ folderIds: ids });
  };

  return (
    <>
      <Card title="Bookmark button" description="Hover a video's thumbnail and click the bookmark button to save the video to one of your YouTube folders below.">
        <Toggle label="Show the bookmark button on video thumbnails" checked={enabled} onChange={(on) => setBookmarks({ enabled: on })} />
      </Card>

      {all === null ? (
        <Notice tone="warn">This browser doesn't let extensions use bookmarks, so the bookmark button isn't available here.</Notice>
      ) : (
        <>
          <Card title="Your YouTube folders" description="These folders appear when you click the bookmark button, in this order.">
            {chosen.length === 0 ? (
              <p className="py-3 text-[13px] text-zinc-500">None chosen yet. Add folders from the list below.</p>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {chosen.map((f, i) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 py-2 text-[14px]">
                    <FolderLabel folder={f} />
                    <span className="flex shrink-0 items-center gap-1">
                      <Button variant="secondary" onClick={() => move(i, -1)} disabled={i === 0}>
                        ↑<span className="sr-only">Move up</span>
                      </Button>
                      <Button variant="secondary" onClick={() => move(i, 1)} disabled={i === chosen.length - 1}>
                        ↓<span className="sr-only">Move down</span>
                      </Button>
                      <Button variant="danger" onClick={() => setBookmarks({ folderIds: folderIds.filter((id) => id !== f.id) })}>
                        Remove
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="All bookmark folders" description={all ? `${all.length} folders in this browser. Add the ones you save YouTube videos to.` : 'Loading…'}>
            <div className="py-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search folders"
                aria-label="Search bookmark folders"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-[14px] dark:border-zinc-600 dark:bg-zinc-900"
              />
            </div>
            {all && results.length === 0 && <p className="pb-3 text-[13px] text-zinc-500">No folders match “{query}”.</p>}
            <ul className="max-h-[420px] divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
              {results.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 py-2 text-[14px]">
                  <FolderLabel folder={f} />
                  {chosenSet.has(f.id) ? (
                    <span className="shrink-0 px-3 text-[13px] text-zinc-500">Added</span>
                  ) : (
                    <Button variant="secondary" onClick={() => setBookmarks({ folderIds: [...folderIds.filter((id) => all?.some((a) => a.id === id)), f.id] })}>
                      Add
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  );
}
