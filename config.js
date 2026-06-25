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
  firebase: {
    apiKey: "AIzaSyBaEBwZlCF7Kdjt3d__BeqNfqsdbqjJYDk",
    authDomain: "trip-planning-82f06.firebaseapp.com",
    projectId: "trip-planning-82f06",
    storageBucket: "trip-planning-82f06.firebasestorage.app",
    messagingSenderId: "1072958669831",
    appId: "1:1072958669831:web:371a091defe0be276e56a2",
  },

  // ── Exact place photos (Google Places) — optional upgrade ───────────────
  // By default the cards already show free real photos from Wikimedia Commons
  // (no key needed). Paste a Google Maps JavaScript API key here to upgrade to
  // the EXACT Google photo of each specific restaurant/bar/landmark instead.
  // Enable "Maps JavaScript API" + "Places API (New)" in Google Cloud, and
  // RESTRICT the key to your site (HTTP referrer aishwarya105.github.io/*).
  // Leave "" to keep the free Wikimedia photos. See SETUP.md §4.
  googlePlacesKey: "",

  // ── Use Google Maps for the map (optional) ──────────────────────────────
  // false → the free Leaflet/OpenStreetMap map (no key needed).
  // true  → render the map with Google Maps instead. REQUIRES googlePlacesKey
  //   above, with the "Maps JavaScript API" enabled on it. Falls back to the
  //   free map automatically if the key is missing or Google fails to load.
  googleMap: false,

  // ── Conversational AI (optional) ────────────────────────────────────────
  // The chat widget works with NO setup as a smart built-in helper that
  // answers from your trip data. For free-form conversation, deploy
  // chat-proxy/worker.js to Cloudflare (it hides an Anthropic Claude key) and
  // paste its URL here. Leave "" to use the built-in helper. See SETUP.md §5.
  chatApi: "",
};
