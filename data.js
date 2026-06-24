// ─────────────────────────────────────────────────────────────────────────
//  Türkiye Together — trip data
//  All content is curated for a ~9-day September trip for two travelers:
//    • Traveler A: flying from San Francisco (SFO)  — US passport
//    • Traveler B: flying from New Delhi (DEL)       — Indian passport
//  Edit freely: prices are 2026 estimates, links go to live search pages.
// ─────────────────────────────────────────────────────────────────────────

const TRIP = {
  defaultDates: { start: "2026-09-05", end: "2026-09-14" }, // 9 nights
  meetCity: "Istanbul (IST)",
};

// ── Visa rules ────────────────────────────────────────────────────────────
const VISA = {
  a: {
    flag: "🇺🇸",
    who: "US passport · from San Francisco",
    status: "Visa-free",
    tone: "good",
    summary:
      "US citizens enter Türkiye visa-free for tourism — up to 90 days within any 180-day period. No e-Visa needed.",
    todo: [
      "Passport valid 6+ months beyond your return date with blank pages.",
      "Carry proof of onward travel + hotel address (occasionally checked).",
      "Nothing to apply for — you're the easy one. 🎉",
    ],
    links: [
      { label: "Türkiye MFA visa info", url: "https://www.mfa.gov.tr/visa-information-for-foreigners.en.mfa" },
      { label: "US State Dept · Türkiye", url: "https://travel.state.gov/content/travel/en/international-travel/International-Travel-Country-Information-Pages/Turkey.html" },
    ],
  },
  b: {
    flag: "🇮🇳",
    who: "Indian passport · from New Delhi",
    status: "Visa required — start ASAP",
    tone: "urgent",
    summary:
      "Indian citizens NEED a visa. The fast online e-Visa is only available if you ALSO hold a valid US / UK / Schengen / Ireland visa or residence permit. If you don't, you must apply for an in-person sticker visa at a Turkish consulate in India — so start now.",
    todo: [
      "Have a valid US/UK/Schengen/Ireland visa? → Apply online for the e-Visa (~$43, ~3 min, instant).",
      "Don't have one? → Book a sticker-visa appointment at the Turkish consulate (~₹5,000–5,500). This takes time — book flights/hotels first so you have the documents.",
      "Either visa allows up to a 30-day tourist stay — plenty for this trip.",
      "Passport valid 6+ months beyond travel; carry return ticket + hotel bookings + bank statement.",
    ],
    links: [
      { label: "Official e-Visa portal (evisa.gov.tr)", url: "https://www.evisa.gov.tr/en/" },
      { label: "Who is eligible for e-Visa?", url: "https://www.evisa.gov.tr/en/info/who-is-eligible-for-e-visa/" },
      { label: "Indian Embassy Ankara · visa info", url: "https://www.indembassyankara.gov.in/eoiank_pages/MjE2" },
    ],
  },
};

// ── Flights ───────────────────────────────────────────────────────────────
// Prices are round-trip estimates for early-mid September 2026.
const FLIGHTS = {
  a: {
    label: "San Francisco → Istanbul",
    code: "SFO → IST",
    note: "Turkish Airlines is the only nonstop. ~13h 20m direct. Sept is one of the cheaper months.",
    options: [
      { airline: "Turkish Airlines", type: "Nonstop", duration: "13h 20m", price: "$950–1,100", best: true },
      { airline: "Lufthansa / United (1 stop)", type: "1 stop (FRA/MUC)", duration: "~17h", price: "$780–900" },
      { airline: "Iberia / ITA (1 stop)", type: "1 stop (MAD/FCO)", duration: "~18h", price: "$720–870" },
    ],
    search: "https://www.google.com/travel/flights?q=flights%20from%20SFO%20to%20IST",
    skyscanner: "https://www.skyscanner.com/routes/sfo/ist/san-francisco-international-to-istanbul.html",
  },
  b: {
    label: "New Delhi → Istanbul",
    code: "DEL → IST",
    note: "IndiGo and Turkish Airlines both fly nonstop. ~7–9h direct. Cheap and frequent.",
    options: [
      { airline: "IndiGo", type: "Nonstop", duration: "~8h 30m", price: "$410–520", best: true },
      { airline: "Turkish Airlines", type: "Nonstop", duration: "~7h", price: "$570–680" },
      { airline: "Gulf carriers (1 stop)", type: "1 stop (DXB/DOH)", duration: "~12h", price: "$480–600" },
    ],
    search: "https://www.google.com/travel/flights?q=flights%20from%20DEL%20to%20IST",
    skyscanner: "https://www.skyscanner.net/routes/del/ist/delhi-indira-gandhi-international-to-istanbul.html",
  },
};

