// ─────────────────────────────────────────────────────────────────────────
//  Türkiye Together — configuration
//  Paste your keys here to switch on LIVE FLIGHT PRICES and REAL-TIME SYNC.
//  Until you do, the site still works (curated estimates + share-link).
//  Full step-by-step instructions are in SETUP.md.
// ─────────────────────────────────────────────────────────────────────────

const CONFIG = {
  // ── Live flight prices ──────────────────────────────────────────────────
  // Deploy flights-proxy/worker.js to Cloudflare Workers (free) and paste the
  // resulting URL here, e.g. "https://turkiye-flights.yourname.workers.dev".
  // Leave "" to keep the curated September estimates.
  flightsApi: "",

  // ── Real-time sync (Firebase) ───────────────────────────────────────────
  // Create a free Firebase project, enable Firestore, and paste the web-app
  // config object here. Leave null to keep the no-account share-link flow.
  // It looks like:
  //   firebase: {
  //     apiKey: "AIza...",
  //     authDomain: "your-app.firebaseapp.com",
  //     projectId: "your-app",
  //     appId: "1:...:web:...",
  //   },
  firebase: null,

  // ── Real place photos (Google Places) ───────────────────────────────────
  // Paste a Google Maps JavaScript API key to replace the generic keyword
  // photos with the ACTUAL Google photo of each landmark, restaurant and bar.
  // Enable "Maps JavaScript API" + "Places API (New)" in Google Cloud, and
  // RESTRICT the key to your site (HTTP referrer aishwarya105.github.io/*).
  // Leave "" to keep the free keyword images. See SETUP.md §4.
  googlePlacesKey: "",
};
