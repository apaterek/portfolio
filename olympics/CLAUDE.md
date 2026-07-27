# LA28 Family Vote — CLAUDE.md

Guidance for working on the **`olympics/`** family-voting subsite. This is a
self-contained mini-site inside the `apaterek/portfolio` repo; it does **not**
use the portfolio's shared design system (`assets/css`, `assets/js`). Keep it
independent so a change here never affects the portfolio and vice versa.

## What it is

A private, no-backend web page where family members rank the six LA28 Olympic
ticketed sessions from most (1) to least (6) desired and submit a ballot.

Live path once deployed on GitHub Pages: `…/portfolio/olympics/`.

## Files

| File | Owns |
|------|------|
| `index.html` | 3-step page: (1) claim your ID, (2) rank events, (3) submit |
| `style.css`  | all styling; LA28 palette (red/green/gold on cream) |
| `app.js`     | event data, roster, drag-and-drop ranking, localStorage, submit |
| `assets/la28-key-art.png` | hero key art (LA28 logo provided by the user) |

No build step. Preview locally from the repo root:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/olympics/
```

## How voting works (no server)

GitHub Pages is static, so there is no database. Each ballot is:

1. **Ranked on-device** by drag-and-drop or the ▲/▼ buttons (rank is just list
   position, so a ballot is always a valid 1–6 permutation — no validation needed).
2. **Saved to `localStorage`** under `la28-ballot:<name>` so a returning voter
   sees and can update their ballot.
3. **Submitted** by opening a pre-filled `mailto:` to the organizer, with a
   "Copy my ballot" fallback for devices where email does not open.

Aggregation is manual: the organizer reads the emailed ballots. If you later
want automatic collection, swap the `mailto` in `submitBallot()` for a POST to a
form service (Formspree, Google Forms, a serverless function).

## Customizing (top of `app.js`, the `CONFIG` block)

- `ORGANIZER_EMAIL` — where ballots are emailed. Currently the organizer's address.
- `FAMILY_MEMBERS` — the roster of claimable IDs. **Edit these** to the real
  family names; placeholders are in place. Voters not listed can pick
  "Someone else…" and type their name.
- `EVENTS` — the six sessions. Change here if ticket details change.

## Event data — source & verification

Transcribed from `LA28_Family_Tickets.xlsx` (itself from a handwritten note,
IMG_0551) and cross-checked against the published LA28 schedule. Games run
July 14–30, 2028. Two entries the spreadsheet flagged were resolved online:

- **Football (Soccer), Men's Semifinal, Rose Bowl** — note read "Mon 7th",
  which is impossible (Jul 7 2028 is a Friday, before the Games). LA28's men's
  football semifinals are **July 24–25, 2028**; **Monday, July 24** is the only
  Monday that fits, so the ballot uses Jul 24, 2028, 8:30 PM.
- **Water Polo, Quarterfinals, Long Beach** — confirmed **Thursday, July 20,
  2028** (women's QF day; men's QF is Wed Jul 19). Session **start time is not
  yet published**, so it shows as **TBD** in the UI (flagged in red). Update
  `EVENTS.waterpolo.time` when LA28 releases session times.

The other four (Fencing Jul 15, Baseball Jul 17, Swimming Jul 29, Lacrosse
Jul 29) match July 2028 weekdays as written on the note.

## Privacy / crawlers

`<meta name="robots" content="noindex, nofollow">` is set on the page, and the
repo-root `robots.txt` already blocks all crawlers and named AI scrapers for the
whole domain (which covers `/olympics/`). Do not add a second `robots.txt` here —
robots.txt is only read from the site root.

## Conventions

- Vanilla HTML/CSS/JS only, no dependencies, no framework.
- Keep it accessible: the ▲/▼ buttons are the keyboard/mobile path parallel to
  drag-and-drop; preserve `aria-label`s and the visible focus ring.
- Responsive down to ~360px; test the ballot cards at narrow widths.
