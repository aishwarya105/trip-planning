// ─────────────────────────────────────────────────────────────────────────
//  Türkiye Together — app logic
//  No backend: state lives in localStorage and travels between the two of you
//  via a shareable URL (?s=...). Pick → share link → friend opens → merged.
// ─────────────────────────────────────────────────────────────────────────

const STORE_KEY = "turkiye-together-v1";

const defaultState = () => ({
  names: { a: "Aishwarya", b: "Friend" },
  dates: { start: TRIP.defaultDates.start, end: TRIP.defaultDates.end },
  who: "a",
  picks: { a: [], b: [] }, // arrays of activity ids
});

let state = load();

// ── Persistence ───────────────────────────────────────────────────────────
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (saved) return { ...defaultState(), ...saved, picks: { ...{ a: [], b: [] }, ...saved.picks } };
  } catch (_) {}
  return defaultState();
}
function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

// ── Merge picks arriving from a share link (?s=...) ───────────────────────
function applyIncomingShare() {
  const params = new URLSearchParams(location.search);
  const raw = params.get("s");
  if (!raw) return;
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(raw))));
    // data: { who:'a'|'b', name, picks:[ids] }
    if (data.who === "a" || data.who === "b") {
      state.picks[data.who] = Array.from(new Set([...(state.picks[data.who] || []), ...(data.picks || [])]));
      if (data.name) state.names[data.who] = data.name;
      save();
      const other = data.who === "a" ? state.names.a : state.names.b;
      setTimeout(() => toast(`Merged ${other}'s picks ✨`), 600);
    }
  } catch (e) {
    console.warn("Could not read share link", e);
  }
  // clean the URL so a refresh doesn't re-merge
  history.replaceState({}, "", location.pathname + location.hash);
}

// ── Small helpers ─────────────────────────────────────────────────────────
const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
}
const typeLabel = { fun: "🎉 Fun", relax: "🌿 Relax", both: "✨ Both" };

// ── Card images ───────────────────────────────────────────────────────────
// A keyword photo per card. Deterministic (locked) so it stays the same across
// reloads, lazy-loaded, and self-hiding via imgFail() if the host is ever down.
const hashStr = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };
function imgUrl(id) {
  const kw = (typeof IMG !== "undefined" && IMG[id]) || "";
  if (!kw) return "";
  const tags = kw.trim().split(/\s+/).map(encodeURIComponent).join(",");
  const lock = (Math.abs(hashStr(id)) % 999) + 1;
  return `https://loremflickr.com/640/420/${tags}?lock=${lock}`;
}
function imgTag(id, alt, cls) {
  const url = imgUrl(id);
  if (!url) return "";
  return `<img class="${cls}" loading="lazy" src="${url}" alt="${esc(alt)} photo" onerror="imgFail(this)">`;
}
// Hide a broken image and let the card fall back to its text-only layout.
window.imgFail = function (img) {
  const card = img.closest(".act, .food-card");
  if (card) card.classList.add("no-img");
  img.remove();
};

// ── Render: Visa ──────────────────────────────────────────────────────────
function renderVisa() {
  const root = $("#visa-cards");
  root.innerHTML = "";
  ["a", "b"].forEach((k) => {
    const v = VISA[k];
    const card = el("div", `card visa-card ${v.tone === "urgent" ? "urgent" : ""}`);
    card.innerHTML = `
      <div class="visa-head">
        <span class="flag">${v.flag}</span>
        <div>
          <h3>${state.names[k]}</h3>
          <div class="who">${v.who}</div>
        </div>
      </div>
      <span class="badge ${v.tone === "urgent" ? "urgent" : "good"}">${v.status}</span>
      <p>${v.summary}</p>
      <ul>${v.todo.map((t) => `<li>${t}</li>`).join("")}</ul>
      <div class="linkrow">${v.links.map((l) => `<a href="${l.url}" target="_blank" rel="noopener">${l.label} ↗</a>`).join("")}</div>
    `;
    root.appendChild(card);
  });
}

