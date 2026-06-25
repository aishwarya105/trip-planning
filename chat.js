// ─────────────────────────────────────────────────────────────────────────
//  Türkiye Together — conversational helper
//  Works with no setup as a smart built-in assistant that answers from the
//  trip data + your live picks/votes. If CONFIG.chatApi is set (a Cloudflare
//  Worker proxying Anthropic Claude), it upgrades to free-form conversation.
// ─────────────────────────────────────────────────────────────────────────
(function () {
  const history = []; // for the LLM path: [{role, content}]
  let panel, log, input, opened = false;

  const escc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ── Built-in (no-key) assistant — answers from the trip data ─────────────
  const bestFlight = (k) => FLIGHTS[k].options.find((o) => o.best) || FLIGHTS[k].options[0];
  const actsIn = (region) => ACTIVITIES.filter((a) => a.city === region);
  const fmt = (d) => { try { return new Date(d + "T00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" }); } catch (_) { return d; } };

  function budgetTotal() {
    const p = BUDGET.a;
    return p.intlFlight + BUDGET.shared.reduce((s, r) => s + r.amount, 0);
  }
  function listTitles(arr, n = 6) { return arr.slice(0, n).map((a) => `${a.icon || "•"} ${a.title || a.name}`).join("<br>"); }

  function botReply(q) {
    const t = " " + q.toLowerCase() + " ";
    const has = (...ws) => ws.some((w) => t.includes(w));
    const N = state.names;

    if (has("hello", " hi ", " hey", "hiya", "selam", "merhaba")) return `Merhaba! 👋 I'm your Türkiye trip helper. Ask me about visas, flights, what to do in each city, where to eat, your budget, or what you two have picked.`;
    if (has("help", "what can you", "what do you")) return `I can help with:<br>✨ <b>build your whole itinerary</b> — try “plan us a fun, relaxed trip”<br>🛂 visas · ✈️ flights · 🗓️ the plan & dates<br>🎈 what to do in <b>Istanbul / Cappadocia / the coast</b><br>🍽️ where to eat & drink · 🏨 hotels<br>💸 the budget · ❤️ what you've picked & both love<br>Just ask in your own words!`;

    // ✨ Generate a full itinerary from how fun / relaxed they want it.
    if (has("generate", "auto-plan", "auto plan", "plan it", "plan us", "plan our", "plan for us", "plan a ", "plan me", "plan the trip", "build us", "build a plan", "build me", "make us a", "make a plan", "make me a", "create a plan", "create our", "organise", "organize", "put together", "fill the itinerary", "fill our", "do the planning", "sort out the plan", "decide for us")) {
      if (typeof window.AutoPlan !== "undefined") {
        const { vibe, pace } = window.AutoPlan.parse(q);
        const ids = window.AutoPlan.run(vibe, pace, { fromChat: true });
        if (ids) return `Done! ✨ I built you ${window.AutoPlan.describe(vibe, pace)}<br>Scroll up to <b>Our itinerary</b> to see it laid out day by day — change any card and the schedule re-flows. Want it more relaxed or more packed? Just tell me (e.g. “make it chiller” or “pack it fuller”).`;
        return `No worries — I kept your current picks as they are. Say the word whenever you'd like a fresh plan.`;
      }
    }
    // Quick tweaks to an existing plan.
    if (has("more relax", "chiller", "calmer", "too packed", "too busy", "slow it down", "less packed", "more downtime", "pack it", "fuller", "busier", "more fun", "add more")) {
      if (typeof window.AutoPlan !== "undefined") {
        const { vibe, pace } = window.AutoPlan.parse(q);
        const ids = window.AutoPlan.run(vibe, pace, { fromChat: true, force: true });
        return `Tweaked it ✨ — now ${window.AutoPlan.describe(vibe, pace)}<br>Take a look in <b>Our itinerary</b> above.`;
      }
    }
    if (has("plan", "itinerary", "schedule", "overview", "summary", "route", "trip about")) return `🗺️ The plan: <b>Istanbul → Cappadocia → the Turquoise Coast</b> over ~9 nights in September — culture first, then Cappadocia's balloons & valleys, then beaches & boats on the coast. Your picked activities auto-slot into a day-by-day itinerary, grouped by neighbourhood with walking times.`;
    if (has("visa")) return `${N.a} (US passport) is <b>visa-free</b>. ${N.b} <b>needs a visa</b> — ${VISA.b.summary} Start it early!`;
    if (has("flight", "fly ", "flights", "airport", "airfare")) { const a = bestFlight("a"), b = bestFlight("b"); return `✈️ <b>${N.a}</b>: ${a.airline} SFO→IST (${a.type}, ~${a.price}).<br>✈️ <b>${N.b}</b>: ${b.airline} DEL→IST (${b.type}, ~${b.price}).<br>Aim to land in Istanbul the same day so you arrive together.`; }
    if (has("budget", "cost", "money", "how much", "expensive", "afford", "price")) return `💸 Roughly <b>$${budgetTotal().toLocaleString()} per person</b> for ~9 nights on a medium budget — flights, boutique 4★ stays, 2 domestic hops, the sunrise balloon, food and activities. See the Budget section for the breakdown.`;
    if (has("eat", "food", "restaurant", "dinner", "lunch", "breakfast", "drink", "bar", "pub", "cafe", "coffee")) {
      const ist = FOODSPOTS.filter((f) => f.city === "Istanbul" && f.kind === "eat").slice(0, 3).map((f) => f.name).join(", ");
      const cap = FOODSPOTS.filter((f) => f.city === "Cappadocia" && f.kind === "eat").slice(0, 2).map((f) => f.name).join(", ");
      const co = FOODSPOTS.filter((f) => f.city === "Coast" && f.kind === "eat").slice(0, 2).map((f) => f.name).join(", ");
      return `🍽️ Top tables — <b>Istanbul</b>: ${ist}. <b>Cappadocia</b>: ${cap}. <b>Coast</b>: ${co}. For bars/pubs and the full list (with Maps links + your votes), see the Eat & drink section.`;
    }
    if (has("hotel", "stay", "sleep", "accommodat", "where to stay")) return `🏨 Boutique 4★ in the $110–200/night range: ${HOTELS.map((h) => `${h.icon} ${h.city}`).join(" · ")}. The Stay section has booking links.`;
    if (has("when", " date", "dates", "what month", "september", "how long", "how many days")) return `🗓️ <b>${fmt(state.dates.start)} – ${fmt(state.dates.end)}</b>, about 9 nights in early–mid September — warm, sunny and balloon-friendly.`;
    if (has("istanbul", "bosphorus", "hagia", "bazaar")) return `🕌 <b>Istanbul</b> ideas:<br>${listTitles(actsIn("Istanbul"))}`;
    if (has("cappadocia", "balloon", "goreme", "göreme", "cave", "fairy")) return `🎈 <b>Cappadocia</b> ideas:<br>${listTitles(actsIn("Cappadocia"))}`;
    if (has("coast", "beach", "antalya", "fethiye", "oludeniz", "ölüdeniz", "sea ", "lagoon", "boat")) return `🏖️ <b>Coast</b> ideas:<br>${listTitles(actsIn("Coast"))}`;
    if (has("activit", "things to do", "what to do", " do ", "see ", "experien")) return `Tell me a place — try “what can we do in Cappadocia?” Highlights overall: sunrise balloon 🎈, Bosphorus sunset cruise ⛴️, Blue Lagoon 🏖️, paragliding 🪂.`;
    if (has("picked", "shortlist", "chosen", "selected", "our list")) { const p = ACTIVITIES.filter((a) => state.picks.a.includes(a.id) || state.picks.b.includes(a.id)); return p.length ? `You've picked <b>${p.length}</b> so far:<br>${listTitles(p, 12)}` : `No picks yet — tap the buttons on the activity cards to choose, and they'll flow into your itinerary.`; }
    if (has("both love", "consensus", "agree", "loved", "favourite", "favorite", "match")) { const b = Object.keys(state.votes).filter((id) => { const v = state.votes[id]; return v.a === "up" && v.b === "up"; }); return b.length ? `❤️ You both love ${b.length}: ${b.map((id) => { const a = ACTIVITIES.find((x) => x.id === id) || FOODSPOTS.find((x) => x.id === id); return a ? (a.title || a.name) : id; }).join(", ")}.` : `Nothing you both 👍'd yet — vote on places and the “Loved” section fills up.`; }
    if (has(" map", "where is", "located", "neighbourhood", "neighborhood")) return `🗺️ The Map section pins every place — gold for the ones you both love. Tap a pin to open it in Google Maps for street view & photos.`;
    if (has("book", "reserve", "how to book")) return `✅ The Book section is a shared checklist — flights, visa, hotels, your picked activities and both-loved eateries, each with a booking link. Tick things off as you go.`;
    if (has("weather", "hot", "cold", "rain", "pack", "wear")) return `September in Türkiye is warm and mostly dry — ~25–30°C on the coast, cooler mornings in Cappadocia (great for the balloon). Pack light layers, swimwear, and comfy walking shoes.`;
    if (has("thank", "thanks", "cheers")) return `Anytime! İyi yolculuklar — happy travels! 🇹🇷`;
    return `I'm the built-in helper, so I might not have that one. Try: <i>visas, flights, what to do in Istanbul/Cappadocia/the coast, where to eat, the budget, or what you've picked.</i>${(typeof CONFIG !== "undefined" && CONFIG.chatApi) ? "" : "<br><small>💡 Want real conversation? Connect an AI key — see SETUP.md §5.</small>"}`;
  }

  // ── Context handed to the LLM (when configured) ──────────────────────────
  function buildContext() {
    const picks = ACTIVITIES.filter((a) => state.picks.a.includes(a.id) || state.picks.b.includes(a.id)).map((a) => a.title);
    const loved = Object.keys(state.votes).filter((id) => { const v = state.votes[id]; return v.a === "up" && v.b === "up"; })
      .map((id) => { const x = ACTIVITIES.find((a) => a.id === id) || FOODSPOTS.find((f) => f.id === id); return x && (x.title || x.name); }).filter(Boolean);
    return [
      `You are a warm, concise travel assistant embedded in a trip-planning website for a ~9-night September trip to Türkiye for two friends: ${state.names.a} (flying from San Francisco, US passport, visa-free) and ${state.names.b} (flying from New Delhi, needs a Turkish visa).`,
      `The trip loops Istanbul → Cappadocia → the Turquoise Coast (Antalya & Fethiye), medium budget (~$${budgetTotal().toLocaleString()}/person).`,
      `Activities span those regions (e.g. sunrise hot-air balloon, Bosphorus cruise, Blue Lagoon, paragliding). There are curated restaurant/bar lists per region.`,
      picks.length ? `So far they've picked: ${picks.join(", ")}.` : `They haven't picked any activities yet.`,
      loved.length ? `They both love: ${loved.join(", ")}.` : ``,
      `Answer their questions about the trip helpfully and briefly (2-4 sentences). Keep a friendly tone; you can use light emoji. If they ask something off-topic, gently steer back to the trip.`,
    ].filter(Boolean).join(" ");
  }

  // ── UI ───────────────────────────────────────────────────────────────────
  function addMsg(who, html, temp) {
    const row = document.createElement("div");
    row.className = `chat-msg ${who}` + (temp ? " temp" : "");
    row.innerHTML = who === "user" ? escc(html) : html;
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
    return row;
  }

  async function send(text) {
    text = (text || "").trim();
    if (!text) return;
    input.value = "";
    addMsg("user", text);
    const useApi = typeof CONFIG !== "undefined" && CONFIG.chatApi;
    if (!useApi) { setTimeout(() => addMsg("bot", botReply(text)), 220); return; }
    const typing = addMsg("bot", `<span class="chat-typing">…</span>`, true);
    try {
      const res = await fetch(CONFIG.chatApi, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: buildContext(), messages: history.concat([{ role: "user", content: text }]) }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const reply = data.reply || (data.content && data.content[0] && data.content[0].text) || "Sorry, I didn't catch that.";
      typing.remove();
      addMsg("bot", escc(reply).replace(/\n/g, "<br>"));
      history.push({ role: "user", content: text }, { role: "assistant", content: reply });
      if (history.length > 16) history.splice(0, history.length - 16);
    } catch (e) {
      typing.remove();
      addMsg("bot", botReply(text) + `<br><small>(AI service unreachable — used the built-in helper.)</small>`);
    }
  }

  function build() {
    if (document.querySelector(".chat-fab")) return; // guard against double-init
    const btn = document.createElement("button");
    btn.className = "chat-fab";
    btn.setAttribute("aria-label", "Open trip chat");
    btn.innerHTML = "💬";

    panel = document.createElement("div");
    panel.className = "chat-panel";
    panel.hidden = true;
    panel.innerHTML = `
      <div class="chat-head">
        <span>🇹🇷 Trip helper</span>
        <button class="chat-close" aria-label="Close">✕</button>
      </div>
      <div class="chat-log" id="chat-log"></div>
      <div class="chat-suggest" id="chat-suggest">
        <button>What's the plan?</button>
        <button>Cappadocia ideas?</button>
        <button>Where should we eat?</button>
        <button>What's our budget?</button>
      </div>
      <form class="chat-input" id="chat-form">
        <input id="chat-text" autocomplete="off" placeholder="Ask about the trip…" />
        <button type="submit" aria-label="Send">➤</button>
      </form>`;
    document.body.appendChild(btn);
    document.body.appendChild(panel);

    log = panel.querySelector("#chat-log");
    input = panel.querySelector("#chat-text");

    // Drive visibility with an inline style as well as [hidden]. An inline
    // display always wins over the stylesheet's `display:flex`, so closing
    // works even if an older/cached CSS lacks the [hidden] rule.
    const open = () => { panel.hidden = false; panel.style.display = "flex"; btn.classList.add("hide"); input.focus(); if (!opened) { opened = true; addMsg("bot", `Merhaba! 👋 I can help you plan — ask me anything about the trip, or tap a suggestion below.`); } };
    const close = () => { panel.hidden = true; panel.style.display = "none"; btn.classList.remove("hide"); };
    close(); // start hidden regardless of stylesheet state
    btn.addEventListener("click", open);
    panel.querySelector(".chat-close").addEventListener("click", close);
    panel.querySelector("#chat-form").addEventListener("submit", (e) => { e.preventDefault(); send(input.value); });
    panel.querySelector("#chat-suggest").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) send(b.textContent); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
