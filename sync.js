// ─────────────────────────────────────────────────────────────────────────
//  Türkiye Together — real-time sync (Firebase Firestore)
//  Loads only if CONFIG.firebase is set. Exposes window.TripSync and fires:
//    • 'tripsync-status'  detail: { available, enabled, room }
//    • 'tripsync-remote'  detail: { names, picks, ... }   (incoming doc data)
//  A "room" is one shared trip, keyed by a short code in collection "trips".
// ─────────────────────────────────────────────────────────────────────────

const fire = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

let api = {
  available: false,
  enabled: () => false,
  room: () => null,
  join: async () => {},
  leave: () => {},
  push: async () => {},
};
window.TripSync = api;

(async function initSync() {
  const cfg = window.CONFIG && window.CONFIG.firebase;
  if (!cfg) {
    fire("tripsync-status", { available: false, enabled: false, room: null });
    return; // graceful: no Firebase configured → share-link mode stays in charge
  }

  let db, docModule;
  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
    docModule = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const app = initializeApp(cfg);
    db = docModule.getFirestore(app);

    // Best-effort anonymous sign-in. The locked-down security rules require an
    // authenticated user (see firestore.rules), and anonymous auth gives every
    // visitor an identity without a login screen. If Anonymous Auth isn't
    // enabled in the Firebase console yet, we carry on unauthenticated so the
    // app keeps working under the old open rules — then it tightens up
    // automatically once you enable it and publish the new rules.
    try {
      const authModule = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
      const auth = authModule.getAuth(app);
      await authModule.signInAnonymously(auth);
    } catch (authErr) {
      console.warn("Anonymous sign-in unavailable — continuing without auth for now.", authErr);
    }
  } catch (e) {
    console.warn("Firebase failed to load — falling back to share-link mode.", e);
    fire("tripsync-status", { available: false, enabled: false, room: null });
    return;
  }

  const { doc, onSnapshot, setDoc } = docModule;
  let currentRoom = null;
  let unsub = null;

  api.available = true;
  api.enabled = () => !!currentRoom;
  api.room = () => currentRoom;

  api.join = async function (code) {
    code = String(code || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!code) return;
    if (unsub) { unsub(); unsub = null; }
    currentRoom = code;
    localStorage.setItem("trip-room", code);
    const ref = doc(db, "trips", code);
    unsub = onSnapshot(
      ref,
      (snap) => { if (snap.exists()) fire("tripsync-remote", snap.data()); },
      (err) => console.warn("sync snapshot error", err)
    );
    fire("tripsync-status", { available: true, enabled: true, room: code });
  };

  api.leave = function () {
    if (unsub) { unsub(); unsub = null; }
    currentRoom = null;
    localStorage.removeItem("trip-room");
    fire("tripsync-status", { available: true, enabled: false, room: null });
  };

  // Write only the fields passed in, merging so we never clobber the other
  // traveler's side of the doc.
  api.push = async function (partial) {
    if (!currentRoom) return;
    try {
      await setDoc(doc(db, "trips", currentRoom), { ...partial, updatedAt: Date.now() }, { merge: true });
    } catch (e) {
      console.warn("sync push failed", e);
    }
  };

  window.TripSync = api;

  // Auto-rejoin a room from the URL (?room=code) or last session.
  const fromUrl = new URLSearchParams(location.search).get("room");
  const remembered = fromUrl || localStorage.getItem("trip-room");
  if (remembered) {
    await api.join(remembered);
  } else {
    fire("tripsync-status", { available: true, enabled: false, room: null });
  }
})();
