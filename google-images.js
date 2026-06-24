// ─────────────────────────────────────────────────────────────────────────
//  Türkiye Together — real place photos via Google Places (optional upgrade)
//  No-op unless CONFIG.googlePlacesKey is set. When it is, each card's generic
//  keyword photo is replaced with the ACTUAL Google photo of that landmark /
//  restaurant / bar. Loads the Maps JS API on demand, caches photo URLs in
//  localStorage, and — crucially — only swaps the image in AFTER the real photo
//  has loaded, so any failure silently leaves the working keyword image.
// ─────────────────────────────────────────────────────────────────────────
(function () {
  const KEY = (typeof CONFIG !== "undefined" && CONFIG.googlePlacesKey) || "";
  if (!KEY) {
    // Not configured → expose a harmless no-op so app.js can call it freely.
    window.GoogleImages = { available: false, enhance() {} };
    return;
  }

  const CACHE_KEY = "tt-gphotos-v1";
  const TTL = 1000 * 60 * 60 * 24 * 20; // remember a photo URL for ~20 days
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch (_) {}
  const saveCache = () => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (_) {} };

  let libP = null;          // promise → places library
  const queue = [];          // <img> elements waiting to be enhanced
  let draining = false;

  // Official inline bootstrap loader for the Maps JS API (loads once).
  function loadPlaces() {
    if (libP) return libP;
    ((g) => {
      let h, a, k, b = window;
      const p = "The Google Maps JavaScript API", c = "google", l = "importLibrary", q = "__ib__", m = document;
      b = b[c] || (b[c] = {});
      const d = b.maps || (b.maps = {}), r = new Set(), e = new URLSearchParams(),
        u = () => h || (h = new Promise((f, n) => {
          a = m.createElement("script");
          e.set("libraries", [...r] + "");
          for (k in g) e.set(k.replace(/[A-Z]/g, (t) => "_" + t[0].toLowerCase()), g[k]);
          e.set("callback", c + ".maps." + q);
          a.src = "https://maps." + c + "apis.com/maps/api/js?" + e;
          d[q] = f;
          a.onerror = () => (h = n(Error(p + " could not load.")));
          a.nonce = (m.querySelector("script[nonce]") || {}).nonce || "";
          m.head.append(a);
        }));
      d[l] ? console.warn(p + " only loads once. Ignoring:", g)
           : (d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)));
    })({ key: KEY, v: "weekly" });
    libP = window.google.maps.importLibrary("places");
    return libP;
  }

  // Resolve a search query → a Google photo URL (or null), with caching.
  async function lookup(query) {
    const hit = cache[query];
    if (hit && Date.now() - hit.ts < TTL) return hit.url || null;
    try {
      const { Place } = await loadPlaces();
      const { places } = await Place.searchByText({
        textQuery: query,
        fields: ["photos"],
        maxResultCount: 1,
      });
      const photo = places && places[0] && places[0].photos && places[0].photos[0];
      const url = photo ? photo.getURI({ maxWidth: 640 }) : null;
      cache[query] = { url, ts: Date.now() };
      saveCache();
      return url;
    } catch (e) {
      console.warn("Google Places lookup failed:", query, e);
      return null; // keep the keyword fallback
    }
  }

  async function drain() {
    if (draining) return;
    draining = true;
    while (queue.length) {
      const img = queue.shift();
      if (!img || !img.isConnected) continue;
      const q = img.getAttribute("data-place");
      if (!q) continue;
      const url = await lookup(q);
      if (!url || !img.isConnected) continue;
      // preload first; only swap if the real photo actually loads
      const probe = new window.Image();
      probe.onload = () => { if (img.isConnected) { img.src = url; img.classList.add("real-photo"); } };
      probe.src = url;
    }
    draining = false;
  }

  window.GoogleImages = {
    available: true,
    enhance(root) {
      (root || document).querySelectorAll("img[data-place]").forEach((img) => {
        if (!img.dataset.gqueued) { img.dataset.gqueued = "1"; queue.push(img); }
      });
      drain();
    },
  };
})();