// ── Render: Flights ───────────────────────────────────────────────────────
function renderFlights() {
  const root = $("#flight-cols");
  root.innerHTML = "";
  ["a", "b"].forEach((k) => {
    const f = FLIGHTS[k];
    const col = el("div", "card flight-col");
    col.innerHTML = `
      <h3>${f.label} <span class="code">${f.code}</span></h3>
      <p class="note">${f.note}</p>
      ${f.options
        .map(
          (o) => `
        <div class="flight-opt ${o.best ? "best" : ""}">
          <div>
            <div class="air">${o.airline} ${o.best ? '<span class="star">· best</span>' : ""}</div>
            <div class="meta">${o.type} · ${o.duration}</div>
          </div>
          <div class="price">${o.price}</div>
        </div>`
        )
        .join("")}
      <div class="search-links">
        <a class="btn btn-primary btn-sm" href="${f.search}" target="_blank" rel="noopener">Live prices · Google ↗</a>
        <a class="btn btn-outline btn-sm" href="${f.skyscanner}" target="_blank" rel="noopener">Skyscanner ↗</a>
      </div>
    `;
    root.appendChild(col);
  });

  // domestic
  const d = $("#domestic");
  d.innerHTML = `
    <h3 style="margin:0 0 4px;">🇹🇷 Getting around inside Türkiye</h3>
    <p class="note" style="color:var(--ink-soft);">${DOMESTIC.note}</p>
    <div class="grid grid-3" style="margin-top:12px;">
      ${DOMESTIC.legs
        .map(
          (l) => `<div style="background:var(--cream); border:1px solid var(--line); border-radius:12px; padding:14px;">
            <div style="font-weight:700;">${l.route}</div>
            <div style="color:var(--ink-soft); font-size:.9rem;">${l.time} · <b style="color:var(--terra);">${l.price}</b></div>
          </div>`
        )
        .join("")}
    </div>`;
}

// ── Travel agent ──────────────────────────────────────────────────────────
function runAgent() {
  const out = $("#agent-out");
  const date = $("#agent-date").value || state.dates.start;
  const budget = $("#agent-budget").value;
  out.innerHTML = `<p class="line typing">Thinking… checking SFO and DEL routes, lining up arrivals…</p>`;

  // pick recommendation per route based on budget vibe
  const choose = (route) => {
    const opts = FLIGHTS[route].options;
    if (budget === "comfort") return opts.find((o) => o.type === "Nonstop") || opts[0];
    if (budget === "value") return opts.slice().sort((a, b) => firstNum(a.price) - firstNum(b.price))[0];
    // balanced: prefer the flagged best
    return opts.find((o) => o.best) || opts[0];
  };
  const recA = choose("a");
  const recB = choose("b");
  const totalLow = firstNum(recA.price) + firstNum(recB.price);
  const totalHigh = lastNum(recA.price) + lastNum(recB.price);

  const niceDate = fmtDate(date);
  // SFO is ~13h and 10h behind; advice to leave a buffer so the Delhi friend
  // (shorter, often overnight hop) waits a little rather than the long-haul.
  const lines = [
    `<p class="line">For an outbound around <span class="pill">${niceDate}</span> on a <b>${labelBudget(budget)}</b> plan, here's my pick:</p>`,
    `<p class="line">🇺🇸 <b>${state.names.a}</b> · SFO → IST — <b>${recA.airline}</b> (${recA.type}, ${recA.duration}) ≈ <span class="pill">${recA.price}</span></p>`,
    `<p class="line">🇮🇳 <b>${state.names.b}</b> · DEL → IST — <b>${recB.airline}</b> (${recB.type}, ${recB.duration}) ≈ <span class="pill">${recB.price}</span></p>`,
    `<p class="line">🤝 The SFO leg is the long one (~13h). Aim Aishwarya's arrival first, and have the Delhi flight land a few hours later the same day so you reach the hotel together.</p>`,
    `<p class="line">💳 Combined airfare ≈ <b>$${totalLow.toLocaleString()}–${totalHigh.toLocaleString()}</b> round-trip for the two of you.</p>`,
    `<p class="line">⏳ <b>Book this week.</b> ${state.names.b}'s Turkish visa may depend on these tickets + hotel bookings — and September SFO fares creep up as seats sell.</p>`,
    `<p class="line"><a class="btn btn-gold btn-sm" href="${FLIGHTS.a.search}" target="_blank" rel="noopener">Open ${state.names.a}'s flights ↗</a> <a class="btn btn-gold btn-sm" href="${FLIGHTS.b.search}" target="_blank" rel="noopener">Open ${state.names.b}'s flights ↗</a></p>`,
  ];

  // typewriter-ish reveal, then live fares if the proxy is configured
  let i = 0;
  out.innerHTML = "";
  (function step() {
    if (i >= lines.length) {
      if (window.CONFIG && CONFIG.flightsApi) appendLivePrices(date, budget);
      return;
    }
    out.insertAdjacentHTML("beforeend", lines[i]);
    i++;
    setTimeout(step, 380);
  })();
}

