import { BRAINROT_EXCEPTIONS } from './defaults';

type Stored = { filter?: { keys?: Record<string, { rules?: unknown } | undefined> } } | null | undefined;

/**
 * v1 → v2: "brainrot" no longer vetoes self-improvement videos about it, and
 * those videos now count as Key 1 matches. Only applied when the user still
 * has the original `brainrot` rule; edited lists are left as they are.
 */
export function addBrainrotExceptions<T extends Stored>(stored: T): T {
  const keys = stored?.filter?.keys;
  const distraction = keys?.distraction?.rules;
  if (!keys || !Array.isArray(distraction) || !distraction.includes('brainrot')) return stored;
  const business = keys.business?.rules;
  const include = `brainrot/brain rot + ${BRAINROT_EXCEPTIONS}`;
  return {
    ...stored,
    filter: {
      ...stored!.filter,
      keys: {
        ...keys,
        distraction: { ...keys.distraction, rules: distraction.map((r) => (r === 'brainrot' ? `brainrot/brain rot - ${BRAINROT_EXCEPTIONS}` : r)) },
        ...(Array.isArray(business) && !business.includes(include) && { business: { ...keys.business, rules: [...business, include] } }),
      },
    },
  };
}