// Domestic hops inside Türkiye (book once you lock the itinerary)
const DOMESTIC = {
  note: "Cheap 1–1.5h hops on Turkish Airlines, Pegasus & AJet connect the three regions.",
  legs: [
    { route: "Istanbul → Cappadocia (NAV/ASR)", price: "$45–80", time: "~1h 25m" },
    { route: "Cappadocia → Antalya (AYT)", price: "$55–90", time: "~1h 15m" },
    { route: "Antalya → Istanbul (IST/SAW)", price: "$45–80", time: "~1h 25m" },
  ],
};

// ── Activities (the collaborative picker) ─────────────────────────────────
// type: 'fun' | 'relax' | 'both'
// slot: when it's best done — 'morning' | 'afternoon' | 'evening' | 'fullday' | 'any'
//   The itinerary scheduler uses this to drop each pick into the right time of
//   day and to warn you when a leg is over-booked. timeHint overrides the
//   default clock label for time-bound things (sunrise balloon, sunset cruise…).
const ACTIVITIES = [
  // Istanbul
  { id: "ist-hagia", city: "Istanbul", icon: "🕌", type: "fun", cost: "$", slot: "morning", title: "Hagia Sophia & Blue Mosque", desc: "The two icons of the old city, face to face across Sultanahmet square. Go early — the Blue Mosque closes to visitors at prayer times." },
  { id: "ist-topkapi", city: "Istanbul", icon: "👑", type: "fun", cost: "$$", slot: "morning", title: "Topkapı Palace & Harem", desc: "Ottoman sultans' palace — courtyards, treasury and Bosphorus views. A solid half-day; arrive at opening to beat the queues." },
  { id: "ist-bazaar", city: "Istanbul", icon: "🛍️", type: "fun", cost: "$", slot: "afternoon", title: "Grand Bazaar & Spice Bazaar", desc: "4,000 shops of lamps, carpets, tea and Turkish delight. Haggle gently." },
  { id: "ist-cruise", city: "Istanbul", icon: "⛴️", type: "both", cost: "$$", slot: "evening", timeHint: "Sunset · ~6pm", title: "Bosphorus sunset cruise", desc: "Glide between two continents as the skyline turns gold. The signature moment." },
  { id: "ist-hammam", city: "Istanbul", icon: "🛁", type: "relax", cost: "$$", slot: "afternoon", title: "Historic Turkish hammam", desc: "A 16th-century bathhouse scrub + foam massage. Pure reset after the flights — perfect for arrival day." },
  { id: "ist-cistern", city: "Istanbul", icon: "🏛️", type: "fun", cost: "$", slot: "afternoon", title: "Basilica Cistern", desc: "Eerie underground forest of columns and Medusa heads. Cool and atmospheric — a quick hour." },
  { id: "ist-food", city: "Istanbul", icon: "🥙", type: "fun", cost: "$", slot: "afternoon", title: "Kadıköy street-food tour", desc: "Ferry to the Asian side for the city's best eats away from the crowds." },
  { id: "ist-night", city: "Istanbul", icon: "🌃", type: "fun", cost: "$$", slot: "evening", title: "Rooftop bars in Beyoğlu", desc: "Cocktails over the Golden Horn, live music and late-night energy." },

  // Cappadocia
  { id: "cap-balloon", city: "Cappadocia", icon: "🎈", type: "both", cost: "$$$", slot: "morning", timeHint: "Dawn · ~5:30am", title: "Sunrise hot-air balloon", desc: "Hundreds of balloons over fairy chimneys at dawn. The bucket-list shot — book the very first morning in case wind cancels it." },
  { id: "cap-cave", city: "Cappadocia", icon: "🪨", type: "relax", cost: "$$", slot: "evening", timeHint: "Sunset", title: "Cave hotel + valley sunset", desc: "Stay carved into the rock; watch Red Valley glow with a glass of wine." },
  { id: "cap-goreme", city: "Cappadocia", icon: "⛪", type: "fun", cost: "$", slot: "afternoon", title: "Göreme Open-Air Museum", desc: "Cave churches with 1,000-year-old frescoes, a UNESCO site." },
  { id: "cap-atv", city: "Cappadocia", icon: "🏍️", type: "fun", cost: "$$", slot: "afternoon", timeHint: "Golden hour · ~5pm", title: "ATV / horseback through valleys", desc: "Tear (or trot) through Love & Rose Valleys at golden hour." },
  { id: "cap-pottery", city: "Cappadocia", icon: "🏺", type: "fun", cost: "$", slot: "afternoon", title: "Avanos pottery workshop", desc: "Throw a pot on a kick-wheel by the red Kızılırmak river." },

  // Coast (Antalya / Fethiye / Oludeniz)
  { id: "coast-lagoon", city: "Coast", icon: "🏖️", type: "relax", cost: "$", slot: "fullday", title: "Ölüdeniz Blue Lagoon day", desc: "That turquoise postcard beach — swim, float, do nothing well." },
  { id: "coast-paraglide", city: "Coast", icon: "🪂", type: "fun", cost: "$$$", slot: "morning", timeHint: "Morning winds", title: "Paraglide off Babadağ", desc: "Run off a 1,900m mountain and soar over the lagoon. Adrenaline peak." },
  { id: "coast-boat", city: "Coast", icon: "⛵", type: "both", cost: "$$", slot: "fullday", title: "Gulet boat & 12 islands cruise", desc: "Wooden yacht, swim stops in hidden coves, lunch on deck." },
  { id: "coast-kaleici", city: "Coast", icon: "🍊", type: "relax", cost: "$", slot: "evening", title: "Antalya old town (Kaleiçi)", desc: "Cobbled lanes, Roman harbour, orange trees and waterfront cafés — lovely at dusk." },
  { id: "coast-spa", city: "Coast", icon: "💆", type: "relax", cost: "$$", slot: "afternoon", title: "Beach club & spa afternoon", desc: "Day bed, sea, and a massage. The 'relaxation' half of the trip, sorted." },
  { id: "coast-gorge", city: "Coast", icon: "🥾", type: "fun", cost: "$", slot: "morning", title: "Saklıkent Gorge hike", desc: "Wade through an icy slot canyon between towering walls — go before midday heat." },

  // Food & extras (region-flexible)
  { id: "x-cooking", city: "Anywhere", icon: "🍳", type: "both", cost: "$$", slot: "afternoon", title: "Turkish cooking class", desc: "Roll your own gözleme and master mezze with a local family." },
  { id: "x-wine", city: "Cappadocia", icon: "🍷", type: "relax", cost: "$$", slot: "evening", title: "Cappadocia wine tasting", desc: "Türkiye's oldest wine region — volcanic-soil reds in a cave cellar." },
  { id: "x-pamukkale", city: "Detour", icon: "♨️", type: "relax", cost: "$$", slot: "fullday", title: "Pamukkale thermal terraces", desc: "Wade the white travertine pools above ancient Hierapolis — a full-day side trip." },
  { id: "x-raki", city: "Anywhere", icon: "🍢", type: "fun", cost: "$$", slot: "evening", title: "Meze & rakı dinner night", desc: "A long table of small plates and aniseed spirit — the Turkish way to dine." },
];

