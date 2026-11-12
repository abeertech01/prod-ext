import { facebookDailyItem } from '@/core/settings/storage';
import { FACEBOOK_FEED } from '@/core/social/daily';
import { createSiteContext } from '../social/context';

export const fbSite = createSiteContext(facebookDailyItem, FACEBOOK_FEED);
export const fbLive = fbSite.live;
