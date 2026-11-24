const USER_AGENT =
  'Mozilla/5.0 (compatible; EdgelinkSEOAuditBot/1.0; +https://edgelinktechnology.com)';

// fetch() with a hard timeout; returns the Response plus elapsed time in ms.
async function fetchWithTimeout(url, { timeoutMs = 15000, headers = {}, ...opts } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      ...opts,
      headers: { 'User-Agent': USER_AGENT, Accept: '*/*', ...headers },
      signal: controller.signal,
    });
    return { res, elapsedMs: Date.now() - started };
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`Timed out after ${timeoutMs}ms fetching ${url}`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeUrl(input) {
  let url = String(input || '').trim();
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  const u = new URL(url);
  return u.origin + (u.pathname === '/' ? '' : u.pathname.replace(/\/$/, ''));
}

module.exports = { fetchWithTimeout, normalizeUrl, USER_AGENT };
