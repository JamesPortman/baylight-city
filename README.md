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
  after editing English content or a dictionary.
- `functions/api/` — Cloudflare Pages Functions for cookie-free analytics in a D1
  database (binding `DB`):
  - `POST /api/track` records a pageview, but only for the site's real pages
    (home and prequel, in English and each language); anything else is dropped.
    Visitors are counted by a daily-rotating hash; raw IPs are never stored.
  - `GET /api/stats` returns aggregated stats. It requires the `ADMIN_PASSWORD`
    secret, sent in the `x-admin-key` header (not a query parameter), and refuses
    all requests when that secret is unset.
- `admin/` — the stats dashboard, which calls `/api/stats` with the password you
  enter.
- `_headers` — security headers for every page (`nosniff`, `Referrer-Policy`,
  `X-Frame-Options: SAMEORIGIN`, `Permissions-Policy`); no CSP yet.
- `_redirects` — intentionally empty of rules; Cloudflare Pages serves clean URLs
  on its own.

## License

The code is MIT — see [`LICENSE`](LICENSE). The story itself — text, translations,
chapter PDFs, audio, video and cover art — is © James Portman, all rights reserved;
see [`NOTICE`](NOTICE).
