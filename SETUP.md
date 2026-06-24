# Setup guide — going live 🚀

The site works immediately with **zero setup** (curated flight estimates +
no-account share links). Follow the parts below to switch on the extras.
Everything you paste goes into **`config.js`** — you never edit the app code.

---

## 1. Publish the site (GitHub Pages) — ~3 minutes

This gives you one link you can both open.

1. Go to **github.com/aishwarya105/trip-planning → Settings → Pages**.
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Branch: **`claude/eloquent-bardeen-y85hh1`**, folder: **`/ (root)`** → **Save**.
4. Wait ~1 minute, refresh. Your site is live at:
   **`https://aishwarya105.github.io/trip-planning/`**

Every time you push to that branch, Pages updates automatically.
*(Prefer it on the main URL without the branch? Merge the branch into `main`
and pick `main` in step 3 instead.)*

---

## 2. Live flight prices (free) — ~15 minutes

Two free accounts: **Amadeus** (the flight data) and **Cloudflare** (the tiny
server that hides your Amadeus key).

### a) Get Amadeus keys
1. Sign up at **developers.amadeus.com** → **My Self-Service Workspace**.
2. **Create New App**. Copy the **API Key** and **API Secret**.
3. You start on the free **test** environment (limited/cached data — great for
   trying it). To get full real-time data, request **production** access in the
   same dashboard (still has a free monthly quota) and set `AMADEUS_ENV` to
   `production` in step (b).

### b) Deploy the proxy to Cloudflare
**Easiest (dashboard, no install):**
1. Sign up at **dash.cloudflare.com** → **Workers & Pages → Create → Worker**.
2. Name it `turkiye-flights`, click **Deploy**, then **Edit code**.
3. Paste the contents of **`flights-proxy/worker.js`**, click **Deploy**.
4. Go to the Worker’s **Settings → Variables and Secrets** and add:
   - `AMADEUS_KEY` = your API Key  *(type: Secret)*
   - `AMADEUS_SECRET` = your API Secret  *(type: Secret)*
   - `AMADEUS_ENV` = `test` or `production`  *(type: Text)*
5. Copy the Worker URL, e.g. `https://turkiye-flights.<you>.workers.dev`.

**Or via CLI:**
```bash
cd flights-proxy
npx wrangler deploy
npx wrangler secret put AMADEUS_KEY
npx wrangler secret put AMADEUS_SECRET
```

### c) Turn it on
In **`config.js`** set:
```js
flightsApi: "https://turkiye-flights.<you>.workers.dev",
```
Push. Now the **Plan our flights** agent appends real fares.
Quick test in your browser:
`https://turkiye-flights.<you>.workers.dev/?origin=SFO&dest=IST&date=2026-09-05`

---

## 3. Real-time sync (Firebase) — ~10 minutes

Lets you both edit picks and watch them update live, across devices.

1. Go to **console.firebase.google.com → Add project** (defaults are fine,
   you can skip Analytics).
2. **Build → Firestore Database → Create database** → start in **production
   mode**, pick a region.
3. In **Firestore → Rules**, paste this and **Publish** (open access limited to
   trip docs — fine for a private hobby planner; tighten later if you like):
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /trips/{room} {
         allow read, write: if true;
       }
     }
   }
   ```
4. **Project settings (gear) → General → Your apps → Web (`</>`)**. Register an
   app; Firebase shows a `firebaseConfig` object. Copy it.
5. In **`config.js`** set `firebase` to that object:
   ```js
   firebase: {
     apiKey: "AIza...",
     authDomain: "your-app.firebaseapp.com",
     projectId: "your-app",
     appId: "1:...:web:...",
   },
   ```
   *(The web config is meant to be public — security comes from the rules.)*
6. Push. On the site, scroll to **Live sync**, type a shared trip code (e.g.
   `turkey26`), press **Start / join live trip**, and send your friend the
   **invite link**. You’re now synced. 🔄

---

## 4. Real place photos (Google Places) — ~10 minutes

Replaces the generic keyword photos with the **actual Google photo** of each
landmark, restaurant and bar. One key, restricted to your site.

1. Go to **console.cloud.google.com** → create a project (any name).
2. **APIs & Services → Library** → enable both:
   - **Maps JavaScript API**
   - **Places API (New)**
3. **APIs & Services → Credentials → Create credentials → API key.** Copy it.
4. **Restrict the key** (important — it's visible in the browser):
   - **Application restrictions → Websites**, add:
     `aishwarya105.github.io/*` (and `localhost:*` if you test locally).
   - **API restrictions → Restrict key** → tick *Maps JavaScript API* and
     *Places API (New)*. **Save.**
5. **Enable billing** on the project. Google's **$200/month free credit** covers
   far more than this planner will ever use, but the APIs require billing on.
6. In **`config.js`** set:
   ```js
   googlePlacesKey: "AIza...your-key...",
   ```
7. Push. Cards now load each spot's real Google photo; if a lookup ever fails
   the existing keyword photo simply stays. 📸

*Cost control: in Cloud Console you can set a budget alert, and the key being
domain-restricted means only your site can use it.*

---

## Quick reference

| Want | Edit in `config.js` | Stays off if blank? |
|------|--------------------|---------------------|
| Live flight prices | `flightsApi` | ✅ falls back to estimates |
| Real-time sync | `firebase` | ✅ falls back to share-links |
| Real place photos | `googlePlacesKey` | ✅ falls back to keyword photos |

Nothing here costs money at this usage level. Always confirm visa rules and
final fares on the official sites before booking.
