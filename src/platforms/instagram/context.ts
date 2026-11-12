import { instagramDailyItem } from '@/core/settings/storage';
import { INSTAGRAM_FEED } from '@/core/social/daily';
import { createSiteContext } from '../social/context';

export const igSite = createSiteContext(instagramDailyItem, INSTAGRAM_FEED);
export const igLive = igSite.live;
