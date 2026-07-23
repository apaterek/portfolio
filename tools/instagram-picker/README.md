# IG Picker

Local tool: preview every image posted to your Instagram account, select the
ones you want, and save them at Instagram's highest stored quality. No
dependencies, no build step — plain Python 3 stdlib + one HTML page.

## Run

```
python3 server.py
```

Open http://127.0.0.1:8765, paste your access token, CONNECT.

Downloads default to the portfolio's `media/images/instagram/` when this tool
lives inside the portfolio repo, otherwise `~/Downloads/ig-picker`. Change the
folder any time with the SAVE TO field in the UI (persisted), or set the
`IG_PICKER_DEST` environment variable. OPEN IN FINDER reveals the current
folder.

Everything stays on this machine: the token is kept in the browser's
localStorage and sent only to the local server, which talks directly to
Instagram. The download proxy refuses any URL that is not on an Instagram CDN.

## One-time Instagram setup (~15 min)

Instagram retired API access for personal accounts (Basic Display API,
Dec 2024). The current route needs two things you do yourself:

1. **Switch your account to a professional (Creator) profile** — free,
   reversible. Instagram app: Settings > Account type and tools >
   Switch to professional account > Creator.

2. **Create a Meta developer app and generate a token**
   (wizard order per Meta's current docs, May 2025 revision)
   - developers.facebook.com > **Create App**
   - "Connect a business": choose **I don't want to connect a business
     portfolio yet** > Next (verification only matters for publishing).
   - "Select your use case": choose **Other** > Next. (There is no
     "Instagram" use case in the picker anymore.)
   - "Select your app type": choose **Business** > Next.
   - Add app name + contact email > Next. You land on the app dashboard.
   - On the dashboard's product list, scroll to the **Instagram** product
     tile ("Allow creators and businesses to manage messages...") and click
     **Set up**. This auto-adds "API setup with Instagram login".
   - Left menu: **Instagram > API setup with Instagram business login** >
     under "Generate access tokens" click **Add account**, log into your
     own Instagram, authorize. (Meta requires the added account to be
     public; if yours is private, set it public for this step.)
   - Click **Generate token** next to your account > log in again if
     prompted > copy the token (long-lived, ~60 days).
   - Permission scope involved: `instagram_business_basic` (read-only:
     profile + media). Nothing else. **Skip App Review and webhooks
     entirely** — those are only for shipping an app to other people;
     your own added account works in development mode.

The token lasts ~60 days. When it expires, generate a fresh one from the same
dashboard page (or refresh it via `GET graph.instagram.com/refresh_access_token
?grant_type=ig_refresh_token&access_token=...`).

## Notes

- Carousels are flattened: each frame is its own selectable tile (badge shows
  "2/5" etc.), so you pick exact frames.
- Videos appear with a VIDEO badge and download as .mp4 if selected.
- "Highest quality" means Instagram's stored maximum (typically 1080px wide);
  originals above that were downscaled at upload and are not retrievable via
  any API.
- Filenames: `ig-YYYYMMDD-<post-id>[-frame].jpg`.
