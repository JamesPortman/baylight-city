// POST /api/track — records one pageview into the D1 database.
// Bound database: env.DB (Cloudflare D1). No personal data stored — no IPs,
// no cookies, no visitor IDs; just path, referrer host, country, device.

const CREATE = `CREATE TABLE IF NOT EXISTS pageviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  path TEXT NOT NULL,
  referrer TEXT,
  country TEXT,
  device TEXT
)`;

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return new Response(null, { status: 204 });

  let body = {};
  try { body = await request.json(); } catch (_) {}

  let path = String(body.path || "/").slice(0, 512);
  if (path.startsWith("/admin")) return new Response(null, { status: 204 }); // don't count the dashboard

  // Reduce the referrer to a hostname (e.g. "www.google.com"); blank = direct.
  let referrer = "";
  try { referrer = body.referrer ? new URL(body.referrer).hostname : ""; } catch (_) {}

  const country = request.headers.get("cf-ipcountry") || "";
  const ua = request.headers.get("user-agent") || "";
  const device = /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? "mobile" : "desktop";

  try {
    await env.DB.prepare(CREATE).run();
    await env.DB
      .prepare("INSERT INTO pageviews (ts, path, referrer, country, device) VALUES (?, ?, ?, ?, ?)")
      .bind(Date.now(), path, referrer, country, device)
      .run();
  } catch (_) {
    return new Response(null, { status: 204 }); // never break the page over analytics
  }
  return new Response(null, { status: 204 });
}
