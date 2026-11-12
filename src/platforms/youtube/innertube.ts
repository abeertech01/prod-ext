/** Minimal access to YouTube's internal API from the (same-origin) content script. */

const FALLBACK_CLIENT_VERSION = '2.20251101.00.00';
let clientVersion: string | null = null;

/** The web client version from the page's inline `ytcfg`, read once. */
export function getClientVersion(): string {
  if (clientVersion) return clientVersion;
  for (const script of document.querySelectorAll('script:not([src])')) {
    const m = script.textContent?.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/);
    if (m) return (clientVersion = m[1]!);
  }
  return FALLBACK_CLIENT_VERSION;
}

function cookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[$.]/g, '\\$&')}=([^;]*)`));
  return m ? decodeURIComponent(m[1]!) : null;
}

/** `SAPISIDHASH` header YouTube expects on signed-in API calls. */
export async function authorizationHeader(): Promise<string | null> {
  const sapisid = cookie('SAPISID') ?? cookie('__Secure-3PAPISID');
  if (!sapisid) return null;
  const ts = Math.floor(Date.now() / 1000);
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(`${ts} ${sapisid} ${location.origin}`));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `SAPISIDHASH ${ts}_${hex}`;
}

export async function innertubePost(endpoint: 'player' | 'browse', body: Record<string, unknown>, context?: unknown): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Youtube-Client-Name': '1',
    'X-Youtube-Client-Version': getClientVersion(),
  };
  const auth = await authorizationHeader();
  if (auth) {
    headers.Authorization = auth;
    headers['X-Origin'] = location.origin;
    headers['X-Goog-AuthUser'] = '0';
  }
  const res = await fetch(`/youtubei/v1/${endpoint}?prettyPrint=false`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({
      context: context ?? { client: { clientName: 'WEB', clientVersion: getClientVersion(), hl: 'en' } },
      ...body,
    }),
  });
  if (!res.ok) throw new Error(`YouTube API ${endpoint} responded ${res.status}`);
  return res.json();
}
