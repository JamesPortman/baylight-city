# baylight.city

Built with [Claude Code](https://claude.com/claude-code).

The hub for *Baylight: After Image* — a near-future thriller told as a novella, an
audiobook and a microdrama series — served in English, Mandarin, Spanish, French,
Portuguese and Persian. Live at [baylight.city](https://baylight.city).

Hand-coded and static: no framework, no CMS. Everything the pages load — cover
and card images, chapter PDFs, the audiobook MP3s and the opening-credits MP4 —
lives in [`assets/`](assets/).

## Layout

- `index.html`, `prequel.html` — the English pages, written by hand.
- `es/`, `fa/`, `fr/`, `pt/`, `zh/` — translated pages generated from the English
  ones and the dictionaries in `i18n/` by `python3 tools/build-i18n.py`. Re-run it
  after editing English content or a dictionary; CI fails if the committed pages
  don't match a fresh build. A paragraph with inline markup is keyed by its whole
  text, tags removed, and its translation replaces the paragraph as plain text.
- `functions/api/` — Cloudflare Pages Functions for cookie-free analytics in a D1
  database (binding `DB`):
  - `POST /api/track` records a pageview or a visitor action, but only for the
    site's real pages (home and prequel, in English and each language); anything
    else is dropped. The actions are a chapter PDF opened, audio or video played,
    an outbound link clicked (host name only) and a mailing-list sign-up; each
    has a fixed shape for its target, and anything else is dropped too, as are
    bots and crawlers. Each row also keeps a coarse device (desktop, mobile,
    tablet), browser name, and Cloudflare's country and city. Visitors are
    counted by a daily-rotating hash; raw IPs are never stored. New columns are
    added to the existing table on first use (`MIGRATIONS` in both functions).
  - `GET /api/stats` returns aggregated stats, with the previous period of the
    same length for comparison. It requires the `ADMIN_PASSWORD` secret, sent in
    the `x-admin-key` header (not a query parameter), and refuses all requests
    when that secret is unset.
- `admin/` — the stats dashboard, which calls `/api/stats` with the password you
  enter: visitors, views and actions against the previous period, a daily chart,
  top pages, languages, visitor actions, devices and browsers, referrers,
  countries, and the latest 50 events. "Don't count this browser" sets a
  `localStorage` flag (`bl_no_track`) that `assets/js/track.js` checks before
  sending anything, so it works per browser without a cookie; it stops new
  events, and visits already recorded stay in the numbers.
- `_headers` — security headers for every page (`nosniff`, `Referrer-Policy`,
  `X-Frame-Options: SAMEORIGIN`, `Permissions-Policy`) and a
  Content-Security-Policy with `script-src 'self'`: no inline scripts or
  `on*=` handlers anywhere. Page behaviour lives in `assets/js/site.js`, the
  analytics beacon in `assets/js/track.js`, and the dashboard in
  `admin/admin.js` (with Chart.js vendored in `admin/vendor/` rather than
  loaded from a CDN). If you add a third-party embed or endpoint, add its
  origin to the policy.
- `tools/check-site.py` — run by CI on every push: fails on inline scripts or
  handlers, missing script files, or a policy that allows inline script.
- `_redirects` — intentionally empty of rules; Cloudflare Pages serves clean URLs
  on its own.

## License

The code is MIT — see [`LICENSE`](LICENSE). The story itself — text, translations,
chapter PDFs, audio, video and cover art — is © James Portman, all rights reserved;
see [`NOTICE`](NOTICE).
