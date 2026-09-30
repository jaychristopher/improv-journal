/*
 * The prompt generator, kept on the device.
 *
 * Registered by PromptGenerator on the two pages that mount it. It caches
 * those two pages and the immutable chunks under /_next/static, and nothing
 * else: no other page, no API, no analytics, no feed. A navigation to either
 * page tries the network first and falls back to the last copy the device
 * saw, so a hall with no signal still opens the tool. Bump VERSION when the
 * caching rule changes; a new page build needs no bump, because the pages
 * are refreshed on every online visit.
 */
const VERSION = "poc-prompts-v1";
const PAGES = ["/improv-prompts", "/tools/improv-prompt-generator"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(PAGES.map((page) => new Request(page, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (!PAGES.includes(url.pathname)) return;
  if (request.mode === "navigate" || url.searchParams.has("_rsc") || request.headers.get("RSC")) {
    event.respondWith(networkFirst(request));
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(VERSION);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const hit = await cache.match(request);
    if (hit) return hit;
    if (request.mode === "navigate") {
      const fallback = await cache.match(PAGES[1]);
      if (fallback) return fallback;
    }
    throw error;
  }
}
