import { describe, expect, it } from 'vitest';
import { listFolders, pickFolders, searchFolders, type BookmarkNode } from './folders';

const tree: BookmarkNode[] = [
  {
    id: '0',
    title: '',
    children: [
      {
        id: '1',
        title: 'Bookmarks bar',
        children: [
          { id: '10', title: 'News site', url: 'https://example.com' },
          { id: '11', title: 'Learning', children: [{ id: '12', title: 'YouTube', children: [] }] },
        ],
      },
      { id: '2', title: 'Other bookmarks', children: [] },
    ],
  },
];

describe('bookmark folders', () => {
  it('lists folders with their parent path and skips links and the root', () => {
    expect(listFolders(tree)).toEqual([
      { id: '1', title: 'Bookmarks bar', parentPath: '' },
      { id: '11', title: 'Learning', parentPath: 'Bookmarks bar' },
      { id: '12', title: 'YouTube', parentPath: 'Bookmarks bar / Learning' },
      { id: '2', title: 'Other bookmarks', parentPath: '' },
    ]);
  });

  it('keeps the chosen order and drops deleted folders', () => {
    expect(pickFolders(listFolders(tree), ['12', 'gone', '2']).map((f) => f.id)).toEqual(['12', '2']);
  });

  it('searches names and parent paths', () => {
    const all = listFolders(tree);
    expect(searchFolders(all, 'youtube').map((f) => f.id)).toEqual(['12']);
    expect(searchFolders(all, 'learning').map((f) => f.id)).toEqual(['11', '12']);
    expect(searchFolders(all, '  ')).toHaveLength(4);
  });
});