// ── Suggested skeleton itinerary (9 nights) ───────────────────────────────
// dayCount = how many sightseeing days that leg has. The scheduler spreads your
// picks across these days (morning / afternoon / evening) and flags overflow.
const ITINERARY = [
  { day: "Days 1–4", city: "Istanbul", tag: "Arrive & explore", activityCities: ["Istanbul", "Anywhere"], dayCount: 3,
    blurb: "Meet in Istanbul, beat jet-lag with a hammam, then dive into the old city, bazaars and a Bosphorus cruise." },
  { day: "Days 4–6", city: "Cappadocia", tag: "Wonder", activityCities: ["Cappadocia"], dayCount: 2,
    blurb: "Short flight to a cave hotel. Sunrise balloon, valley rides and pottery before a vineyard sunset." },
  { day: "Days 6–9", city: "Coast", tag: "Relax", activityCities: ["Coast", "Detour"], dayCount: 3,
    blurb: "Fly to the Mediterranean for beach days, a gulet cruise and slow evenings in Antalya's old town." },
  { day: "Day 9–10", city: "Home", tag: "Fly out", activityCities: [], dayCount: 0,
    blurb: "Hop back to Istanbul and fly home — Aishwarya west to SFO, friend east to DEL." },
];

// ── Stay (medium-but-nice budget) ─────────────────────────────────────────
const HOTELS = [
  { city: "Istanbul", icon: "🌉", style: "Boutique 4★ in Sultanahmet or Beyoğlu", price: "$120–180 / night",
    desc: "Rooftop terrace, walkable to the sights, characterful but not splurgy.",
    url: "https://www.booking.com/searchresults.html?ss=Sultanahmet%2C+Istanbul&nflt=class%3D4" },
  { city: "Cappadocia", icon: "🪨", style: "Cave hotel in Göreme / Uçhisar", price: "$130–200 / night",
    desc: "Rooms carved in stone with a terrace facing the balloons at dawn.",
    url: "https://www.booking.com/searchresults.html?ss=Goreme%2C+Cappadocia&nflt=class%3D4" },
  { city: "Coast", icon: "🌊", style: "Sea-view boutique in Antalya / Fethiye", price: "$110–170 / night",
    desc: "Pool or beach access, an easy base for boat trips and lazy mornings.",
    url: "https://www.booking.com/searchresults.html?ss=Antalya%2C+Turkey&nflt=class%3D4" },
];