// Fetch real fares from the Cloudflare/Amadeus proxy and append them.
async function appendLivePrices(date, budget) {
  const out = $("#agent-out");
  const nonStop = budget === "comfort" ? "true" : "false";
  const box = el("div", "live-box", '<p class="line typing">📡 Fetching live fares from Amadeus…</p>');
  out.appendChild(box);
  const routes = [
    { flag: "🇺🇸", origin: "SFO", dest: "IST", name: state.names.a },
    { flag: "🇮🇳", origin: "DEL", dest: "IST", name: state.names.b },
  ];
  try {
    const results = await Promise.all(
      routes.map((r) =>
        fetch(`${CONFIG.flightsApi}?origin=${r.origin}&dest=${r.dest}&date=${encodeURIComponent(date)}&nonStop=${nonStop}`)
          .then((res) => res.json())
          .then((d) => ({ r, d }))
          .catch(() => ({ r, d: { error: "unreachable" } }))
      )
    );
    let html = '<p class="line"><b>📡 Live fares</b> (one-way, cheapest found):</p>';
    let total = 0, haveBoth = true;
    results.forEach(({ r, d }) => {
      const top = d.offers && d.offers[0];
      if (top) {
        total += top.price;
        html += `<p class="line">${r.flag} <b>${esc(r.name)}</b> ${r.origin}→${r.dest} — <span class="pill">$${Math.round(top.price)}</span> ${top.airline} · ${top.stops === 0 ? "nonstop" : top.stops + " stop"} · ${top.duration}</p>`;
      } else {
        haveBoth = false;
        html += `<p class="line">${r.flag} <b>${esc(r.name)}</b> ${r.origin}→${r.dest} — <span class="typing">no live data for this date (free Amadeus test tier is limited — see SETUP.md to switch to production).</span></p>`;
      }
    });
    if (haveBoth) html += `<p class="line">💳 Live combined ≈ <b>$${Math.round(total).toLocaleString()}</b> one-way for both of you.</p>`;
    box.innerHTML = html;
  } catch (e) {
    box.innerHTML = `<p class="line typing">Couldn't reach the live price service — check CONFIG.flightsApi in config.js. (${e})</p>`;
  }
}
const firstNum = (s) => parseInt(s.replace(/[^0-9–-]/g, "").split(/[–-]/)[0], 10) || 0;
const lastNum = (s) => {
  const parts = s.replace(/[^0-9–-]/g, "").split(/[–-]/);
  return parseInt(parts[parts.length - 1], 10) || firstNum(s);
};
const labelBudget = (b) => ({ value: "cheapest-sensible", balanced: "balanced", comfort: "comfort / nonstop" }[b] || b);
function fmtDate(d) {
  try {
    return new Date(d + "T00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  } catch (_) {
    return d;
  }
}

// ── Render: Activities ────────────────────────────────────────────────────
let activeFilter = "all";
function renderActivities() {
  const grid = $("#act-grid");
  grid.innerHTML = "";
  const list = ACTIVITIES.filter((a) => {
    if (activeFilter === "all") return true;
    if (["fun", "relax"].includes(activeFilter)) return a.type === activeFilter || a.type === "both";
    return a.city === activeFilter;
  });

  list.forEach((a) => {
    const onA = state.picks.a.includes(a.id);
    const onB = state.picks.b.includes(a.id);
    const matched = onA && onB;
    const card = el("div", `act ${matched ? "matched" : ""}`);
    card.innerHTML = `
      ${imgTag(a.id, a.title, "act-img")}
      ${matched ? '<span class="match-flag">✨ You both want this</span>' : ""}
      <div class="top">
        <span class="icon">${a.icon}</span>
        <div class="tags">
          <span class="tag ${a.type}">${typeLabel[a.type]}</span>
          <span class="tag cost">${a.cost}</span>
        </div>
      </div>
      <div class="city">${a.city}</div>
      <h4>${a.title}</h4>
      <p class="desc">${a.desc}</p>
      <div class="act-links">
        <a class="act-price" href="${tourLink(a)}" target="_blank" rel="noopener">💰 See live prices ↗</a>
        <a class="act-price alt" href="${viatorLink(a)}" target="_blank" rel="noopener">Viator ↗</a>
      </div>
      <div class="picks">
        <button class="pick-btn ${onA ? "on-a" : ""}" data-id="${a.id}" data-who="a">${onA ? "✓ " : ""}${esc(state.names.a)}</button>
        <button class="pick-btn ${onB ? "on-b" : ""}" data-id="${a.id}" data-who="b">${onB ? "✓ " : ""}${esc(state.names.b)}</button>
      </div>
    `;
    grid.appendChild(card);
  });
  updateMatchCounter();
}
// Map our region buckets to a searchable place name for tour sites
function searchPlace(city) {
  return { Istanbul: "Istanbul", Cappadocia: "Cappadocia", Coast: "Antalya", Anywhere: "Turkey", Detour: "Pamukkale" }[city] || "Turkey";
}
// Real, live price pages on the big tour marketplaces (search prefilled)
function tourLink(a) {
  const q = a.search || `${a.title} ${searchPlace(a.city)}`;
  return "https://www.getyourguide.com/s/?q=" + encodeURIComponent(q);
}
function viatorLink(a) {
  const q = a.search || `${a.title} ${searchPlace(a.city)}`;
  return "https://www.viator.com/searchResults/all?text=" + encodeURIComponent(q);
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function togglePick(id, who) {
  const arr = state.picks[who];
  const idx = arr.indexOf(id);
  if (idx >= 0) arr.splice(idx, 1);
  else arr.push(id);
  save();
  renderActivities();
  renderItinerary();
  pushSync({ picks: { [who]: state.picks[who] } });
}

// Send a partial state change to Firebase, if live sync is active.
function pushSync(partial) {
  if (window.TripSync && window.TripSync.enabled()) window.TripSync.push(partial);
}

function updateMatchCounter() {
  const matches = mutualPicks();
  const n = matches.length;
  $("#match-counter").textContent = `${n} mutual pick${n === 1 ? "" : "s"}${n ? " ✨" : ""}`;
}
function mutualPicks() {
  return ACTIVITIES.filter((a) => state.picks.a.includes(a.id) && state.picks.b.includes(a.id));
}

// ── Render: Itinerary ─────────────────────────────────────────────────────
// Turns the flat list of picks into a paced, day-by-day plan: each leg's days
// get a morning / afternoon / evening slot, picks drop into the slot that fits,
// mutual picks win the scarce slots first, and anything that won't fit is
// surfaced as a gentle "you've picked a bit too much here" nudge.

const SLOTS = [
  { key: "morning", label: "Morning", time: "9:00 AM", icon: "🌅" },
  { key: "afternoon", label: "Afternoon", time: "1:00 PM", icon: "☀️" },
  { key: "evening", label: "Evening", time: "7:00 PM", icon: "🌆" },
];

const isMatched = (a) => state.picks.a.includes(a.id) && state.picks.b.includes(a.id);
const isPicked = (a) => state.picks.a.includes(a.id) || state.picks.b.includes(a.id);
const whoWants = (a) => {
  const onA = state.picks.a.includes(a.id), onB = state.picks.b.includes(a.id);
  if (onA && onB) return "both";
  return onA ? "a" : "b";
};

// Place one leg's picked activities into a fixed number of day grids.
// Returns { days:[{morning,afternoon,evening}], overflow:[acts] }.
function scheduleLeg(leg) {
  const acts = ACTIVITIES.filter((a) => isPicked(a) && leg.activityCities.includes(a.city));
  // Mutual picks first (they get the scarce slots), then keep authoring order.
  acts.sort((x, y) => (isMatched(y) - isMatched(x)) || (ACTIVITIES.indexOf(x) - ACTIVITIES.indexOf(y)));

  const days = Array.from({ length: leg.dayCount }, () => ({ morning: null, afternoon: null, evening: null }));
  const overflow = [];
  const free = (d, k) => d[k] === null;

  for (const a of acts) {
    if (!place(days, a, free)) overflow.push(a);
  }
  return { days, overflow };
}

// Try to seat an activity in the earliest day that has room for its slot.
function place(days, a, free) {
  const order =
    a.slot === "fullday" ? null :
    a.slot === "any" ? ["afternoon", "morning", "evening"] :
    [a.slot];

  if (a.slot === "fullday") {
    const d = days.find((d) => free(d, "morning") && free(d, "afternoon"));
    if (!d) return false;
    d.morning = a; d.afternoon = a; d.fullday = a.id; // same ref in both → rendered once
    return true;
  }
  for (const k of order) {
    const d = days.find((d) => free(d, k));
    if (d) { d[k] = a; return true; }
  }
  return false;
}

function renderItinerary() {
  const root = $("#timeline");
  root.innerHTML = "";

  const totalPicked = ACTIVITIES.filter(isPicked).length;
  let totalOverflow = 0;
  const legBlocks = [];

  ITINERARY.forEach((leg) => {
    if (leg.dayCount === 0) {
      // travel / fly-home leg: keep it as a simple note
      legBlocks.push(`
        <div class="tl-leg">
          <div class="tl-leg-head"><h3>${leg.city}</h3><span class="tl-leg-tag">${leg.tag}</span></div>
          <p class="blurb">${leg.blurb}</p>
        </div>`);
      return;
    }

    const { days, overflow } = scheduleLeg(leg);
    totalOverflow += overflow.length;

    const dayCards = days.map((d, i) => {
      const rows = SLOTS.map((s) => {
        const a = d[s.key];
        if (!a) return `
          <div class="slot empty">
            <span class="slot-when">${s.icon} ${s.label}</span>
            <span class="slot-free">Open — keep it free or add a pick</span>
          </div>`;
        // skip the second half of a full-day activity (it lives in morning+afternoon)
        if (d.fullday === a.id && s.key === "afternoon") return "";
        const span = d.fullday === a.id && s.key === "morning";
        const who = whoWants(a);
        const tag = who === "both"
          ? `<span class="slot-who both">✨ both</span>`
          : `<span class="slot-who ${who}">${esc(state.names[who])}</span>`;
        return `
          <div class="slot filled ${isMatched(a) ? "match" : ""}">
            <span class="slot-when">${s.icon} ${span ? "All day" : s.label}<small>${a.timeHint || s.time}</small></span>
            <span class="slot-act">${a.icon} ${a.title} ${tag}</span>
          </div>`;
      }).join("");
      return `
        <div class="day-card">
          <div class="day-card-head">Day ${i + 1}</div>
          <div class="slots">${rows}</div>
        </div>`;
    }).join("");

    const overflowHtml = overflow.length ? `
      <div class="overflow-note">
        <b>⚠️ ${overflow.length} pick${overflow.length === 1 ? "" : "s"} won't fit ${leg.city}'s ${leg.dayCount} day${leg.dayCount === 1 ? "" : "s"}.</b>
        That's a packed leg — to keep it relaxed, drop one or move it elsewhere:
        <div class="overflow-list">
          ${overflow.map((a) => `<span class="tl-pick over">${a.icon} ${a.title}${isMatched(a) ? " ✨" : ""}</span>`).join("")}
        </div>
      </div>` : "";

    const anyPick = days.some((d) => d.morning || d.afternoon || d.evening);
    legBlocks.push(`
      <div class="tl-leg">
        <div class="tl-leg-head">
          <h3>${leg.city}</h3>
          <span class="tl-leg-tag">${leg.tag} · ${leg.day}</span>
        </div>
        <p class="blurb">${leg.blurb}</p>
        ${anyPick ? `<div class="day-grid">${dayCards}</div>` : `<p class="tl-empty">No picks here yet — choose some ${leg.city} activities above and they'll slot into days automatically.</p>`}
        ${overflowHtml}
      </div>`);
  });

  // Headline summary: how full is the plan, and is it over-stuffed?
  const banner = totalPicked === 0
    ? `<div class="plan-banner"><b>Your itinerary builds itself here.</b> Start picking activities above — each one drops into the right leg and time of day, and I'll warn you if a leg gets too packed.</div>`
    : totalOverflow > 0
    ? `<div class="plan-banner warn"><b>${totalPicked} picks scheduled — but ${totalOverflow} couldn't fit.</b> A couple of legs are over-booked (flagged below). Trim those and you'll have a relaxed, well-paced trip.</div>`
    : `<div class="plan-banner ok"><b>${totalPicked} picks, all scheduled ✨</b> Nicely paced — every day has breathing room. Add more if you like; I'll tell you when a leg fills up.</div>`;

  root.innerHTML = banner + legBlocks.join("");
}

// ── Render: Eat & drink ───────────────────────────────────────────────────
let eatRegion = "all";
let eatKind = "all";
const REGION_ORDER = ["Istanbul", "Cappadocia", "Coast"];
const mapsLink = (s) =>
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent(`${s.name} ${s.area} Turkey`);

function renderFood() {
  const root = $("#eat-list");
  root.innerHTML = "";
  const regions = eatRegion === "all" ? REGION_ORDER : [eatRegion];

  regions.forEach((region) => {
    const groups =
      eatKind === "eat" ? ["eat"] : eatKind === "drink" ? ["drink"] : ["eat", "drink"];
    const inRegion = FOODSPOTS.filter((s) => s.city === region);
    if (!inRegion.length) return;

    const block = el("div", "eat-region");
    block.innerHTML = `<h3 class="eat-region-title">${region}</h3>`;

    groups.forEach((kind) => {
      const list = inRegion.filter((s) => s.kind === kind);
      if (!list.length) return;
      const head = kind === "eat" ? "🍽 Restaurants" : "🍸 Bars &amp; pubs";
      const sub = el("div", "eat-sub");
      sub.innerHTML = `<div class="eat-sub-title">${head}</div>`;
      const grid = el("div", "eat-grid");
      list.forEach((s) => {
        const card = el("a", `food-card ${s.kind}`);
        card.href = mapsLink(s);
        card.target = "_blank";
        card.rel = "noopener";
        card.innerHTML = `
          ${imgTag(s.id, s.name, "food-img")}
          <div class="food-top">
            <span class="food-name">${esc(s.name)}</span>
            <span class="tag cost">${s.cost}</span>
          </div>
          <div class="food-meta">${esc(s.area)} · ${esc(s.cuisine)}</div>
          <p class="food-blurb">${esc(s.blurb)}</p>
          <span class="food-link">📍 Open in Maps ↗</span>`;
        grid.appendChild(card);
      });
      sub.appendChild(grid);
      block.appendChild(sub);
    });
    root.appendChild(block);
  });
}

// ── Render: Hotels ────────────────────────────────────────────────────────
function renderHotels() {
  const root = $("#hotels");
  root.innerHTML = "";
  HOTELS.forEach((h) => {
    const card = el("div", "card hotel");
    card.innerHTML = `
      <span class="icon">${h.icon}</span>
      <div class="city" style="font-size:.78rem; color:var(--ink-soft); font-weight:700; text-transform:uppercase; letter-spacing:.05em;">${h.city}</div>
      <h3>${h.style}</h3>
      <div class="price">${h.price}</div>
      <p class="desc">${h.desc}</p>
      <a class="btn btn-outline btn-sm" href="${h.url}" target="_blank" rel="noopener">Browse stays ↗</a>
    `;
    root.appendChild(card);
  });
}

// ── Render: Budget ────────────────────────────────────────────────────────
let budgetWho = "a";
function renderBudget() {
  const t = $("#budget-table");
  const person = BUDGET[budgetWho];
  const rows = [
    { item: `✈️ International flight — ${person.label}`, amount: person.intlFlight },
    ...BUDGET.shared,
  ];
  const total = rows.reduce((s, r) => s + r.amount, 0);
  t.innerHTML =
    rows.map((r) => `<tr><td>${r.item}</td><td>$${r.amount.toLocaleString()}</td></tr>`).join("") +
    `<tr class="total"><td>Estimated total</td><td>$${total.toLocaleString()}</td></tr>`;
}

// ── Share link ────────────────────────────────────────────────────────────
function makeShareLink() {
  const who = state.who;
  const payload = { who, name: state.names[who], picks: state.picks[who] };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const url = `${location.origin}${location.pathname}?s=${encoded}`;
  const friend = who === "a" ? state.names.b : state.names.a;
  if (!state.picks[who].length) {
    toast("Pick a few activities first!");
    return;
  }
  navigator.clipboard.writeText(url).then(
    () => toast(`Link copied — send it to ${friend} 📤`),
    () => {
      // fallback
      prompt("Copy this link and send it over:", url);
    }
  );
}

// ── Wire everything up ────────────────────────────────────────────────────
function syncSetupInputs() {
  $("#name-a").value = state.names.a;
  $("#name-b").value = state.names.b;
  $("#date-start").value = state.dates.start;
  $("#date-end").value = state.dates.end;
  $("#agent-date").value = state.dates.start;
  document.querySelectorAll("#whoami button").forEach((b) => b.classList.toggle("active", b.dataset.who === state.who));
}

function init() {
  applyIncomingShare();
  syncSetupInputs();
  renderVisa();
  renderFlights();
  renderActivities();
  renderItinerary();
  renderFood();
  renderHotels();
  renderBudget();

  // names
  $("#name-a").addEventListener("input", (e) => { state.names.a = e.target.value || "Traveler A"; save(); refreshNames(); pushSync({ names: { a: state.names.a } }); });
  $("#name-b").addEventListener("input", (e) => { state.names.b = e.target.value || "Traveler B"; save(); refreshNames(); pushSync({ names: { b: state.names.b } }); });
  // dates
  $("#date-start").addEventListener("change", (e) => { state.dates.start = e.target.value; $("#agent-date").value = e.target.value; save(); });
  $("#date-end").addEventListener("change", (e) => { state.dates.end = e.target.value; save(); });

  // who am I
  document.querySelectorAll("#whoami button").forEach((b) =>
    b.addEventListener("click", () => {
      state.who = b.dataset.who;
      save();
      document.querySelectorAll("#whoami button").forEach((x) => x.classList.toggle("active", x === b));
      toast(`Now picking as ${state.names[state.who]}`);
    })
  );

  // filters
  document.querySelectorAll("#filters .pill-btn").forEach((b) =>
    b.addEventListener("click", () => {
      activeFilter = b.dataset.f;
      document.querySelectorAll("#filters .pill-btn").forEach((x) => x.classList.toggle("active", x === b));
      renderActivities();
    })
  );

  // activity picks (event delegation)
  $("#act-grid").addEventListener("click", (e) => {
    const btn = e.target.closest(".pick-btn");
    if (btn) togglePick(btn.dataset.id, btn.dataset.who);
  });

  // eat & drink filters (region + kind)
  document.querySelectorAll("#eat-filters > .pill-btn").forEach((b) =>
    b.addEventListener("click", () => {
      eatRegion = b.dataset.f;
      document.querySelectorAll("#eat-filters > .pill-btn").forEach((x) => x.classList.toggle("active", x === b));
      renderFood();
    })
  );
  document.querySelectorAll("#eat-kind .pill-btn").forEach((b) =>
    b.addEventListener("click", () => {
      eatKind = b.dataset.k;
      document.querySelectorAll("#eat-kind .pill-btn").forEach((x) => x.classList.toggle("active", x === b));
      renderFood();
    })
  );

  // agent
  $("#agent-run").addEventListener("click", runAgent);

  // share + reset
  $("#share-btn").addEventListener("click", makeShareLink);
  $("#reset-btn").addEventListener("click", () => {
    if (confirm("Clear all picks for both travelers?")) {
      state.picks = { a: [], b: [] };
      save();
      renderActivities();
      renderItinerary();
      toast("All picks cleared");
      pushSync({ picks: { a: [], b: [] } });
    }
  });

  // budget toggle
  document.querySelectorAll("#budget-toggle button").forEach((b) =>
    b.addEventListener("click", () => {
      budgetWho = b.dataset.b;
      document.querySelectorAll("#budget-toggle button").forEach((x) => x.classList.toggle("active", x === b));
      renderBudget();
    })
  );

  setupSync();
}

// ── Live sync (Firebase) wiring ───────────────────────────────────────────
function setupSync() {
  const panel = $("#sync-panel");
  const dot = $("#sync-dot");
  const stateLbl = $("#sync-state");
  const msg = $("#sync-msg");
  const controls = $("#sync-controls");
  const input = $("#room-input");
  const joinBtn = $("#room-join");
  const copyBtn = $("#room-copy");
  const leaveBtn = $("#room-leave");

  function render(status) {
    const { available, enabled, room } = status;
    if (!available) {
      dot.className = "sync-dot off";
      stateLbl.textContent = "not configured";
      msg.innerHTML = "Add your Firebase config to <code>config.js</code> to turn on live, automatic sync across both devices. See <b>SETUP.md</b>. Until then, the <b>share-link</b> above works with no setup.";
      controls.hidden = true;
      return;
    }
    controls.hidden = false;
    if (enabled) {
      dot.className = "sync-dot on";
      stateLbl.textContent = `live · trip “${room}”`;
      msg.innerHTML = "You're synced! Picks and names update instantly on both devices. Share the invite link with your friend.";
      input.value = room;
      copyBtn.hidden = false;
      leaveBtn.hidden = false;
      joinBtn.textContent = "Switch trip";
    } else {
      dot.className = "sync-dot ready";
      stateLbl.textContent = "ready";
      msg.innerHTML = "Pick a shared trip code (any word you both use) and press start — then send your friend the invite link.";
      copyBtn.hidden = true;
      leaveBtn.hidden = true;
      joinBtn.textContent = "Start / join live trip";
    }
  }

  // initial state in case sync.js fired its status before we attached
  render({ available: !!(window.TripSync && window.TripSync.available), enabled: !!(window.TripSync && window.TripSync.enabled && window.TripSync.enabled()), room: window.TripSync && window.TripSync.room ? window.TripSync.room() : null });

  window.addEventListener("tripsync-status", (e) => render(e.detail));

  // Incoming remote update → merge into local state and re-render everything.
  window.addEventListener("tripsync-remote", (e) => applyRemoteState(e.detail));

  joinBtn.addEventListener("click", async () => {
    const code = (input.value || "").trim();
    if (!code) { toast("Type a trip code first"); return; }
    await window.TripSync.join(code);
    // seed the room with whatever we have locally
    pushSync({ names: state.names, picks: state.picks });
    const link = `${location.origin}${location.pathname}?room=${encodeURIComponent(code.toLowerCase())}`;
    history.replaceState({}, "", link + location.hash);
    toast(`Live trip “${code}” started 🔄`);
  });

  copyBtn.addEventListener("click", () => {
    const room = window.TripSync.room();
    const link = `${location.origin}${location.pathname}?room=${encodeURIComponent(room)}`;
    navigator.clipboard.writeText(link).then(
      () => toast("Invite link copied 📤"),
      () => prompt("Copy this invite link:", link)
    );
  });

  leaveBtn.addEventListener("click", () => {
    window.TripSync.leave();
    history.replaceState({}, "", location.pathname + location.hash);
    toast("Left the live trip");
  });
}

// Merge a remote document into local state without losing what isn't included.
function applyRemoteState(data) {
  if (!data) return;
  if (data.names) state.names = { ...state.names, ...data.names };
  if (data.picks) state.picks = { a: data.picks.a || state.picks.a, b: data.picks.b || state.picks.b };
  save();
  syncSetupInputs();
  refreshNames();
  renderItinerary();
}

// re-render the spots where traveler names appear
function refreshNames() {
  renderVisa();
  renderActivities();
  renderItinerary();
  renderBudget();
}

document.addEventListener("DOMContentLoaded", init);
