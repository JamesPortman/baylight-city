// POST /api/track — records one pageview into the D1 database.
// Cookie-free. For unique-visitor counting we store a daily-rotating one-way
// hash of (date + IP + user-agent); the raw IP is never stored, and the hash
// changes every day so it can't be used to follow someone over time.

const CREATE = `CREATE TABLE IF NOT EXISTS pageviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  path TEXT NOT NULL,
  referrer TEXT,
  country TEXT,
  device TEXT,
  visitor TEXT
)`;

async function visitorHash(request) {
  const ip = request.headers.get("cf-connecting-ip") || "";
  const ua = request.headers.get("user-agent") || "";
  const day = new Date().toISOString().slice(0, 10); // rotates daily (UTC)
  const data = new TextEncoder().encode(day + "|" + ip + "|" + ua + "|baylight-v1");
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return new Response(null, { status: 204 });

  let body = {};
  try { body = await request.json(); } catch (_) {}

  let path = String(body.path || "/").slice(0, 512);
  if (path.startsWith("/admin")) return new Response(null, { status: 204 });

  let referrer = "";
  try { referrer = body.referrer ? new URL(body.referrer).hostname : ""; } catch (_) {}

  const country = request.headers.get("cf-ipcountry") || "";
  const ua = request.headers.get("user-agent") || "";
  const device = /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? "mobile" : "desktop";
  const visitor = await visitorHash(request);

  const insert = () =>
    env.DB.prepare("INSERT INTO pageviews (ts, path, referrer, country, device, visitor) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(Date.now(), path, referrer, country, device, visitor).run();

  try {
    await env.DB.prepare(CREATE).run();
    try {
      await insert();
    } catch (_) {
      // Older DB created before the visitor column existed — add it once, then retry.
      try { await env.DB.prepare("ALTER TABLE pageviews ADD COLUMN visitor TEXT").run(); } catch (_) {}
      await insert();
    }
  } catch (_) {
    return new Response(null, { status: 204 }); // never break the page over analytics
  }
  return new Response(null, { status: 204 });
}