// ── Eat & drink (curated, top-rated picks per region) ─────────────────────
// Hand-picked from current top-rated/most-recommended spots (2025). Each links
// to a Google Maps search so you get live ratings, hours, photos & directions.
//   city: "Istanbul" | "Cappadocia" | "Coast"
//   kind: "eat" (restaurant) | "drink" (bar / pub / wine house)
const FOODSPOTS = [
  // ── Istanbul · eat ──
  { id: "f-ist-karakoy", city: "Istanbul", kind: "eat", name: "Karaköy Lokantası", area: "Karaköy", cuisine: "Ottoman meze & grills", cost: "$$",
    blurb: "A Karaköy institution under hand-painted turquoise tiles — 80+ mezes, classic Turkish mains, buzzy at lunch and dinner." },
  { id: "f-ist-ciya", city: "Istanbul", kind: "eat", name: "Çiya Sofrası", area: "Kadıköy (Asian side)", cuisine: "Anatolian regional", cost: "$",
    blurb: "Cult favourite reviving forgotten Anatolian dishes — pay-by-weight, brilliant for veg. Pair it with the Kadıköy food walk." },
  { id: "f-ist-deraliye", city: "Istanbul", kind: "eat", name: "Deraliye", area: "Sultanahmet", cuisine: "Ottoman palace cuisine", cost: "$$",
    blurb: "Documented sultans' recipes (hünkar beğendi, goose kebab) a short walk from Hagia Sophia — handy for old-city days." },
  { id: "f-ist-murver", city: "Istanbul", kind: "eat", name: "Mürver", area: "Karaköy", cuisine: "Modern Anatolian · wood fire", cost: "$$$",
    blurb: "Smoke-driven contemporary cooking on a rooftop with a Bosphorus view — a special-occasion dinner." },
  { id: "f-ist-kofte", city: "Istanbul", kind: "eat", name: "Tarihi Sultanahmet Köftecisi", area: "Sultanahmet", cuisine: "Köfte", cost: "$",
    blurb: "Since 1920 and basically two dishes — grilled köfte or lamb shish — done perfectly. The classic cheap, quick lunch." },
  { id: "f-ist-neolokal", city: "Istanbul", kind: "eat", name: "Neolokal", area: "Galata / Karaköy", cuisine: "Contemporary Turkish (Michelin)", cost: "$$$",
    blurb: "Regional Turkey reimagined inside SALT Galata, with sweeping Golden Horn views. Book well ahead." },

  // ── Istanbul · drink ──
  { id: "f-ist-mikla", city: "Istanbul", kind: "drink", name: "Mikla", area: "Beyoğlu", cuisine: "Rooftop bar", cost: "$$$",
    blurb: "Sleek rooftop atop the Marmara Pera — arguably the city's best skyline view with a serious cocktail list." },
  { id: "f-ist-360", city: "Istanbul", kind: "drink", name: "360 Istanbul", area: "Beyoğlu", cuisine: "Rooftop bar & club", cost: "$$$",
    blurb: "The famous 360° terrace on İstiklal — drinks at sunset, turns into a party later." },
  { id: "f-ist-bank", city: "Istanbul", kind: "drink", name: "The Bank Roof Bar", area: "Karaköy", cuisine: "Rooftop cocktails", cost: "$$$",
    blurb: "Old-city panorama, whiskies and signature cocktails above the Bank Hotel." },
  { id: "f-ist-balkon", city: "Istanbul", kind: "drink", name: "Balkon", area: "Asmalımescit, Beyoğlu", cuisine: "Relaxed rooftop bar", cost: "$$",
    blurb: "Bohemian and easy-going — cold beers, jazz-to-funk and a Golden Horn view without the splurge." },
  { id: "f-ist-komun", city: "Istanbul", kind: "drink", name: "Komün Galataport", area: "Karaköy", cuisine: "Rooftop · live music", cost: "$$",
    blurb: "Bosphorus views and a mini-stage with local & international live sets." },

  // ── Cappadocia · eat ──
  { id: "f-cap-topdeck", city: "Cappadocia", kind: "eat", name: "Topdeck Cave Restaurant", area: "Göreme", cuisine: "Home-style Turkish", cost: "$$",
    blurb: "Family-run cave gem — a short menu of hearty stews and meze done with love. Tiny, so reserve ahead." },
  { id: "f-cap-pumpkin", city: "Cappadocia", kind: "eat", name: "Pumpkin Göreme", area: "Göreme", cuisine: "Set-menu Turkish + art", cost: "$$",
    blurb: "Intimate candle-lit cavern with a fixed seasonal menu and lovely local wines. Reservations essential." },
  { id: "f-cap-seki", city: "Cappadocia", kind: "eat", name: "Seki Restaurant (Argos)", area: "Uçhisar", cuisine: "Farm-to-table Anatolian", cost: "$$$",
    blurb: "Garden-grown produce and lamb shank with a knockout Pigeon Valley view — the region's standout fine dining." },
  { id: "f-cap-elai", city: "Cappadocia", kind: "eat", name: "Elai", area: "Uçhisar", cuisine: "Mediterranean-Turkish", cost: "$$$",
    blurb: "Polished service, grills and seafood, and one of the best terrace views in Cappadocia." },
  { id: "f-cap-bizimev", city: "Cappadocia", kind: "eat", name: "Bizim Ev", area: "Avanos", cuisine: "Avanos specialties", cost: "$$",
    blurb: "Avanos mantı and bostan kebab in a historic stone house — pair with the pottery workshop." },

  // ── Cappadocia · drink ──
  { id: "f-cap-rupa", city: "Cappadocia", kind: "drink", name: "Rupa Bar", area: "Göreme", cuisine: "Cocktail lounge", cost: "$$",
    blurb: "Upscale and lively in central Göreme — the cocktails are the star." },
  { id: "f-cap-redwine", city: "Cappadocia", kind: "drink", name: "Red Red Wine House", area: "Göreme", cuisine: "Wine bar", cost: "$$",
    blurb: "Rustic stone room lined with regional reds and whites, with meze to match. Great low-key evening." },
  { id: "f-cap-fatboys", city: "Cappadocia", kind: "drink", name: "Fat Boys Bar", area: "Göreme", cuisine: "Laid-back bar", cost: "$",
    blurb: "Friendly, unfussy and a traveller classic — easy drinks and good company." },
  { id: "f-cap-kocabag", city: "Cappadocia", kind: "drink", name: "Kocabağ Winery terrace", area: "Uçhisar / Ürgüp", cuisine: "Wine tasting", cost: "$$",
    blurb: "Sample award-winning Anatolian wines on a terrace over the vineyards — fits a relaxed afternoon." },

  // ── Coast (Antalya & Fethiye) · eat ──
  { id: "f-coast-seraser", city: "Coast", kind: "eat", name: "Seraser Fine Dining", area: "Antalya · Kaleiçi", cuisine: "Fine dining", cost: "$$$",
    blurb: "Modern plates with traditional touches inside a 300-year-old mansion — Kaleiçi's date-night pick." },
  { id: "f-coast-arma", city: "Coast", kind: "eat", name: "Arma Restaurant", area: "Antalya · Kaleiçi harbour", cuisine: "Seafood · Mediterranean", cost: "$$$",
    blurb: "Seafront perch over the old harbour with famed mezes and the freshest fish." },
  { id: "f-coast-balikci", city: "Coast", kind: "eat", name: "Balıkçı Meyhanesi", area: "Antalya · Kaleiçi", cuisine: "Meyhane · seafood", cost: "$$",
    blurb: "Locals' favourite for fish and rakı in a cosy, tucked-away corner of the old town." },
  { id: "f-coast-yemenli", city: "Coast", kind: "eat", name: "Yemenli Meyhanesi", area: "Antalya · Kaleiçi", cuisine: "Meyhane · grills & seafood", cost: "$$",
    blurb: "Everything from grilled octopus to tiger prawns, with live music most nights." },
  { id: "f-coast-fishmarket", city: "Coast", kind: "eat", name: "Fethiye Fish Market", area: "Fethiye", cuisine: "Buy-&-cook seafood", cost: "$$",
    blurb: "Pick your fish from the central market stalls; the ring of restaurants grills it for a small fee. A fun, fresh ritual." },

  // ── Coast (Antalya & Fethiye) · drink ──
  { id: "f-coast-sheffield", city: "Coast", kind: "drink", name: "Sheffield Pub", area: "Antalya · Kaleiçi", cuisine: "Irish-style pub", cost: "$$",
    blurb: "Guinness, craft beer and whisky in cosy dark-wood rooms — a reliable Kaleiçi hang." },
  { id: "f-coast-tudors", city: "Coast", kind: "drink", name: "Tudors Pub", area: "Antalya · Kaleiçi", cuisine: "Live-music pub", cost: "$$",
    blurb: "Buzzy nightly live music where locals and visitors mix. Right in the old-town lanes." },
  { id: "f-coast-barstreet", city: "Coast", kind: "drink", name: "Paspatur Bar Street", area: "Fethiye · old town", cuisine: "Nightlife strip", cost: "$",
    blurb: "Cobbled lane packed with bars and meyhanes — wander in and bar-hop. The heart of Fethiye nights." },
  { id: "f-coast-deepblue", city: "Coast", kind: "drink", name: "Deep Blue Bar", area: "Fethiye", cuisine: "Live-music bar", cost: "$$",
    blurb: "Long-running local favourite for live music, sports nights and an easy crowd." },
];

// ── Budget (per person, medium tier, ~9 nights) ───────────────────────────
const BUDGET = {
  a: { label: "Aishwarya (from SFO)", intlFlight: 1025 },
  b: { label: "Friend (from DEL)", intlFlight: 465 },
  shared: [
    { item: "Hotels (nice-ish, ~$150/night ÷ 2 people × 9)", amount: 675 },
    { item: "Domestic flights in Türkiye (2 hops)", amount: 150 },
    { item: "Sunrise balloon ride", amount: 200 },
    { item: "Food & drink (~$45/day × 9)", amount: 405 },
    { item: "Activities, entries & tours", amount: 300 },
    { item: "Local transport, SIM & misc", amount: 175 },
  ],
};
