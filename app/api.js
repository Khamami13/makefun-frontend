// Read-only client for make.fun's public API (https://make.fun/api).
// GET only, no key, CORS open to any origin. Responses are cached in memory
// and revalidated with ETag: the API binds ETags to the minute, so a fetch
// inside the same minute answers 304 and costs almost nothing.

const API = 'https://make.fun/api';

// url -> { etag, body, at } ; revalidate after 45 s, reuse a 304 answer.
const cache = new Map();

async function get(path) {
  const url = API + path;
  const hit = cache.get(url);
  const headers = {};
  if (hit && hit.etag) headers['If-None-Match'] = hit.etag;
  const res = await fetch(url, { headers });
  if (res.status === 304 && hit) {
    hit.at = Date.now();
    return hit.body;
  }
  if (!res.ok) {
    const err = new Error(`make.fun API ${res.status} for ${path}`);
    err.status = res.status;
    throw err;
  }
  const body = await res.json();
  cache.set(url, { etag: res.headers.get('etag'), body, at: Date.now() });
  return body;
}

/** All bounties (up to 100), newest first as the API returns them. */
export const listBounties = () => get('/competitions?limit=100');

/** One bounty, by slug. */
export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}`);

/** A bounty's leaderboard: ranked entries with their judge win rates. */
export const getLeaderboard = (slug) =>
  get(`/competitions/${encodeURIComponent(slug)}/leaderboard`);

/** A public profile, by handle. */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);
