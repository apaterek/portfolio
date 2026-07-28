# Portfolio — Handoff

Austin Paterek's personal portfolio. Framework-free static site (plain HTML/CSS/JS,
no build step), deployed on GitHub Pages: `apaterek/portfolio` →
apaterek.github.io/portfolio, with `ksa.cool` planned as the custom domain.

> The authoritative design-system and copy rules live in [CLAUDE.md](CLAUDE.md).
> This file is the working-state snapshot: what's built, what's decided, what's left.

---

## 1. How to run

No bundler. Preview with any static server from the repo root:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. (`npx serve` works too.)

Note: the in-app preview pane auto-pauses videos and aggressively caches CSS/JS,
which produces false "it's not looping / not updating" symptoms. Verify real
behavior in a normal browser (hard-refresh or incognito), or by inspecting the
deployed files directly. GitHub Pages serves `cache-control: max-age=600`, so
Chrome will hold the old HTML for ~10 min — hard-refresh after every push.

---

## 2. Architecture — one source of truth

The golden rule (see CLAUDE.md): **never re-declare tokens, base layout, or
component CSS inside a page.** Everything shared lives in the files below; tweak
the shared file and every page updates.

### Shared CSS (`assets/css/`)
| File | Owns |
|------|------|
| `tokens.css`     | colors, type scale, spacing, `--large`, contour dials |
| `base.css`       | reset, grid container, header/nav, main grid; touch-callout suppression |
| `components.css` | goo filter, contour link, writing-link fill/invert hover (+ `.holding` touch equivalent) |
| `home.css`       | plain water-hero frame (index-alt.html) |
| `project.css`    | about/contact + `work/` project-page content layout |
| `reveal.css`     | shared reveal hero (frame, hint, line, word) — index + construction |
| `work.css`       | Work grid poster-image cards + hover blurb, hard-cut swaps |

### Shared JS (`assets/js/`)
| File | Owns |
|------|------|
| `contour-links.js` | injects `#round` goo filter, clones silhouette layer, applies askew nudge |
| `reveal.js`        | 9-colour palette, arrhythmic colour cycler, `fitToFrame` |
| `touch-hold.js`    | press-and-hold → hover bridge for touch devices |
| `autoplay.js`      | site-wide muted-autoplay fix for every `<video autoplay>` |

### Page inventory
```
index.html          Home — word-over-video reveal (CREATIVE/STRATEGY/CONTENT/
                    EXPERIENCE), then header + instagram gallery. Session-skip.
index-alt.html      alternate Home — plain looping water hero (home.css)
construction.html   KSA under-construction teaser (shares reveal system)
work.html           Work grid — 4 poster cards, hover: poster → 1s clip → blurb
work/               hyper-history · spread-the-happy · honda-backstage · off-the-plate
about.html          bio, portrait placeholder, CV link, focus + location
contact.html        mailto + LinkedIn (no footer, no form)
writing.html        Writing links (placeholder titles → real Medium URLs later)
robots.txt          blocks all crawlers + named AI scrapers
```

---

## 3. Key behaviors

- **Home reveal** (`index.html`) — opens on "Click Anywhere" over the looping
  water. Each click reveals one word centered *over* the video (CREATIVE →
  STRATEGY → CONTENT → EXPERIENCE), each coloured from the shared 9-colour
  palette (arrhythmic: never one of the last 3). No shadow/scrim — *style over
  legibility*. The click after EXPERIENCE removes the word and, at the same
  moment, brings in the header and the whole photo gallery.
  - **Session-skip:** the reveal runs once per browser session
    (`sessionStorage['ksaHomeRevealDone']`). Navigating Home from any other page
    (or reloading) within the same session lands directly on the finished state,
    applied before first paint (no flash). A new session shows the reveal again.

- **Instagram gallery** (below the water loop) — 13 images, varied heights via a
  per-image `--ihf` (fraction of the live video height, so none is ever taller
  than the video). JS measures the frame to set `--video-h`, and applies the
  writing.html arrhythmic left/right nudge (`--sx`: alternating direction,
  random magnitude scaled to video width) so edges break past the video. No
  strokes. `ig-20130405…` is intentionally last.

- **Work cards** (`work.html`) — poster image + project name below. On
  hover the poster hard-cuts to a 1-second transition clip, then hard-cuts to
  the blurb (no fades — feels like the montage flurry). All four cards wired:
  honda→`honda-1-transition`, nutella→`nutella-transition`,
  google→`google-1-transition`, otp→`otp-1-transition`.
  - **Touch:** `touch-hold.js` bridges hover to press-and-hold (HOLD_MS=180).
    Tap navigates; hold triggers the clip/blurb and blocks the click. Same
    bridge powers the writing-link fill/invert via `.holding`.

- **Autoplay** (`autoplay.js`) — iOS/Safari won't muted-autoplay (and shows a
  play icon) unless the video is muted as a JS *property*, not just the HTML
  attribute. The script force-sets `v.muted = true` then `play()` for every
  `<video autoplay>`, with a first-gesture fallback, loop restart, and
  visibility resume. Selects `video[autoplay]` only, so the hover-triggered work
  transition clips (which JS starts on hold, never autoplay) are excluded and
  untouched. Loaded on: index, index-alt, construction, work/hyper-history,
  work/spread-the-happy.

- **Borderless media** — all frame strokes removed site-wide (`.frame`,
  `.video-frame`, `.media-frame`, `.poster`). Backgrounds/overflow kept.
  project.css intentionally keeps text-divider borders (`.project-role`,
  `.about-meta`) and link underlines (`a.project-cta`, `.contact-link`).

- **robots.txt** — `Disallow: /` for all agents, plus explicit blocks for
  GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-Web, anthropic-ai,
  CCBot, Google-Extended, PerplexityBot, Amazonbot, Bytespider,
  Applebot-Extended, meta-externalagent.

