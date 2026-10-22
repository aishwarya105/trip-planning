/* ── Workout picker — app logic ──────────────────────────────────────────
   State lives in localStorage. Each person (Me / Baby) has their own log. */

(() => {
  const MUSCLES = window.MUSCLES;
  const WORKOUTS = window.WORKOUTS;
  const STORE_KEY = "workout-app-v1";
  const PEOPLE = { me: "Me", baby: "Baby" };
  const TIME_OPTIONS = [10, 15, 20, 30, 45, 60];
  const SORENESS = ["Fresh", "A bit sore", "Very sore"];
  const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // ── State ────────────────────────────────────────────────────────────
  const defaults = {
    person: "me",
    minutes: 30,
    soreness: 0,
    soreMuscles: [],
    place: "gym",
    programs: { me: [], baby: [] }, // empty = all programs
    logs: { me: [], baby: [] },
  };

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY));
      if (saved) return {
        ...defaults, ...saved,
        logs: { ...defaults.logs, ...saved.logs },
        programs: { ...defaults.programs, ...saved.programs },
      };
    } catch (_) { /* storage unavailable — start fresh */ }
    return structuredClone(defaults);
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  const state = load();
  let skipped = []; // workout ids the user tapped "show another" on

  // ── Dates ────────────────────────────────────────────────────────────
  const pad = (n) => String(n).padStart(2, "0");
  const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromKey = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
  const todayKey = () => toKey(new Date());
  const daysBetween = (a, b) => Math.round((fromKey(b) - fromKey(a)) / 86400000);

  function weekStart(date = new Date()) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // back to Monday
    return d;
  }

  function weekDays() {
    const start = weekStart();
    return DAY_NAMES.map((_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i);
      return toKey(d);
    });
  }

  // ── History helpers ──────────────────────────────────────────────────
  const logs = () => state.logs[state.person];
  const thisWeekLogs = () => {
    const startKey = toKey(weekStart());
    return logs().filter((l) => l.date >= startKey);
  };

  function muscleStats() {
    const week = thisWeekLogs();
    const today = todayKey();
    const stats = {};
    for (const m of Object.keys(MUSCLES)) stats[m] = { count: 0, daysAgo: Infinity };
    for (const l of logs()) {
      for (const m of l.muscles) {
        if (!stats[m]) continue;
        stats[m].daysAgo = Math.min(stats[m].daysAgo, daysBetween(l.date, today));
      }
    }
    for (const l of week) for (const m of l.muscles) if (stats[m]) stats[m].count++;
    return stats;
  }

  // ── Recommender ──────────────────────────────────────────────────────
  function scoreWorkout(w, stats) {
    const reasons = [];
    const warnings = [];
    let score = 0;
    const strengthMuscles = w.muscles.filter((m) => m !== "cardio");

    // Use the time you have well.
    score += (w.minutes / state.minutes) * 20;

    // Favour muscle groups you haven't hit this week.
    const fresh = w.muscles.filter((m) => stats[m].count === 0);
    // Average (not sum) so total-body days don't win just by tagging everything.
    if (w.muscles.length) {
      const neglect = w.muscles.reduce((s, m) => s + 1 / (stats[m].count + 1), 0) / w.muscles.length;
      score += neglect * 30 + Math.min(fresh.length, 3) * 6;
    }
    if (fresh.length) reasons.push(`Hits ${listLabels(fresh)} — not worked yet this week`);

    // Muscles need ~48h to recover.
    for (const m of strengthMuscles) {
      const ago = stats[m].daysAgo;
      if (ago <= 1) { score -= 35; warnings.push(`${MUSCLES[m].label} worked ${ago === 0 ? "today" : "yesterday"}`); }
      else if (ago === 2) score -= 10;
    }

    // Soreness.
    const soreHit = w.muscles.filter((m) => state.soreMuscles.includes(m));
    score -= soreHit.length * 60;
    if (soreHit.length) warnings.push(`Works sore ${listLabels(soreHit)}`);
    if (state.soreness === 2) {
      score += [0, 30, 0, -45][w.intensity];
      if (w.type === "mobility") { score += 25; reasons.push("Gentle — good for very sore days"); }
    } else if (state.soreness === 1) {
      score += [0, 8, 4, -12][w.intensity];
      if (w.intensity === 1 && !soreHit.length) reasons.push("Easy on a slightly sore body");
    } else if (w.type === "mobility") {
      score -= 15; // you're fresh — make it count
    }

    // Don't repeat the exact same workout in a week.
    const repeats = thisWeekLogs().filter((l) => l.workoutId === w.id).length;
    score -= repeats * 15;
    if (repeats) warnings.push(`Already done ${repeats}× this week`);

    if (!reasons.length && !warnings.length) reasons.push("Good fit for your time");
    return { workout: w, score, reasons, warnings };
  }

  function recommend() {
    const pool = availableWorkouts();
    const stats = muscleStats();
    let fits = pool.filter((w) => w.minutes <= state.minutes);
    if (!fits.length) fits = [pool.reduce((a, b) => (a.minutes <= b.minutes ? a : b))];
    return fits.map((w) => scoreWorkout(w, stats)).sort((a, b) => b.score - a.score);
  }

  const HOME_GEAR = new Set(["bodyweight", "dumbbells", "bench", "band", "pullup-bar", "other"]);
  const PROGRAMS = [...new Set(WORKOUTS.map((w) => w.program || "Starter"))];
  const programOf = (w) => w.program || "Starter";

  function availableWorkouts() {
    const chosen = state.programs[state.person];
    const pool = WORKOUTS.filter((w) =>
      (!w.for || w.for.includes(state.person)) &&
      (!chosen.length || chosen.includes(programOf(w))) &&
      (state.place === "gym" || (w.equipment || []).every((e) => HOME_GEAR.has(e))));
    return pool.length ? pool : WORKOUTS;
  }

  // ── Actions ──────────────────────────────────────────────────────────
  function logWorkout(entry) {
    logs().push({ id: crypto.randomUUID?.() || String(Date.now()), date: todayKey(), ...entry });
    logs().sort((a, b) => a.date.localeCompare(b.date));
    skipped = [];
    save(); render();
  }

  function deleteLog(id) {
    state.logs[state.person] = logs().filter((l) => l.id !== id);
    save(); render();
  }

  // ── Rendering ────────────────────────────────────────────────────────
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const listLabels = (ms) => ms.map((m) => MUSCLES[m].label.toLowerCase()).join(", ").replace(/, ([^,]*)$/, " & $1");
  const muscleTags = (ms) => ms.length
    ? ms.map((m) => `<span class="tag">${MUSCLES[m].emoji} ${MUSCLES[m].label}</span>`).join("")
    : `<span class="tag">🧘 Mobility</span>`;
  const intensityDots = (n) => `<span class="dots" title="Intensity ${n}/3">${"●".repeat(n)}${"○".repeat(3 - n)}</span>`;

  function chips(container, options, isActive, onPick) {
    container.innerHTML = options.map((o, i) =>
      `<button type="button" class="chip${isActive(o.value) ? " active" : ""}" data-i="${i}">${o.label}</button>`).join("");
    container.querySelectorAll("button").forEach((b) => b.onclick = () => onPick(options[b.dataset.i].value));
  }

  function renderControls() {
    chips($("#people"), Object.entries(PEOPLE).map(([value, label]) => ({ value, label })),
      (v) => v === state.person, (v) => { state.person = v; skipped = []; save(); render(); });
    chips($("#time"), TIME_OPTIONS.map((t) => ({ value: t, label: t === 60 ? "60+" : `${t}` })),
      (v) => v === state.minutes, (v) => { state.minutes = v; skipped = []; save(); render(); });
    chips($("#soreness"), SORENESS.map((label, value) => ({ value, label })),
      (v) => v === state.soreness, (v) => {
        state.soreness = v;
        if (v === 0) state.soreMuscles = [];
        skipped = []; save(); render();
      });
    chips($("#place"), [{ value: "gym", label: "🏋️ Gym" }, { value: "home", label: "🏠 Home" }],
      (v) => v === state.place, (v) => { state.place = v; skipped = []; save(); render(); });
    const chosen = state.programs[state.person];
    chips($("#programs"), [{ value: "", label: "All" }, ...PROGRAMS.map((p) => ({ value: p, label: p }))],
      (v) => (v === "" ? !chosen.length : chosen.includes(v)), (v) => {
        const s = new Set(chosen);
        if (v === "") s.clear(); else s.has(v) ? s.delete(v) : s.add(v);
        state.programs[state.person] = [...s]; skipped = []; save(); render();
      });
    $("#sore-where").hidden = state.soreness === 0;
    chips($("#sore-muscles"),
      Object.entries(MUSCLES).filter(([k]) => k !== "cardio").map(([value, m]) => ({ value, label: `${m.emoji} ${m.label}` })),
      (v) => state.soreMuscles.includes(v), (v) => {
        const s = new Set(state.soreMuscles);
        s.has(v) ? s.delete(v) : s.add(v);
        state.soreMuscles = [...s]; skipped = []; save(); render();
      });
  }

  function renderPick() {
    const ranked = recommend();
    let list = ranked.filter((r) => !skipped.includes(r.workout.id));
    if (!list.length) { skipped = []; list = ranked; }
    const [top, ...rest] = list;
    const w = top.workout;
    const doneToday = logs().filter((l) => l.date === todayKey());

    $("#pick").innerHTML = `
      ${doneToday.length ? `<p class="note">✅ ${state.person === "me" ? "You" : PEOPLE[state.person]} already logged ${esc(doneToday.map((l) => l.name).join(", "))} today — nice!</p>` : ""}
      <div class="pick-head">
        <div>
          <p class="eyebrow">Today's pick for ${PEOPLE[state.person]}</p>
          <h2>${esc(w.name)}</h2>
          <p class="meta">⏱ ${w.minutes} min · ${esc(w.type)} · ${intensityDots(w.intensity)}</p>
          ${w.program ? `<p class="program">${esc(w.program)}${w.phase ? ` · ${esc(w.phase)}` : ""}${w.sample ? ` · ${esc(w.sample)}` : ""}</p>` : ""}
        </div>
      </div>
      <div class="tags">${muscleTags(w.muscles)}</div>
      <ul class="why">
        ${top.reasons.map((r) => `<li class="good">✓ ${esc(r)}</li>`).join("")}
        ${top.warnings.map((r) => `<li class="warn">⚠ ${esc(r)}</li>`).join("")}
      </ul>
      ${w.structure ? `<p class="structure">${esc(w.structure)}</p>` : ""}
      ${w.equipment?.length ? `<p class="meta">🧰 ${esc(w.equipment.join(", "))}</p>` : ""}
      <ol class="exercises">
        ${w.exercises.map((e) => `<li><span>${esc(e.name)}</span><span class="detail">${esc(e.detail)}</span></li>`).join("")}
      </ol>
      <div class="actions">
        <button class="btn primary" id="done">✅ I did this</button>
        <button class="btn" id="another" ${rest.length ? "" : "disabled"}>🔀 Show another</button>
      </div>
      ${rest.length ? `<details class="alts"><summary>Other good options (${Math.min(rest.length, 4)})</summary>
        ${rest.slice(0, 4).map((r) => `
          <button class="alt" data-id="${r.workout.id}">
            <strong>${esc(r.workout.name)}${r.workout.program ? ` <small>· ${esc(r.workout.program)}</small>` : ""}</strong>
            <span>${r.workout.minutes} min · ${r.workout.muscles.map((m) => MUSCLES[m].emoji).join(" ") || "🧘"}</span>
          </button>`).join("")}
      </details>` : ""}`;

    $("#done").onclick = () => logWorkout({ workoutId: w.id, name: w.name, minutes: w.minutes, muscles: w.muscles });
    $("#another").onclick = () => { skipped.push(w.id); renderPick(); };
    document.querySelectorAll(".alt").forEach((b) => b.onclick = () => {
      // Skip everything ranked above the chosen alternative so it becomes the pick.
      const idx = list.findIndex((r) => r.workout.id === b.dataset.id);
      skipped.push(...list.slice(0, idx).map((r) => r.workout.id));
      renderPick();
      $("#pick").scrollIntoView({ behavior: "smooth" });
    });
  }

  function renderWeek() {
    const stats = muscleStats();
    const days = weekDays();
    const today = todayKey();
    const week = thisWeekLogs();
    const totalMin = week.reduce((s, l) => s + (Number(l.minutes) || 0), 0);

    $("#week-summary").textContent = `${week.length} workout${week.length === 1 ? "" : "s"} · ${totalMin} min`;

    $("#days").innerHTML = days.map((d, i) => {
      const items = week.filter((l) => l.date === d);
      return `<div class="day${d === today ? " today" : ""}${items.length ? " has" : ""}">
        <span class="dname">${DAY_NAMES[i]}</span>
        <span class="dmark">${items.length ? items.map((l) => l.muscles.map((m) => MUSCLES[m]?.emoji).join("") || "🧘").join(" ") : "·"}</span>
      </div>`;
    }).join("");

    $("#coverage").innerHTML = Object.entries(MUSCLES).map(([k, m]) => {
      const { count, daysAgo } = stats[k];
      const level = count === 0 ? "none" : count === 1 ? "one" : "many";
      const when = daysAgo === Infinity ? "never" : daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo}d ago`;
      return `<div class="cov ${level}">
        <span class="cemoji">${m.emoji}</span>
        <span class="clabel">${m.label}</span>
        <span class="ccount">${count}×</span>
        <span class="cwhen">${when}</span>
      </div>`;
    }).join("");
  }

  function renderHistory() {
    const recent = [...logs()].reverse().slice(0, 20);
    $("#history").innerHTML = recent.length ? recent.map((l) => `
      <li>
        <div>
          <strong>${esc(l.name)}</strong>
          <span class="meta">${fromKey(l.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · ${Number(l.minutes) || 0} min</span>
        </div>
        <span class="hmuscles">${l.muscles.map((m) => MUSCLES[m]?.emoji).join(" ") || "🧘"}</span>
        <button class="del" data-id="${l.id}" title="Delete">✕</button>
      </li>`).join("") : `<li class="empty">Nothing logged yet — do today's pick and tap "I did this".</li>`;
    document.querySelectorAll(".del").forEach((b) => b.onclick = () => {
      if (confirm("Delete this workout from the log?")) deleteLog(b.dataset.id);
    });
  }

  function renderLogForm() {
    const sel = $("#log-workout");
    sel.innerHTML = `<option value="">Something else (custom)…</option>` +
      PROGRAMS.map((p) => `<optgroup label="${esc(p)}">${WORKOUTS.filter((w) => programOf(w) === p)
        .map((w) => `<option value="${w.id}">${esc(w.name)} · ${w.minutes} min</option>`).join("")}</optgroup>`).join("");
    $("#log-muscles").innerHTML = Object.entries(MUSCLES).map(([k, m]) =>
      `<label class="check"><input type="checkbox" value="${k}" /> ${m.emoji} ${m.label}</label>`).join("");
    $("#log-date").value = todayKey();
  }

  function renderLibrary() {
    $("#library").innerHTML = PROGRAMS.map((p) => `
      <details class="lib-program"><summary><strong>${esc(p)}</strong> <span class="meta">${WORKOUTS.filter((w) => programOf(w) === p).length} workouts</span></summary>
      ${WORKOUTS.filter((w) => programOf(w) === p).map((w) => `
      <details class="lib">
        <summary><strong>${esc(w.name)}</strong> <span class="meta">${w.minutes} min · ${intensityDots(w.intensity)}</span></summary>
        <div class="tags">${muscleTags(w.muscles)}</div>
        ${w.structure ? `<p class="structure">${esc(w.structure)}</p>` : ""}
        <ol class="exercises">${w.exercises.map((e) => `<li><span>${esc(e.name)}</span><span class="detail">${esc(e.detail)}</span></li>`).join("")}</ol>
      </details>`).join("")}
      </details>`).join("");
  }

  function render() {
    renderControls();
    renderPick();
    renderWeek();
    renderHistory();
  }

  // ── Manual log form ──────────────────────────────────────────────────
  function wireLogForm() {
    const sel = $("#log-workout");
    const custom = $("#custom-fields");
    sel.onchange = () => { custom.hidden = !!sel.value; };
    $("#log-form").onsubmit = (e) => {
      e.preventDefault();
      const date = $("#log-date").value || todayKey();
      let entry;
      if (sel.value) {
        const w = WORKOUTS.find((x) => x.id === sel.value);
        entry = { workoutId: w.id, name: w.name, minutes: w.minutes, muscles: w.muscles };
      } else {
        const name = $("#log-name").value.trim();
        const muscles = [...document.querySelectorAll("#log-muscles input:checked")].map((i) => i.value);
        if (!name) { alert("Give the workout a name."); return; }
        entry = { workoutId: null, name, minutes: Number($("#log-minutes").value) || 0, muscles };
      }
      logs().push({ id: crypto.randomUUID?.() || String(Date.now()), ...entry, date });
      logs().sort((a, b) => a.date.localeCompare(b.date));
      save();
      e.target.reset(); custom.hidden = false; $("#log-date").value = todayKey();
      $("#log-dialog").close();
      render();
    };
    $("#open-log").onclick = () => $("#log-dialog").showModal();
    $("#close-log").onclick = () => $("#log-dialog").close();
  }

  // ── Backup ───────────────────────────────────────────────────────────
  function wireBackup() {
    $("#export").onclick = () => {
      const blob = new Blob([JSON.stringify(state.logs, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `workout-log-${todayKey()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    };
    $("#import").onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (!data || !Array.isArray(data.me) || !Array.isArray(data.baby)) throw new Error("bad file");
        if (!confirm("Replace the current log with this backup?")) return;
        state.logs = data; save(); render();
      } catch (_) { alert("That doesn't look like a workout backup file."); }
      e.target.value = "";
    };
  }

  renderLogForm();
  renderLibrary();
  wireLogForm();
  wireBackup();
  render();
})();
