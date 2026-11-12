import { ALWAYS_VETO_RULES } from '../constants';
import type { Settings } from '../settings/schema';
import { compileRules, firstMatch, vocabulary, type CompiledRule } from './rules';
import { containsPhrase, tokenize, tokenizeList } from './text';

export interface CompiledFilter {
  enabled: boolean;
  /** Key 1 + Key 2 rules (whichever are enabled). */
  inclusion: CompiledRule[];
  /** Key 4, only when Key 1 and/or Key 2 is enabled. */
  selfHelp: CompiledRule[];
  /** Words a self-help match must pair with: every Key 1/2 phrase. */
  pairVocabulary: string[][];
  /** Key 3. */
  distraction: CompiledRule[];
  alwaysVeto: CompiledRule[];
}

export function compileFilter(filter: Settings['filter']): CompiledFilter {
  const { business, tech, distraction, selfHelp } = filter.keys;
  const inclusion = [
    ...(business.enabled ? compileRules(business.rules) : []),
    ...(tech.enabled ? compileRules(tech.rules) : []),
  ];
  const inclusionOn = business.enabled || tech.enabled;
  return {
    enabled: filter.enabled,
    inclusion,
    selfHelp: inclusionOn && selfHelp.enabled ? compileRules(selfHelp.rules) : [],
    pairVocabulary: vocabulary(inclusion),
    distraction: distraction.enabled ? compileRules(distraction.rules) : [],
    alwaysVeto: compileRules(ALWAYS_VETO_RULES),
  };
}

export interface VideoText {
  title: string;
  description?: string;
  tags?: string[];
}

/** `no-match` = failed Keys 1/2/4; `distraction`/`safety` = vetoed by Key 3. */
export type HideReason = 'no-match' | 'distraction' | 'safety';

export type FilterDecision =
  | { verdict: 'show'; reason: 'filter-off' | 'allow-listed' | 'included' | 'no-inclusion-keys' }
  | { verdict: 'hide'; reason: HideReason; rule?: string }
  /** The title alone can't decide; fetch description and tags, then decide at `full`. */
  | { verdict: 'undecided' };

/**
 * `title` stage looks at the title only and may return `undecided`.
 * `full` stage also looks at description and tags and always decides.
 */
export type FilterStage = 'title' | 'full';

function fieldsFor(video: VideoText, stage: FilterStage): string[][] {
  const fields = [tokenize(video.title)];
  if (stage === 'full') {
    if (video.description) fields.push(tokenize(video.description));
    if (video.tags?.length) fields.push(tokenizeList(video.tags));
  }
  return fields;
}

function matchAny(fields: string[][], rules: CompiledRule[]): CompiledRule | undefined {
  for (const tokens of fields) {
    const rule = firstMatch(tokens, rules);
    if (rule) return rule;
  }
  return undefined;
}

function selfHelpPairs(fields: string[][], f: CompiledFilter): boolean {
  return fields.some(
    (tokens) =>
      firstMatch(tokens, f.selfHelp) !== undefined &&
      f.pairVocabulary.some((phrase) => containsPhrase(tokens, phrase)),
  );
}

export function decide(video: VideoText, allowListed: boolean, f: CompiledFilter, stage: FilterStage): FilterDecision {
  if (!f.enabled) return { verdict: 'show', reason: 'filter-off' };

  // Allow-listed channels skip keyword checks, except the safety veto. The
  // title is all we look at for them, so they're always decided at `title`.
  const titleFields = fieldsFor(video, 'title');
  const safety = matchAny(allowListed ? titleFields : fieldsFor(video, stage), f.alwaysVeto);
  if (safety) return { verdict: 'hide', reason: 'safety', rule: safety.source };
  if (allowListed) return { verdict: 'show', reason: 'allow-listed' };

  const fields = fieldsFor(video, stage);
  const vetoed = matchAny(fields, f.distraction);
  if (vetoed) return { verdict: 'hide', reason: 'distraction', rule: vetoed.source };

  if (f.inclusion.length === 0) {
    // Key 3 only (or nothing): no inclusion requirement.
    return { verdict: 'show', reason: 'no-inclusion-keys' };
  }

  if (matchAny(fields, f.inclusion) || selfHelpPairs(fields, f)) {
    return { verdict: 'show', reason: 'included' };
  }

  return stage === 'title' ? { verdict: 'undecided' } : { verdict: 'hide', reason: 'no-match' };
}

/** Whether `decide` might ever need description/tags for this filter. */
export function needsFullText(f: CompiledFilter): boolean {
  return f.enabled && f.inclusion.length > 0;
}
