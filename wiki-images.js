// ─────────────────────────────────────────────────────────────────────────
//  Türkiye Together — real photos from Wikimedia Commons (free, no key)
//  Runs in the visitor's browser (Commons supports anonymous CORS via
//  origin=*), so it works regardless of any server-side network limits. For
//  each card it searches Commons by keyword, picks the first real photo, and
//  swaps it in over the inline SVG placeholder — only after the photo loads, so
//  a failed lookup always leaves the placeholder visible. Results are cached.
// ─────────────────────────────────────────────────────────────────────────
(function () {
  const CACHE_KEY = "tt-wikiphotos-v1";
  const TTL = 1000 * 60 * 60 * 24 * 30; // 30 days
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch (_) {}
  const save = () => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (_) {} };

  const queue = [];
  let draining = false;

  async function lookup(q) {
    const hit = cache[q];
    if (hit && Date.now() - hit.ts < TTL) return hit.url || null;
    try {
      const api =
        "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*" +
        "&generator=search&gsrnamespace=6&gsrlimit=8&gsrsearch=" +
        encodeURIComponent(q + " filetype:bitmap") +
        "&prop=imageinfo&iiprop=url|mime&iiurlwidth=640";
      const res = await window.fetch(api);
      const data = await res.json();
      const pages = data && data.query && data.query.pages ? Object.values(data.query.pages) : [];
      pages.sort((a, b) => (a.index || 0) - (b.index || 0));
      let url = null;
      for (const p of pages) {
        const ii = p.imageinfo && p.imageinfo[0];
        if (ii && /jpeg|png/i.test(ii.mime || "") && ii.thumburl) { url = ii.thumburl; break; }
      }
      cache[q] = { url, ts: Date.now() };
      save();
      return url;
    } catch (e) {
      console.warn("Commons lookup failed:", q, e);
      return null; // keep the placeholder
    }
  }

  async function drain() {
    if (draining) return;
    draining = true;
    const worker = async () => {
      while (queue.length) {
        const img = queue.shift();
        if (!img || !img.isConnected) continue;
        const q = img.getAttribute("data-q");
        if (!q) continue;
        const url = await lookup(q);
        if (!url || !img.isConnected) continue;
        const probe = new window.Image();
        probe.onload = () => { if (img.isConnected) { img.src = url; img.classList.add("real-photo"); } };
        probe.src = url;
      }
    };
    // a little concurrency so a page-full of cards fills in quickly
    await Promise.all([worker(), worker(), worker(), worker()]);
    draining = false;
  }

  window.WikiImages = {
    available: true,
    enhance(root) {
      (root || document).querySelectorAll("img[data-q]").forEach((img) => {
        if (!img.dataset.wqueued) { img.dataset.wqueued = "1"; queue.push(img); }
      });
      drain();
    },
  };
})();
