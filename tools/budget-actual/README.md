# Budget Actual

An adjustable budget versus actual for film and experiential production and
post. Mobile first, installable, works offline. Plain HTML/CSS/JS, no build
step and no dependencies, same as the rest of this repo.

Built from a real commercial actual: `ACTUAL_LMCD_Comcast_HBO_1518N_001HMR.xls`
(1stAveMachine for Digitas / Comcast, HBO Jan15, bid 001H, 2015). Sheet 1 is
the AICP-style bid, sheet 2 is the cost ledger the producer kept against it.
The app models both, and the bundled sample reproduces that workbook's numbers.

## Run

```bash
python3 -m http.server 8000     # from the repo root
```

Then open <http://localhost:8000/tools/budget-actual/>. On a phone, use the
browser's Add to Home Screen: it installs standalone, and the service worker
keeps it running with no signal (a location scout, a stage basement, a plane).

Everything is kept in the browser's `localStorage`. Nothing is uploaded and
there is no server side. Clearing site data erases it, so export JSON from the
JOB tab for anything worth keeping.

Not linked from any page on the site, same as `tools/instagram-picker/`.

## The four tabs

**SUMMARY** — working budget, actual to date, and what is left, then a
section-by-section rollup, the markup stack, the awards that make up the
working budget, and drift from the locked bid.

**BUDGET** — the estimate. Every line is `qty x units @ rate` with a live
total; edit any number in place and the section, hard cost and grand total
move as you type. PRICED LINES ONLY folds away the accounts this job never
used, without deleting them.

**ACTUALS** — the cost ledger. Filter by section, search by vendor, code,
invoice or date. Tap + to log a cost.

**JOB** — job details, fringe settings, export and import, print, and the
job switcher.

## How the money works

    estimate line    qty x units x rate
    section total    sum(lines) + P&W on the lines flagged for it
    hard cost        sum(sections)
    markup stack     each row is a percentage of the hard cost or of the
                     running total, or a flat amount
    grand total      hard cost + markup stack

    change order     awarded gross, less the markup the shop retains,
                     equals the spendable working budget
    actual entry     qty x rate, plus employer fringe when the payee is not
                     incorporated, or a manual override
    variance         working budget - actual to date

**Fringe / P&W.** On the estimate it is a single line per section, applied
only to the lines flagged for it, so a drive purchase sitting in an editorial
section does not carry pension and welfare. The sample job ran at 15.97%. On
the actual side it rides on each entry, switched off per entry when the payee
is incorporated. Rename it in JOB > Settings if your shop calls it something
else.

**Rounding.** The P&W line and any percentage in the markup stack round to
the dollar, the way the paper form does: the source bid carries P&W as 783 and
559, not 782.53 and 558.95, and its section subtotals are whole dollars
because of it. Flat amounts and actual entries keep their cents.

**Held costs.** An actual entry can be logged but kept out of the total
(uncheck "count toward the actual"). Use it for a quote you are holding
against, or a cost that may not land. Held amounts show separately under the
progress bar, so they are visible without moving the variance.

**Bid drift.** Locking the bid snapshots the hard cost. As the budget is
adjusted, the SUMMARY shows how far it has travelled from that baseline,
which is the number a client asks about when a change order is late.

## Templates

`templates.js` seeds the chart of accounts. All of it is editable afterwards:
templates are a starting point, not a schema.

- **Commercial / Film** — the AICP-style structure from the sample.
  A creative and production supervision (100), B design / animation /
  compositing (200), C previz / R&D (300), D editorial / color / finish (400),
  E miscellaneous (500), F film production (600), G sound (700).
- **Experiential / Live** — A supervision, B design and fabrication, C venue,
  permits and site, D technology, AV and show control, E staffing, talent and
  hospitality, F logistics, install and strike, G content capture and post.
- **Blank** — empty shells.

Add a template by adding a key to `TEMPLATES`; nothing else needs to change.

## The sample, and two places it does not reconcile

Loading the sample gives:

| | |
|---|---|
| hard cost estimate | 14,101 |
| grand estimate | 28,476 |
| working (spendable) | 47,200 |
| actual to date | 44,262.41 |
| variance | 2,937.59 |

Two things in the source workbook were hand-edited, and the app keeps them
visible rather than smoothing them over:

1. **The INSURANCE row was typed over.** Its printed label says 5%, but the
   cell holds a flat 2,000 weekend premium. Likewise the director's fee, rep
   fee and markup cells hold hand-entered amounts that do not reconcile to
   their printed percentages (8%, 8%, 20%). The sample seeds all four as flat
   amounts, which is what the paper actually says. Switch any row to a
   percentage to see what the formula would have produced.

2. **The shipping line had an empty total column,** so it silently dropped out
   of the E subtotal. The sample seeds it held instead: same result, but the
   twenty dollars is on screen rather than lost in a blank cell.

The workbook is on the Mac 1904 date system, so its serial dates read three
years later than a naive 1900-epoch conversion suggests. Its "TV aspect ratio"
cell reads 0.6729 because Excel parsed `16:9` as a time.

## Files

| File | Owns |
|------|------|
| `index.html` | shell: top bar, view, tab bar, sheet host |
| `app.js` | state, the calculation engine, all four views, import/export |
| `app.css` | everything visual, light and dark |
| `templates.js` | charts of accounts and the unit-type list |
| `sample.js` | the attached commercial actual, as data |
| `sw.js` | offline cache. Bump `CACHE` to ship an update |
| `manifest.webmanifest`, `icon.svg`, `icon-*.png` | install metadata |

## Notes

- Storage key is `budgetActual.v1`. Any change to the project shape needs a
  new key and a migration.
- The service worker only registers over http(s). Opened as a `file://` URL
  the app still runs; it just is not installable.
- CSV export writes the estimate and the ledger as two blocks in one file, so
  it opens cleanly in Excel or Sheets. JSON export is the full project and is
  what to use for moving a job between devices.
