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
  votes: {}, // { [placeId]: { a: "up"|"down", b: "up"|"down" } }
  notes: {}, // { [placeId]: { a: "text", b: "text" } }
});

let state = load();

// ── Persistence ───────────────────────────────────────────────────────────
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (saved) return {
      ...defaultState(), ...saved,
      picks: { ...{ a: [], b: [] }, ...saved.picks },
      votes: { ...saved.votes }, notes: { ...saved.notes },
    };
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
    // data: { who:'a'|'b', name, picks:[ids], votes:{id:vote}, notes:{id:text} }
    if (data.who === "a" || data.who === "b") {
      state.picks[data.who] = Array.from(new Set([...(state.picks[data.who] || []), ...(data.picks || [])]));
      if (data.name) state.names[data.who] = data.name;
      Object.entries(data.votes || {}).forEach(([id, vote]) => {
        (state.votes[id] || (state.votes[id] = {}))[data.who] = vote;
      });
      Object.entries(data.notes || {}).forEach(([id, text]) => {
        (state.notes[id] || (state.notes[id] = {}))[data.who] = text;
      });
      save();
      const other = data.who === "a" ? state.names.a : state.names.b;
      setTimeout(() => toast(`Merged ${other}'s picks, votes & notes ✨`), 600);
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
// Every card gets an inline SVG placeholder as its base src — it needs no
// network, so a card is NEVER blank. Real photos (Wikimedia Commons by default,
// or Google Places if a key is set) are fetched in the browser and swapped in
// over the placeholder; if that ever fails, the placeholder simply stays.
const hashStr = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };
const escSvg = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

