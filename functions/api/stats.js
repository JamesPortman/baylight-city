// GET /api/stats?days=7|30|90|0  — aggregated analytics as JSON (days=0 = all time).
// Protected by env.ADMIN_PASSWORD, sent as the "x-admin-key" request header.

const CREATE = `CREATE TABLE IF NOT EXISTS pageviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  path TEXT NOT NULL,
  referrer TEXT,
  country TEXT,
  device TEXT,
  visitor TEXT
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

  if (!env.ADMIN_PASSWORD || key !== env.ADMIN_PASSWORD) return json({ error: "unauthorized" }, 401);
  if (!env.DB) return json({ error: "database not configured" }, 500);

  await env.DB.prepare(CREATE).run();
  try { await env.DB.prepare("ALTER TABLE pageviews ADD COLUMN visitor TEXT").run(); } catch (_) {}

  const allowed = [7, 30, 90, 0];
  let days = parseInt(url.searchParams.get("days") || "30", 10);
  if (!allowed.includes(days)) days = 30;
  const since = days > 0 ? Date.now() - days * 24 * 60 * 60 * 1000 : 0;

  const views = await env.DB.prepare("SELECT COUNT(*) AS c FROM pageviews WHERE ts >= ?").bind(since).first();
  const unique = await env.DB.prepare("SELECT COUNT(DISTINCT visitor) AS c FROM pageviews WHERE ts >= ? AND visitor IS NOT NULL").bind(since).first();
  const byDay = await env.DB
    .prepare("SELECT strftime('%Y-%m-%d', ts/1000, 'unixepoch') AS day, COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors FROM pageviews WHERE ts >= ? GROUP BY day ORDER BY day")
    .bind(since).all();
  const topPaths = await env.DB.prepare("SELECT path, COUNT(*) AS c FROM pageviews WHERE ts >= ? GROUP BY path ORDER BY c DESC LIMIT 10").bind(since).all();
  const topReferrers = await env.DB.prepare("SELECT CASE WHEN referrer IS NULL OR referrer = '' THEN 'Direct / none' ELSE referrer END AS ref, COUNT(*) AS c FROM pageviews WHERE ts >= ? GROUP BY ref ORDER BY c DESC LIMIT 10").bind(since).all();
  const topCountries = await env.DB.prepare("SELECT CASE WHEN country IS NULL OR country = '' THEN 'Unknown' ELSE country END AS country, COUNT(*) AS c FROM pageviews WHERE ts >= ? GROUP BY country ORDER BY c DESC LIMIT 10").bind(since).all();
  const devices = await env.DB.prepare("SELECT device, COUNT(*) AS c FROM pageviews WHERE ts >= ? GROUP BY device").bind(since).all();

  return json({
    days,
    views: views ? views.c : 0,
    unique: unique ? unique.c : 0,
    byDay: byDay.results || [],
    topPaths: topPaths.results || [],
    topReferrers: topReferrers.results || [],
    topCountries: topCountries.results || [],
    devices: devices.results || [],
  });
}