---

## 4. Media pipeline

No Homebrew on this machine. ffmpeg comes from the `imageio-ffmpeg` pip package
(static binary, user space):

```bash
python3 -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"
```

- Raw AI renders (Firefly/Luma/Kling) → `media/video/source/` (git-ignored,
  never published). Transcode to web H.264 → `media/video/web/`.
- AI renders are **10-bit HDR (bt2020/PQ)** — a naive 8-bit convert looks washed
  out. Tone-map HDR→SDR before `format=yuv420p` (full command in CLAUDE.md §Media).
- Web transcode flags: `-c:v libx264 -profile:v high -level 4.1 -pix_fmt
  yuv420p -movflags +faststart -r 24 -an -crf 20/23 -preset slow`, scale 1280:720.
- Extract a poster JPG alongside every web video. Prefer muted looping `<video>`
  over GIF. Reapply grain after AI generation.
- Transition clips are montage-style: extract N frames per segment, assemble at
  24fps. Nutella = 8 segments × 3 frames = 1s.

Current `media/video/web/`: `ksa-water-loop.mp4` + poster,
`nutella-transition.mp4` (1s), `honda-1-transition.mp4`, `google-1-transition.mp4`,
`otp-1-transition.mp4` (all 1s 720p, no audio), `google-work-loop.mp4`,
`nutella-work-loop.mp4`.

---

## 5. Copy & credit rules (see copy/portfolio-copy.md)

- **No em dashes** in on-page copy — not Austin's style. Commas/colons/parens
  instead. (En dashes and hyphens in ranges/compounds are fine.)
- Precise verbs, no overreach — name what was actually owned ("part of the
  producing team" where shared).
- Nutella S1 and S2 metrics stay **separate**; S1 metrics belong to the series,
  not an individual.
- **Honda Backstage has no performance metrics** — the 58.2M / 142% figures are a
  different agency/era and must not be attached here. Do not invent a stat line.
- Confirm image usage rights before publishing client campaign art (Honda,
  Ferrero, Google retain rights) via the warm agency relationships (BPS,
  1stAveMachine, Uproxx).

---

## 6. Git-ignored (internal, not published)

`docs/`, `copy/`, `CLAUDE.md`, `.claude/`, `media/video/source/`,
`media/video/personal-archive/`. Never commit large raw source videos. The CV
lives git-ignored at `docs/cv/` — a published copy was placed at
`assets/austin-paterek-cv.pdf` and is what About links to.

**Uncommitted local change:** `.gitignore` has `writing/` added to the internal
working-notes block (so `writing/PhD-Proposal.pdf` stops showing as untracked).
This edit is **local and unstaged** (`M .gitignore`), not yet committed or
pushed. `writing/` is a personal doc, unrelated to the site's `writing.html`
page — usage to be decided in a follow-up session.

---

## 7. Deploy state

Latest relevant commit: `3536b93` — "Fix mobile autoplay: force muted property
so iOS drops the play icon" (created `autoplay.js`, wired it site-wide, added
`webkit-playsinline` to the hero, removed the index inline loop guard). Pushed to
`apaterek/portfolio` main.

---

## 8. Remaining / open

Reconciled to the current branch (post-`33538a0`, through the Writing-nav removal +
Work logo-wall commit).

**Done since the handoff was first written:**
- ✅ **Project page URLs** — hyper-history → youtu.be/F2ZdoSByqy0, spread-the-happy
  → youtu.be/McOeZQRPPIU, off-the-plate → vimeo.com/335994237 ("Watch the sizzle →").
  honda-backstage has **no CTA by design** (series no longer hosted by the client).
- ✅ **Project page second frames** — resolved by **removal** (`562a759`): the second
  `.media-frame` placeholder was dropped from every project page (Off The Plate's
  single frame kept). No second frames pending.
- ✅ **Temporality writing page** — `temporality-seafaring.html` added + linked from
  writing.html.
- ✅ **Writing removed from nav site-wide** — nav is now HOME / ABOUT / WORK / CONTACT
  (4 items; `base.css` divisor updated `/5`→`/4`). `writing.html` +
  `temporality-seafaring.html` are **kept** (local + GitHub), reachable by direct URL
  / the in-page "Back to writing" link, just unlinked from menus.
- ✅ **Work logo wall** — `work.html` now shows a borderless "Amazing clients,
  creators, and platforms I've worked with." grid of all `media/images/companies/`
  logos below the project cards, capped to a poster's width (`--clients-w`).
- ✅ **Home hero composite / Reel page** — dropped from scope (no longer a to-do).
  The water loop stays as the live hero.

**Still open:**
- **Writing links** — `writing.html` still has placeholder titles; swap real Medium
  URLs as pieces publish (page is delinked from nav but retained for later).
- **Custom domain** — `ksa.cool` not yet pointed at Pages.
- **Image rights** — confirm before publishing any client campaign art (Honda,
  Ferrero, Google). Company logos on Work are third-party marks used to show past
  clients; confirm that usage is acceptable too before going live.
- ✅ **Logo-wall cleanup** — the 10 white-background logos (critical, food, history,
  netflix, pokemon, t-group, uproxx, wb, youtube, ae-networks) had their white
  removed and were re-saved as trimmed transparent **`.svg`** (raster embedded via
  base64 data-URI + tight viewBox: no vector tracer on this machine, and tracing
  multicolor wordmarks would degrade them). The 5 already-transparent logos were
  trimmed in place to equalize sizing. **HBO Max and Vernon Films are intentionally
  kept as colored tiles** (their backgrounds are brand color, not white). The old
  raster originals for the converted logos were deleted.
- **genAI image references** — `media/images/OTP/` is git-ignored, to be published
  later.