// A themed gradient banner with the card's icon + title. Always renders.
function svgPlaceholder(icon, title, hue) {
  const h = ((hue % 360) + 360) % 360;
  const c1 = `hsl(${h},48%,44%)`, c2 = `hsl(${(h + 38) % 360},58%,28%)`;
  const t = escSvg(String(title).slice(0, 40));
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='420'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs>` +
    `<rect width='640' height='420' fill='url(#g)'/>` +
    `<text x='320' y='190' font-size='130' text-anchor='middle' dominant-baseline='central'>${escSvg(icon)}</text>` +
    `<text x='320' y='320' font-size='30' fill='#fff' opacity='0.9' font-family='Georgia,serif' text-anchor='middle'>${t}</text>` +
    `</svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

// q = Commons search keywords · place = Google Places query (used only if a key
// is set). A pinned exact photo (IMG_PIN[id]) overrides both.
function imgTag(id, icon, title, cls, place, q) {
  const hue = Math.abs(hashStr(id));
  const ph = svgPlaceholder(icon, title, hue);
  const pin = (typeof IMG_PIN !== "undefined" && IMG_PIN[id]) || "";
  const src = pin
    ? ` data-pin="${esc(pin)}"`
    : (q ? ` data-q="${esc(q)}"` : "") + (place ? ` data-place="${esc(place)}"` : "");
  return `<img class="${cls}" loading="lazy" src="${ph}" alt="${esc(title)} photo"` +
    ` data-icon="${esc(icon)}" data-title="${esc(title)}" data-hue="${hue}"` +
    src +
    ` onerror="phFail(this)">`;
}

// On a broken (swapped-in) photo, fall back to the always-working placeholder.
window.phFail = function (img) {
  if (String(img.getAttribute("src") || "").startsWith("data:")) return; // already placeholder
  img.classList.remove("real-photo");
  img.src = svgPlaceholder(img.dataset.icon || "📍", img.dataset.title || "", parseInt(img.dataset.hue || "0", 10));
};

// Swap in a pinned exact photo, keeping the placeholder if it fails to load.
function applyPins(root) {
  (root || document).querySelectorAll("img[data-pin]").forEach((img) => {
    if (img.dataset.pinned) return;
    img.dataset.pinned = "1";
    const url = img.getAttribute("data-pin");
    const probe = new window.Image();
    probe.onload = () => { if (img.isConnected) { img.src = url; img.classList.add("real-photo"); } };
    probe.src = url;
  });
}

// Route image enhancement: pinned photos first, then Google (if a key is
// configured) else Wikimedia for the rest.
function enhanceImages(root) {
  applyPins(root);
  if (window.GoogleImages && GoogleImages.available) GoogleImages.enhance(root);
  else if (window.WikiImages) WikiImages.enhance(root);
}

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
      if (typeof CONFIG !== "undefined" && CONFIG.flightsApi) appendLivePrices(date, budget);
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
      ${imgTag(a.id, a.icon, a.title, "act-img", `${a.title} ${searchPlace(a.city)} Turkey`, imgKw(a.id, `${a.title} Turkey`))}
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
      ${feedbackHtml(a.id)}
    `;
    grid.appendChild(card);
  });
  updateMatchCounter();
  enhanceImages(grid);
}
// Commons search keywords for a card id, with a sensible fallback.
const imgKw = (id, fallback) => (typeof IMG !== "undefined" && IMG[id]) || fallback;

// ── Votes & notes (per place, per traveler) ───────────────────────────────
// A 👍/👎 vote and a short note each of you can leave on any activity or
// eatery. Stored in state, saved locally, carried in the share link, and
// synced live via Firebase — so you can both refer back to them later.
function feedbackHtml(id) {
  const who = state.who;
  const v = state.votes[id] || {};
  const n = state.notes[id] || {};
  const myVote = v[who] || "";
  const myNote = n[who] || "";
  const voteChips = ["a", "b"]
    .filter((k) => v[k])
    .map((k) => `<span class="fb-tag ${v[k]}">${esc(state.names[k])} ${v[k] === "up" ? "👍" : "👎"}</span>`)
    .join("");
  const noteChips = ["a", "b"]
    .filter((k) => n[k] && n[k].trim())
    .map((k) => `<div class="fb-note-chip"><b>${esc(state.names[k])}:</b> ${esc(n[k])}</div>`)
    .join("");
  return `
    <div class="fb">
      <div class="fb-row">
        <button class="fb-vote up ${myVote === "up" ? "on" : ""}" data-id="${id}" data-vote="up" title="Thumbs up">👍</button>
        <button class="fb-vote down ${myVote === "down" ? "on" : ""}" data-id="${id}" data-vote="down" title="Thumbs down">👎</button>
        <input class="fb-note" data-id="${id}" maxlength="140" placeholder="Note as ${esc(state.names[who])}…" value="${esc(myNote)}">
      </div>
      ${voteChips ? `<div class="fb-tags">${voteChips}</div>` : ""}
      ${noteChips ? `<div class="fb-notes">${noteChips}</div>` : ""}
    </div>`;
}

function setVote(id, who, vote) {
  const cur = state.votes[id] || (state.votes[id] = {});
  if (cur[who] === vote) delete cur[who]; // click again to clear
  else cur[who] = vote;
  if (!cur.a && !cur.b) delete state.votes[id];
  save();
  renderActivities();
  renderFood();
  pushSync({ votes: { [id]: { [who]: (state.votes[id] && state.votes[id][who]) || null } } });
}

function setNote(id, who, text) {
  text = (text || "").slice(0, 140);
  const cur = state.notes[id] || (state.notes[id] = {});
  if (text.trim()) cur[who] = text;
  else delete cur[who];
  if (!cur.a && !cur.b) delete state.notes[id];
  save();
  renderActivities();
  renderFood();
  pushSync({ notes: { [id]: { [who]: text.trim() ? text : null } } });
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
        const card = el("div", `food-card ${s.kind}`);
        const url = mapsLink(s);
        const foodIcon = s.kind === "drink" ? "🍸" : "🍽️";
        card.innerHTML = `
          <a class="food-imglink" href="${url}" target="_blank" rel="noopener">
            ${imgTag(s.id, foodIcon, s.name, "food-img", `${s.name} ${s.area.replace(/·/g, " ")} Turkey`, imgKw(s.id, `${s.cuisine} Turkey`))}
          </a>
          <div class="food-top">
            <span class="food-name">${esc(s.name)}</span>
            <span class="tag cost">${s.cost}</span>
          </div>
          <div class="food-meta">${esc(s.area)} · ${esc(s.cuisine)}</div>
          <p class="food-blurb">${esc(s.blurb)}</p>
          <a class="food-link" href="${url}" target="_blank" rel="noopener">📍 Open in Maps ↗</a>
          ${feedbackHtml(s.id)}`;
        grid.appendChild(card);
      });
      sub.appendChild(grid);
      block.appendChild(sub);
    });
    root.appendChild(block);
  });
  enhanceImages(root);
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
  // gather just this traveler's votes & notes
  const myVotes = {}, myNotes = {};
  Object.keys(state.votes).forEach((id) => { if (state.votes[id][who]) myVotes[id] = state.votes[id][who]; });
  Object.keys(state.notes).forEach((id) => { if (state.notes[id][who]) myNotes[id] = state.notes[id][who]; });
  const payload = { who, name: state.names[who], picks: state.picks[who], votes: myVotes, notes: myNotes };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const url = `${location.origin}${location.pathname}?s=${encoded}`;
  const friend = who === "a" ? state.names.b : state.names.a;
  if (!state.picks[who].length && !Object.keys(myVotes).length && !Object.keys(myNotes).length) {
    toast("Add some picks, votes or notes first!");
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

  // activity picks + votes (event delegation)
  $("#act-grid").addEventListener("click", (e) => {
    const pick = e.target.closest(".pick-btn");
    if (pick) { togglePick(pick.dataset.id, pick.dataset.who); return; }
    const vote = e.target.closest(".fb-vote");
    if (vote) setVote(vote.dataset.id, state.who, vote.dataset.vote);
  });
  // eatery votes (event delegation)
  $("#eat-list").addEventListener("click", (e) => {
    const vote = e.target.closest(".fb-vote");
    if (vote) setVote(vote.dataset.id, state.who, vote.dataset.vote);
  });
  // notes on both activities and eateries (fires on blur / enter)
  ["#act-grid", "#eat-list"].forEach((sel) =>
    $(sel).addEventListener("change", (e) => {
      const note = e.target.closest(".fb-note");
      if (note) setNote(note.dataset.id, state.who, note.value);
    })
  );

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
    if (confirm("Clear all picks, votes and notes for both travelers?")) {
      state.picks = { a: [], b: [] };
      state.votes = {};
      state.notes = {};
      save();
      renderActivities();
      renderFood();
      renderItinerary();
      toast("All picks, votes & notes cleared");
      pushSync({ picks: { a: [], b: [] }, votes: {}, notes: {} });
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
    pushSync({ names: state.names, picks: state.picks, votes: state.votes, notes: state.notes });
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
  // deep-merge per place so neither traveler's vote/note is lost
  if (data.votes) Object.entries(data.votes).forEach(([id, v]) => { state.votes[id] = { ...(state.votes[id] || {}), ...v }; });
  if (data.notes) Object.entries(data.notes).forEach(([id, n]) => { state.notes[id] = { ...(state.notes[id] || {}), ...n }; });
  save();
  syncSetupInputs();
  refreshNames();
  renderItinerary();
}

// re-render the spots where traveler names / votes / notes appear
function refreshNames() {
  renderVisa();
  renderActivities();
  renderFood();
  renderItinerary();
  renderBudget();
}

document.addEventListener("DOMContentLoaded", init);
