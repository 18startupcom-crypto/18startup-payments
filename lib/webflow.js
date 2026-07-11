// Reads mentor plan prices straight from the Webflow CMS (server-to-server).
// The customer's browser never sees or sends the price, so it cannot be tampered with.

const WEBFLOW_API = 'https://api.webflow.com/v2';

// Small in-memory cache so we don't hit Webflow on every single request.
const cache = new Map();
const CACHE_MS = 60 * 1000; // 60 seconds

function isConfigured() {
  return !!process.env.WEBFLOW_API_TOKEN && !!process.env.WEBFLOW_COLLECTION_ID;
}

async function fetchMentorItem(mentorSlug) {
  if (!isConfigured()) return null;

  const token = process.env.WEBFLOW_API_TOKEN;
  const collectionId = process.env.WEBFLOW_COLLECTION_ID;

  const cacheKey = collectionId + ':' + mentorSlug;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.item;

  const url =
    WEBFLOW_API +
    '/collections/' +
    collectionId +
    '/items?slug=' +
    encodeURIComponent(mentorSlug);

  const res = await fetch(url, {
    headers: {
      Authorization: 'Bearer ' + token,
      accept: 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error('Webflow API ' + res.status + ': ' + text);
  }

  const data = await res.json();
  const item = (data.items && data.items[0]) || null;

  cache.set(cacheKey, { at: Date.now(), item: item });
  return item;
}

// Looks for a CMS field named "<plan>-price", e.g. "growth-price".
// Returns { mentorName, amount } or null if not found.
async function getPlanFromWebflow(mentorSlug, planSlug) {
  const item = await fetchMentorItem(mentorSlug);
  if (!item || !item.fieldData) return null;

  const fd = item.fieldData;
  const priceField = planSlug + '-price';
  const amount = parseInt(fd[priceField], 10);

  if (isNaN(amount) || amount < 1) return null;

  return {
    mentorName: fd.name || mentorSlug,
    amount: amount,
  };
}

module.exports = { getPlanFromWebflow, isConfigured };
