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

  // typewriter-ish reveal
  let i = 0;
  out.innerHTML = "";
  (function step() {
    if (i >= lines.length) return;
    out.insertAdjacentHTML("beforeend", lines[i]);
    i++;
    setTimeout(step, 380);
  })();
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
function renderItinerary() {
  const root = $("#timeline");
  root.innerHTML = "";
  const chosen = ACTIVITIES.filter((a) => state.picks.a.includes(a.id) || state.picks.b.includes(a.id));

  ITINERARY.forEach((leg) => {
    const legActs = chosen.filter((a) => leg.activityCities.includes(a.city));
    const item = el("div", "tl-item");
    const picksHtml = legActs.length
      ? legActs
          .map((a) => {
            const matched = state.picks.a.includes(a.id) && state.picks.b.includes(a.id);
            return `<span class="tl-pick ${matched ? "match" : ""}">${a.icon} ${a.title}${matched ? " ✨" : ""}</span>`;
          })
          .join("")
      : `<span class="tl-empty">No picks here yet — choose some activities above.</span>`;
    item.innerHTML = `
      <div class="tl-when">
        <div class="day">${leg.day}</div>
        <div class="tag">${leg.tag}</div>
      </div>
      <div class="tl-body">
        <h3>${leg.city}</h3>
        <p class="blurb">${leg.blurb}</p>
        <div class="tl-picks">${picksHtml}</div>
      </div>`;
    root.appendChild(item);
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
  renderHotels();
  renderBudget();

  // names
  $("#name-a").addEventListener("input", (e) => { state.names.a = e.target.value || "Traveler A"; save(); refreshNames(); });
  $("#name-b").addEventListener("input", (e) => { state.names.b = e.target.value || "Traveler B"; save(); refreshNames(); });
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
}

// re-render the spots where traveler names appear
function refreshNames() {
  renderVisa();
  renderActivities();
  renderItinerary();
  renderBudget();
}

document.addEventListener("DOMContentLoaded", init);
