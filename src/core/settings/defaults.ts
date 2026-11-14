import type { Settings } from './schema';

/**
 * Rule syntax (one rule per entry, case-insensitive, whole words):
 *   `stock market`            phrase
 *   `gadget/gadgets`          any of the alternatives
 *   `software + engineer`     every `+` part must appear in the same field
 *   `react - programming`     matches only when no `-` part appears in the field
 */
/** Words that make "brainrot" a self-improvement topic rather than a distraction. */
export const BRAINROT_EXCEPTIONS = 'productivity/mindset/hustle/inspiration';

export const DEFAULT_BUSINESS_RULES = [
  'business',
  'startup/startups',
  'entrepreneur/entrepreneurs/entrepreneurship',
  'finance/financial',
  'investing',
  'investment/investments',
  'stock market',
  'economy',
  'economics',
  'marketing',
  'sales',
  'management',
  'leadership',
  'corporate',
  'strategy',
  'negotiation',
  'branding',
  'venture capital',
  'funding',
  'ipo',
  // Videos about beating brainrot (see the Key 3 rule).
  `brainrot/brain rot + ${BRAINROT_EXCEPTIONS}`,
  'saas',
  'e-commerce/ecommerce',
  'consulting',
  'real estate',
  'supply chain',
  'logistics',
  'wall street',
  'revenue',
  'profit',
  'b2b',
  'b2c',
];

const AMBIGUOUS_TECH_PAIR = 'programming/tutorial/framework/code';

export const DEFAULT_TECH_RULES = [
  'technology',
  'tech news',
  'software',
  'hardware',
  'gadget/gadgets',
  'smartphone/smartphones',
  'laptop/laptops',
  'artificial intelligence',
  'chip/chips',
  'processor/processors',
  'semiconductor/semiconductors',
  'robotics',
  'vr',
  'ar',
  'wearable/wearables',
  'smartwatch/smartwatches',
  'cybersecurity',
  'cloud computing',
  'big tech',
  'electric vehicle/electric vehicles',
  '5g',
  'gpu/gpus',
  'data center/data centers',
  'programming',
  'coding',
  'frontend',
  'backend',
  'developer/developers',
  'software + engineer/engineering',
  'ai + software',
  'apple',
  'google',
  'microsoft',
  'nvidia',
  'samsung',
  'tesla',
  'openai',
  'anthropic',
  ...['react', 'rust', 'java', 'python', 'swift', 'go', 'cursor'].map(
    (word) => `${word} + ${AMBIGUOUS_TECH_PAIR}`,
  ),
];

export const DEFAULT_DISTRACTION_RULES = [
  'prank/pranks',
  'drama',
  'gossip',
  'reaction/reactions',
  // "react" is also a Key 2 framework; don't veto React programming videos.
  `react - ${AMBIGUOUS_TECH_PAIR}`,
  'meme/memes',
  'clickbait',
  'mukbang',
  'storytime',
  'gone wrong',
  'gone sexual',
  "you won't believe",
  `brainrot/brain rot - ${BRAINROT_EXCEPTIONS}`,
  'rage bait/ragebait',
  'compilation',
  'challenge',
  'try not to laugh',
  'celebrity gossip',
  'dating drama',
  // Self-help clickbait phrasings.
  'this one habit',
  "the real reason you're not successful",
  'no one will tell you this',
  'level up your life',
];

export const DEFAULT_SELF_HELP_RULES = [
  'productivity',
  'self-improvement',
  'personal growth',
  'growth mindset',
  'discipline',
  'habit/habits',
  'goal setting',
  'time management',
  'focus',
  'deep work',
  'consistency',
  'accountability',
  'mentorship',
  'career growth',
  'high performance',
  'mastery',
  'skill building',
];

export const DEFAULT_SETTINGS: Settings = {
  shorts: {
    allowedScrolls: 0,
  },
  filter: {
    enabled: true,
    autoplayDisabled: true,
    sidebarHidden: true,
    homeCapEnabled: true,
    homeCap: 24,
    homeLoadMore: 2,
    showDistractionReveal: true,
    useSubscriptions: true,
    keys: {
      business: { enabled: true, rules: DEFAULT_BUSINESS_RULES },
      tech: { enabled: true, rules: DEFAULT_TECH_RULES },
      distraction: { enabled: true, rules: DEFAULT_DISTRACTION_RULES },
      selfHelp: { enabled: true, rules: DEFAULT_SELF_HELP_RULES },
    },
  },
  allowList: {
    manual: [],
    excluded: [],
  },
  facebook: {
    reelsScrolling: false,
    peopleYouMayKnow: false,
    groupSuggestions: true,
    stories: { mode: 'limited', profilesPerDay: 10 },
  },
  instagram: {
    reelsScrolling: false,
    suggestedAccounts: false,
    stories: { mode: 'limited', profilesPerDay: 6 },
  },
  bookmarks: {
    enabled: true,
    folderIds: [],
  },
};
