import { useEffect, useState, type FormEvent } from 'react';
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

/**
 * "New folder": a name and where to put it. The folder is created in the browser's
 * bookmarks; `onCreated` then chooses it as a YouTube folder.
 */
function NewFolder({ all, onCreated }: { all: BookmarkFolder[]; onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  // The Bookmarks bar (the first top-level folder) by default.
  const [parentId, setParentId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const parent = parentId || all.find((f) => !f.parentPath)?.id || '';

  const reset = () => {
    setOpen(false);
    setName('');
    setParentId('');
    setError(null);
  };

  async function create(e: FormEvent) {
    e.preventDefault();
    const title = name.trim();
    if (!title) return setError('Give the folder a name.');
    setBusy(true);
    try {
      const folder = await browser.bookmarks.create({ parentId: parent, title });
      onCreated(folder.id);
      reset();
    } catch {
      setError("The folder couldn't be created there. Try another place.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="py-3">
        <Button variant="secondary" onClick={() => setOpen(true)}>
          New folder
        </Button>
      </div>
    );
  }
  return (
    <form onSubmit={(e) => void create(e)} className="space-y-2 py-3">
      <div className="flex flex-wrap gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Folder name"
          aria-label="New folder name"
          className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-[14px] dark:border-zinc-600 dark:bg-zinc-900"
        />
        <select
          value={parent}
          onChange={(e) => setParentId(e.target.value)}
          aria-label="Put the new folder in"
          className="min-w-0 max-w-[260px] rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-[14px] dark:border-zinc-600 dark:bg-zinc-900"
        >
          {all.map((f) => (
            <option key={f.id} value={f.id}>
              {f.parentPath ? `${f.parentPath} / ${f.title}` : f.title}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-[13px] text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          Create folder
        </Button>
        <Button variant="secondary" onClick={reset}>
          Cancel
        </Button>
      </div>
    </form>
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
            {all && (
              <NewFolder
                all={all}
                onCreated={(id) => update((s) => ({ ...s, bookmarks: { ...s.bookmarks, folderIds: [...s.bookmarks.folderIds, id] } }))}
              />
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
