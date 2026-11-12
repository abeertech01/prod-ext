import type { ContentScriptContext } from '#imports';

/**
 * One adapter per site. Core modules (filter engine, settings) know nothing about any site; adapters translate a site's DOM into
 * calls on them. Adding a platform = adding an adapter, core unchanged.
 */
export interface PlatformAdapter {
  id: string;
  /** Start everything for this page; cleanup is tied to `ctx` invalidation. */
  start(ctx: ContentScriptContext): void | Promise<void>;
}
