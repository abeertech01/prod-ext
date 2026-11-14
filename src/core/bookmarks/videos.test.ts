import { describe, expect, it } from 'vitest';
import { videoIdFromUrl } from '../../platforms/youtube/page';
import type { BookmarkNode } from './folders';
import { collectVideos, shuffle } from './videos';

// The URL parser resolves links against the page's address.
(globalThis as { location?: unknown }).location ??= { origin: 'https://www.youtube.com' };

const yt = (id: string, title = id): BookmarkNode => ({ id, title, url: `https://www.youtube.com/watch?v=${id}` });

describe('collectVideos', () => {
  const folders: BookmarkNode[] = [
    {
      id: 'a',
      title: 'Learning',
      children: [
        yt('aaaaaaaaaaa', 'React course'),
        { id: 'x', title: 'Docs', url: 'https://example.com/docs' },
        { id: 'c', title: 'A channel', url: 'https://www.youtube.com/@someone' },
        { id: 'sub', title: 'Deep', children: [yt('bbbbbbbbbbb')] },
      ],
    },
    { id: 'b', title: 'Talks', children: [yt('aaaaaaaaaaa', 'Same video again'), { id: 's', title: 'A Short', url: 'https://www.youtube.com/shorts/ccccccccccc' }] },
  ];

  it('lists each video once, with its folder, and skips other links', () => {
    const videos = collectVideos(folders, videoIdFromUrl);
    expect(videos.map((v) => [v.videoId, v.folder])).toEqual([
      ['aaaaaaaaaaa', 'Learning'],
      ['bbbbbbbbbbb', 'Learning'],
      ['ccccccccccc', 'Talks'],
    ]);
    expect(videos[0]!.title).toBe('React course');
  });

  it('returns nothing for empty folders', () => {
    expect(collectVideos([{ id: 'e', title: 'Empty', children: [] }], videoIdFromUrl)).toEqual([]);
  });
});

describe('shuffle', () => {
  it('keeps every item and leaves the input alone', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = shuffle(input);
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('reorders by the random source', () => {
    expect(shuffle([1, 2, 3], () => 0)).toEqual([2, 3, 1]);
  });
});
