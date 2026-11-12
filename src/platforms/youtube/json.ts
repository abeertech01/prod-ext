/**
 * Extract the JSON object literal that follows `marker` in an HTML page
 * (e.g. `var ytInitialData = {...};`). Brace-matches while respecting strings.
 */
export function extractJsonAfter(html: string, marker: string): any | null {
  const at = html.indexOf(marker);
  if (at === -1) return null;
  const start = html.indexOf('{', at + marker.length);
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (ch === '\\') i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) {
      try {
        return JSON.parse(html.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Depth-first visit of every object in a JSON tree. */
export function walkJson(node: unknown, visit: (obj: Record<string, any>) => void): void {
  if (Array.isArray(node)) node.forEach((child) => walkJson(child, visit));
  else if (node && typeof node === 'object') {
    visit(node as Record<string, any>);
    Object.values(node).forEach((child) => walkJson(child, visit));
  }
}
