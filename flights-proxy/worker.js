// ─────────────────────────────────────────────────────────────────────────
//  Türkiye Together — flight price proxy (Cloudflare Worker)
//  Hides your Amadeus credentials and returns simplified, sorted offers.
//
//  Deploy:  see ../SETUP.md  (paste in the Cloudflare dashboard, or `wrangler deploy`)
//  Secrets (set in dashboard → Settings → Variables, or `wrangler secret put`):
//    AMADEUS_KEY      your Amadeus API Key
//    AMADEUS_SECRET   your Amadeus API Secret
//    AMADEUS_ENV      "test" (default) or "production"
//
//  Call:  GET /?origin=SFO&dest=IST&date=2026-09-05&adults=1&nonStop=false
// ─────────────────────────────────────────────────────────────────────────

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    const origin = (url.searchParams.get("origin") || "").toUpperCase();
    const dest = (url.searchParams.get("dest") || "").toUpperCase();
    const date = url.searchParams.get("date");
    const adults = url.searchParams.get("adults") || "1";
    const nonStop = url.searchParams.get("nonStop") || "false";

    if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(dest) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return json({ error: "Provide origin, dest (3-letter codes) and date (YYYY-MM-DD)." }, 400);
    }
    if (!env.AMADEUS_KEY || !env.AMADEUS_SECRET) {
      return json({ error: "Server missing AMADEUS_KEY / AMADEUS_SECRET." }, 500);
    }

    const base = env.AMADEUS_ENV === "production" ? "https://api.amadeus.com" : "https://test.api.amadeus.com";

    try {
      // 1) OAuth token (client credentials)
      const tokenRes = await fetch(base + "/v1/security/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=client_credentials&client_id=${encodeURIComponent(env.AMADEUS_KEY)}&client_secret=${encodeURIComponent(env.AMADEUS_SECRET)}`,
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) return json({ error: "Amadeus auth failed", detail: tokenData }, 502);

      // 2) Flight Offers Search
      const search = new URL(base + "/v2/shopping/flight-offers");
      search.searchParams.set("originLocationCode", origin);
      search.searchParams.set("destinationLocationCode", dest);
      search.searchParams.set("departureDate", date);
      search.searchParams.set("adults", adults);
      search.searchParams.set("currencyCode", "USD");
      search.searchParams.set("nonStop", nonStop);
      search.searchParams.set("max", "8");

      const offersRes = await fetch(search, { headers: { Authorization: "Bearer " + tokenData.access_token } });
      const data = await offersRes.json();
      if (!offersRes.ok) return json({ error: "Amadeus search failed", detail: data }, 502);

      const offers = (data.data || [])
        .map((o) => {
          const it = o.itineraries[0];
          return {
            price: Number(o.price.grandTotal),
            currency: o.price.currency,
            airline: (o.validatingAirlineCodes || [])[0] || "",
            stops: it.segments.length - 1,
            duration: prettyDuration(it.duration),
          };
        })
        .sort((a, b) => a.price - b.price)
        .slice(0, 5);

      return json({ origin, dest, date, count: offers.length, offers });
    } catch (e) {
      return json({ error: "Proxy error", detail: String(e) }, 500);
    }
  },
};

// ISO8601 duration "PT13H20M" → "13h 20m"
function prettyDuration(iso) {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?/.exec(iso || "");
  if (!m) return "";
  return `${m[1] ? m[1] + "h " : ""}${m[2] ? m[2] + "m" : ""}`.trim();
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
