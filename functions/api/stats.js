// GET /api/stats — returns aggregated analytics as JSON.
// Protected by env.ADMIN_PASSWORD, sent as the "x-admin-key" request header.

const CREATE = `CREATE TABLE IF NOT EXISTS pageviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  path TEXT NOT NULL,
  referrer TEXT,
  country TEXT,
  device TEXT
)`;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = request.headers.get("x-admin-key") || url.searchParams.get("key") || "";

  if (!env.ADMIN_PASSWORD || key !== env.ADMIN_PASSWORD) {
    return json({ error: "unauthorized" }, 401);
  }
  if (!env.DB) return json({ error: "database not configured" }, 500);

  await env.DB.prepare(CREATE).run();

  const since30 = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const total = await env.DB.prepare("SELECT COUNT(*) AS c FROM pageviews").first();
  const last30 = await env.DB
    .prepare("SELECT COUNT(*) AS c FROM pageviews WHERE ts >= ?").bind(since30).first();
  const byDay = await env.DB
    .prepare("SELECT strftime('%Y-%m-%d', ts/1000, 'unixepoch') AS day, COUNT(*) AS c FROM pageviews WHERE ts >= ? GROUP BY day ORDER BY day")
    .bind(since30).all();
  const topPaths = await env.DB
    .prepare("SELECT path, COUNT(*) AS c FROM pageviews GROUP BY path ORDER BY c DESC LIMIT 10").all();
  const topReferrers = await env.DB
    .prepare("SELECT CASE WHEN referrer IS NULL OR referrer = '' THEN 'Direct / none' ELSE referrer END AS ref, COUNT(*) AS c FROM pageviews GROUP BY ref ORDER BY c DESC LIMIT 10").all();
  const topCountries = await env.DB
    .prepare("SELECT CASE WHEN country IS NULL OR country = '' THEN 'Unknown' ELSE country END AS country, COUNT(*) AS c FROM pageviews GROUP BY country ORDER BY c DESC LIMIT 10").all();
  const devices = await env.DB
    .prepare("SELECT device, COUNT(*) AS c FROM pageviews GROUP BY device").all();

  return json({
    total: total ? total.c : 0,
    last30: last30 ? last30.c : 0,
    byDay: byDay.results || [],
    topPaths: topPaths.results || [],
    topReferrers: topReferrers.results || [],
    topCountries: topCountries.results || [],
    devices: devices.results || [],
  });
}
