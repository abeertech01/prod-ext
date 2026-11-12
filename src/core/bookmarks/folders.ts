/** The shape of `browser.bookmarks.getTree()` nodes that we use. */
export interface BookmarkNode {
  id: string;
  title: string;
  url?: string;
  children?: BookmarkNode[];
}

export interface BookmarkFolder {
  id: string;
  title: string;
  /** Parent folders, outermost first, e.g. "Bookmarks bar / Learning". Empty at the top level. */
  parentPath: string;
}

/** Every folder in the tree, depth-first. The untitled root node itself is skipped. */
export function listFolders(tree: BookmarkNode[]): BookmarkFolder[] {
  const out: BookmarkFolder[] = [];
  const walk = (nodes: BookmarkNode[], parents: string[]) => {
    for (const node of nodes) {
      if (node.url !== undefined || !node.children) continue;
      const isRoot = parents.length === 0 && !node.title;
      if (!isRoot) out.push({ id: node.id, title: node.title || 'Untitled folder', parentPath: parents.join(' / ') });
      walk(node.children, isRoot ? parents : [...parents, node.title || 'Untitled folder']);
    }
  };
  walk(tree, []);
  return out;
}

/** The chosen folders, in the order chosen. Folders deleted since are left out. */
export function pickFolders(all: BookmarkFolder[], ids: string[]): BookmarkFolder[] {
  const byId = new Map(all.map((f) => [f.id, f]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

/** Case-insensitive match on the folder name or its parent path. */
export function searchFolders(all: BookmarkFolder[], query: string): BookmarkFolder[] {
  const q = query.trim().toLowerCase();
  if (!q) return all;
  return all.filter((f) => f.title.toLowerCase().includes(q) || f.parentPath.toLowerCase().includes(q));
}
