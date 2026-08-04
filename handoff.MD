# Portfolio — Handoff

Austin Paterek's personal portfolio. Framework-free static site (plain HTML/CSS/JS,
no build step), deployed on GitHub Pages: `apaterek/portfolio` →
apaterek.github.io/portfolio. A `CNAME` file now points the custom domain at
`www.austinpaterek.com` (added directly on GitHub, not yet confirmed live via DNS).
CLAUDE.md's planned `ksa.cool` domain has been superseded by this — flag if that's
not intentional.

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
work.html           Work grid — 4 poster cards, hover: poster → 1s clip → blurb,
                    plus a borderless clients/creators/platforms logo wall
work/               hyper-history · spread-the-happy · honda-backstage · off-the-plate
                    — each page has exactly 1 hero video (all 4 wired, see §4)
about.html          bio (rebuilt copy, anthropology-led framing), real portrait
                    (media/images/portrait.jpeg, not a placeholder), CV link,
                    focus + location
contact.html        mailto + LinkedIn (no footer, no form)
writing.html        Writing links (placeholder titles → real Medium URLs later);
                    unlinked from nav, reachable by direct URL
temporality-seafaring.html  standalone long-form writing page, linked from
                    writing.html ("Back to writing")
robots.txt          blocks all crawlers + named AI scrapers, with an explicit
                    Allow carve-out for LinkedInBot (link-preview/Post Inspector)
```

### Icons
`assets/icons/` — `favicon.ico` (16/24/32/48/64), `favicon-16.png`, `favicon-32.png`,
`apple-touch-icon.png` (180px). Generated from a face-focused crop of
`media/images/instagram/ig-20130405-17842851268039811.jpg` (a childhood photo already
used in the Home Instagram gallery). Linked via `<link rel="icon">` /
`<link rel="apple-touch-icon">` in every page's `<head>`.

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
  arrhythmic left/right nudge (`--sx`: alternating direction, random magnitude
  scaled to video width) so edges break past the video. No strokes.
  `ig-20130405…` is intentionally last (and is now also the favicon source).

- **Work cards** (`work.html`) — poster image + project name below. On
  hover the poster hard-cuts to a 1-second transition clip, then hard-cuts to
  the blurb (no fades — feels like the montage flurry). All four cards wired:
  honda→`honda-1-transition`, nutella→`nutella-transition`,
  google→`google-1-transition`, otp→`otp-1-transition`.
  - **Touch:** `touch-hold.js` bridges hover to press-and-hold (HOLD_MS=180).
    Tap navigates; hold triggers the clip/blurb and blocks the click. Same
    bridge powers the writing-link fill/invert via `.holding`.

- **Project-page hero videos** — each `work/*.html` page has exactly one
  `.media-frame` with a looping, muted, no-audio hero video (see §4 for sources).
  Honda Backstage's went through two re-sources this session (letterbox fix, then
  an in/out-trim correction) before landing on its current 18.4s full-bleed clip.

- **Autoplay** (`autoplay.js`) — iOS/Safari won't muted-autoplay (and shows a
  play icon) unless the video is muted as a JS *property*, not just the HTML
  attribute. The script force-sets `v.muted = true` then `play()` for every
  `<video autoplay>`, with a first-gesture fallback, loop restart, and
  visibility resume. Selects `video[autoplay]` only, so the hover-triggered work
  transition clips (which JS starts on hold, never autoplay) are excluded and
  untouched. Loaded on every page with an autoplay video, including all four
  `work/*.html` pages.

- **Borderless media** — all frame strokes removed site-wide (`.frame`,
  `.video-frame`, `.media-frame`, `.poster`). Backgrounds/overflow kept.
  project.css intentionally keeps text-divider borders (`.project-role`,
  `.about-meta`) and link underlines (`a.project-cta`, `.contact-link`).

- **robots.txt** — `Disallow: /` for all agents, plus explicit blocks for
  GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-Web, anthropic-ai,
  CCBot, Google-Extended, PerplexityBot, Amazonbot, Bytespider,
  Applebot-Extended, meta-externalagent. `LinkedInBot` is explicitly **allowed**
  (`Allow: /`) so LinkedIn's Post Inspector can render a preview card for the
  site when shared/Featured on a profile.

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

Current `media/video/web/` (all 720p24, no audio unless noted):
`ksa-water-loop.mp4` + poster, `google-work-loop.mp4`, `nutella-work-loop.mp4`,
`honda-work-loop.mp4` + poster (18.4s — re-sourced twice this session: first for
letterboxing, then for an incorrect Premiere trim; current source was
`honda-work-loop-3.mp4`), `otp-work-loop.mp4` + poster, and the four 1s hover
transition clips (`nutella-transition`, `honda-1-transition`,
`google-1-transition`, `otp-1-transition`).

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
- About page body copy was fully rewritten this session (anthropology-led
  framing, four paragraphs) — verbatim from Austin with only a comma-splice
  fixed to a semicolon. This is now the live source of truth for About; no
  further edits pending unless requested.

---

## 6. Git-ignored (internal, not published)

`docs/`, `copy/`, `CLAUDE.md`, `.claude/`, `media/video/source/`,
`media/video/personal-archive/`, `media/images/OTP/`. Never commit large raw
source videos. The CV lives git-ignored at `docs/cv/` — a published copy sits at
`assets/austin-paterek-cv.pdf` and is what About links to.

Working tree is clean and fully pushed as of this handoff (no outstanding local
edits).

---

## 7. Deploy state

Latest commit: `39f6b5a` — "Add site favicon from an Instagram childhood photo".
Pushed to `apaterek/portfolio` main. Recent history behind it: favicon rollout,
`robots.txt` LinkedInBot allowance, a `CNAME` → `www.austinpaterek.com` (added
directly on GitHub, outside this working session), the Honda hero video's trim
correction and earlier letterbox fix, and the Honda/Off The Plate hero-video +
About-copy commit.

---

## 8. Remaining / open

**Done since the handoff was last written:**
- ✅ **About body copy rewrite** — new four-paragraph bio, anthropology-led framing.
- ✅ **Honda Backstage + Off The Plate hero videos** — each project page now has
  exactly one autoplay/muted/loop hero video; all remaining placeholder frames
  removed site-wide (every `work/*.html` page has exactly 1 `.media-frame`).
- ✅ **Honda hero video letterboxing** — re-sourced from a corrected export.
- ✅ **Honda hero video trim correction** — re-sourced again after an incorrect
  Premiere in/out point produced a 2.7s loop; now 18.4s, correctly framed.
- ✅ **robots.txt LinkedInBot allowance** — added so LinkedIn's Post Inspector can
  generate a preview card for the site (Featured-section use case).
- ✅ **Site favicon** — generated from an Instagram childhood photo, wired into
  every page.

**Still open:**
- **Writing links** — `writing.html` still has placeholder titles; swap real Medium
  URLs as pieces publish (page is delinked from nav but retained for later).
- **Custom domain** — a `CNAME` now points at `www.austinpaterek.com` (added
  outside this session, superseding the CLAUDE.md-documented `ksa.cool` plan).
  Confirm DNS is actually pointed and the domain resolves before treating this
  as done; update CLAUDE.md once confirmed.
- **Image rights** — confirm before publishing any client campaign art (Honda,
  Ferrero, Google). Company logos on Work are third-party marks used to show past
  clients; confirm that usage is acceptable too before going live.
- **genAI image references** — `media/images/OTP/` is git-ignored, to be published
  later.
