import { DEFAULT_SETTINGS } from './defaults';
import type { Settings } from './schema';

type Plain = Record<string, unknown>;

function isPlainObject(value: unknown): value is Plain {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Fill any keys missing from `stored` with defaults. Arrays and primitives in
 * `stored` win as-is, so user-edited lists are never merged with defaults.
 */
export function deepMerge<T>(defaults: T, stored: unknown): T {
  if (!isPlainObject(defaults) || !isPlainObject(stored)) {
    return (stored === undefined || stored === null ? defaults : stored) as T;
  }
  const out: Plain = { ...defaults };
  for (const [key, value] of Object.entries(stored)) {
    out[key] = key in defaults ? deepMerge((defaults as Plain)[key], value) : value;
  }
  return out as T;
}

export function withDefaults(stored: unknown): Settings {
  return deepMerge(DEFAULT_SETTINGS, stored);
}
