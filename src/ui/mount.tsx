import { createShadowRootUi, type ContentScriptContext } from '#imports';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactElement } from 'react';

/** Render a React element into its own shadow root on the page. `auto` re-mounts whenever `anchor` appears. */
export async function mountReact(
  ctx: ContentScriptContext,
  name: string,
  element: ReactElement,
  anchor: string,
  append: 'first' | 'last' | 'before' | 'after',
  auto: boolean,
): Promise<void> {
  const ui = await createShadowRootUi<Root>(ctx, {
    name,
    position: 'inline',
    anchor,
    append,
    // Keep keystrokes in our inputs from triggering the site's shortcuts.
    isolateEvents: true,
    onMount(container) {
      const root = createRoot(container);
      root.render(element);
      return root;
    },
    onRemove(root) {
      root?.unmount();
    },
  });
  if (auto) ui.autoMount();
  else ui.mount();
}
