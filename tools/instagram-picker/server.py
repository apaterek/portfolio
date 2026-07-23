#!/usr/bin/env python3
"""Instagram picker — local server.

Serves the picker UI, proxies the Instagram Graph API (so the access token
never leaves this machine), and saves selected media into the portfolio's
media/images/instagram/ folder (Instagram's CDN blocks direct browser
downloads, so the save happens server-side).

Run:  python3 tools/instagram-picker/server.py
Open: http://127.0.0.1:8765
"""

import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = 8765
HERE = os.path.dirname(os.path.abspath(__file__))

# Default save folder: the portfolio's media tree when this tool lives inside
# it (tools/instagram-picker/), otherwise ~/Downloads/ig-picker for a
# standalone checkout. Override per-download via the SAVE TO field in the UI,
# or set IG_PICKER_DEST.
_PORTFOLIO_ROOT = os.path.dirname(os.path.dirname(HERE))
_PORTFOLIO_DEST = os.path.join(_PORTFOLIO_ROOT, "media", "images", "instagram")
DEST_DIR = (os.environ.get("IG_PICKER_DEST")
            or (_PORTFOLIO_DEST if os.path.isdir(os.path.join(_PORTFOLIO_ROOT, "media"))
                else os.path.expanduser("~/Downloads/ig-picker")))

GRAPH = "https://graph.instagram.com"
MEDIA_FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp"
CHILD_FIELDS = "id,media_type,media_url,thumbnail_url"
# Only ever download from Instagram's own CDNs — the proxy must not be usable
# to fetch arbitrary URLs.
ALLOWED_CDN_SUFFIXES = (".cdninstagram.com", ".fbcdn.net")
MAX_ITEMS = 2000


def graph_get(path, params):
    qs = urllib.parse.urlencode(params)
    req = urllib.request.Request(f"{GRAPH}{path}?{qs}", headers={"User-Agent": "ig-picker/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def fetch_all_media(token):
    """Fetch every post (paginated) and flatten carousels into child items."""
    items, url_params = [], {"fields": MEDIA_FIELDS, "limit": 100, "access_token": token}
    data = graph_get("/me/media", url_params)
    while True:
        for post in data.get("data", []):
            if post.get("media_type") == "CAROUSEL_ALBUM":
                kids = graph_get(f"/{post['id']}/children",
                                 {"fields": CHILD_FIELDS, "access_token": token}).get("data", [])
                for i, kid in enumerate(kids, 1):
                    items.append({**kid,
                                  "caption": post.get("caption"),
                                  "permalink": post.get("permalink"),
                                  "timestamp": post.get("timestamp"),
                                  "carousel": f"{i}/{len(kids)}",
                                  "parent_id": post["id"]})
            else:
                items.append(post)
            if len(items) >= MAX_ITEMS:
                return items
        next_url = data.get("paging", {}).get("next")
        if not next_url:
            return items
        req = urllib.request.Request(next_url, headers={"User-Agent": "ig-picker/1.0"})
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.loads(r.read().decode("utf-8"))


def cdn_allowed(url):
    host = urllib.parse.urlparse(url).hostname or ""
    return url.startswith("https://") and host.endswith(ALLOWED_CDN_SUFFIXES)


def safe_filename(name):
    name = re.sub(r"[^A-Za-z0-9._-]", "-", name).strip(".-")
    return name[:120] or "untitled"


def resolve_dest(dest):
    """Expand ~ and validate: must resolve to a folder inside the user's home."""
    path = os.path.realpath(os.path.expanduser(dest or DEST_DIR))
    home = os.path.realpath(os.path.expanduser("~"))
    if not (path == home or path.startswith(home + os.sep)):
        raise ValueError(f"Destination must be inside your home folder: {dest}")
    return path


def download_items(items, dest_dir):
    os.makedirs(dest_dir, exist_ok=True)
    results = []
    for it in items:
        url, fname = it.get("url", ""), safe_filename(it.get("filename", ""))
        entry = {"filename": fname}
        if not cdn_allowed(url):
            entry["error"] = "URL not on an Instagram CDN; refused"
        else:
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "ig-picker/1.0"})
                with urllib.request.urlopen(req, timeout=60) as r:
                    blob = r.read()
                path = os.path.join(dest_dir, fname)
                with open(path, "wb") as f:
                    f.write(blob)
                entry.update(saved=path, bytes=len(blob))
            except Exception as e:  # noqa: BLE001 — report per-file, keep going
                entry["error"] = str(e)
        results.append(entry)
    return results


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):  # quiet: never log query strings/tokens
        sys.stderr.write(f"{self.address_string()} {self.command} {self.path.split('?')[0]}\n")

    def _json(self, obj, status=200):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        length = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(length).decode("utf-8")) if length else {}

    def do_GET(self):
        if self.path == "/api/config":
            self._json({"default_dest": DEST_DIR})
        elif self.path in ("/", "/index.html"):
            with open(os.path.join(HERE, "index.html"), "rb") as f:
                body = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self._json({"error": "not found"}, 404)

    def do_POST(self):
        try:
            body = self._body()
            token = (body.get("token") or "").strip()
            if self.path == "/api/profile":
                self._json(graph_get("/me", {
                    "fields": "user_id,username,account_type,media_count",
                    "access_token": token}))
            elif self.path == "/api/media":
                self._json({"items": fetch_all_media(token)})
            elif self.path == "/api/download":
                dest_dir = resolve_dest(body.get("dest"))
                self._json({"results": download_items(body.get("items", []), dest_dir),
                            "dest": dest_dir})
            elif self.path == "/api/reveal":
                dest_dir = resolve_dest(body.get("dest"))
                if not os.path.isdir(dest_dir):
                    self._json({"error": "Folder does not exist yet (download something first)"}, 404)
                else:
                    subprocess.run(["open", dest_dir], check=False)
                    self._json({"opened": dest_dir})
            else:
                self._json({"error": "not found"}, 404)
        except urllib.error.HTTPError as e:
            try:
                detail = json.loads(e.read().decode("utf-8"))
            except Exception:  # noqa: BLE001
                detail = {"message": str(e)}
            self._json({"error": "instagram_api", "detail": detail}, e.code)
        except Exception as e:  # noqa: BLE001
            self._json({"error": str(e)}, 500)


if __name__ == "__main__":
    print(f"IG picker on http://127.0.0.1:{PORT}  →  saving to {DEST_DIR}")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
