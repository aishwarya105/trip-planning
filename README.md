# Türkiye Together 🇹🇷

A collaborative planner for a **September 2026 trip to Türkiye** for two friends —
one flying from **San Francisco**, one from **New Delhi** — meeting in Istanbul for
~9 nights of fun *and* relaxation on a medium budget.

It's a zero-dependency static website: just open it in a browser.

## What's inside

- **Visas, front and center** — US passport = visa-free; the Delhi traveler needs a
  visa and may need flights/hotels booked first, with official links and a "start now"
  nudge. (This is the time-sensitive bit.)
- **Flights + a travel-planning agent** — curated September fares for SFO→IST and
  DEL→IST, plus an interactive agent that recommends a pairing so you both land in
  Istanbul together and links straight to live prices.
- **Collaborative activity picker** — 24 curated Türkiye experiences tagged 🎉 fun /
  🌿 relax. Each of you marks what you want; anything you *both* pick lights up gold ✨.
- **Share without accounts** — generate a link with your picks encoded in it, send it
  to your friend, and their page merges them automatically.
- **Live itinerary** — a 9-night Istanbul → Cappadocia → Coast loop that fills in with
  your picks as you go.
- **Stay & budget** — nice-ish 4★ hotel ideas and a per-person budget breakdown.

Picks are saved in your browser (localStorage), so they persist between visits.

## Run it

It's pure HTML/CSS/JS — no build step.

```bash
# easiest: just open the file
open index.html          # macOS    (xdg-open on Linux)

# or serve it (recommended, so share links use a real origin)
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy (optional)

Push to GitHub and enable **GitHub Pages** (Settings → Pages → deploy from branch).
The site is fully static, so it works as-is.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure |
| `styles.css` | Turkish-inspired theme (Aegean teal · bazaar terracotta · gold) |
| `data.js` | All trip content — visas, flights, activities, hotels, budget |
| `app.js` | Interactivity — picking, matching, the agent, share links |

> Prices, fares and visa rules are 2026 estimates for convenience — always confirm on
> the official sites linked in the app before booking.
