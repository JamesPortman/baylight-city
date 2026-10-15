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

// Keep in step with the same list in track.js.
const MIGRATIONS = [
  "ALTER TABLE pageviews ADD COLUMN visitor TEXT",
  "ALTER TABLE pageviews ADD COLUMN kind TEXT NOT NULL DEFAULT 'pageview'",
  "ALTER TABLE pageviews ADD COLUMN action TEXT",
  "ALTER TABLE pageviews ADD COLUMN target TEXT",
  "ALTER TABLE pageviews ADD COLUMN browser TEXT",
  "ALTER TABLE pageviews ADD COLUMN city TEXT",
];

let schemaReady = false; // run CREATE/ALTER once per isolate, not per request

// Constant-time string comparison: hash both sides to fixed-length digests,
// then XOR every byte so timing doesn't depend on where they differ.
async function safeEqual(a, b) {
  const enc = new TextEncoder();
  const [da, db] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const x = new Uint8Array(da), y = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

const PV = "COALESCE(kind,'pageview') = 'pageview'";
const ACT = "kind = 'action'";
// First path segment when it's a translation, else English.
const LANG = "CASE WHEN substr(path,1,4) IN ('/es/','/fa/','/fr/','/pt/','/zh/') THEN substr(path,2,2) WHEN path IN ('/es','/fa','/fr','/pt','/zh') THEN substr(path,2,2) ELSE 'en' END";

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = request.headers.get("x-admin-key") || "";

  // Fail closed: no configured password means no access.
  if (!env.ADMIN_PASSWORD || !(await safeEqual(key, env.ADMIN_PASSWORD))) {
    return json({ error: "unauthorized" }, 401);
  }
  if (!env.DB) return json({ error: "database not configured" }, 500);
  const DB = env.DB;

  if (!schemaReady) {
    await DB.prepare(CREATE).run();
    for (const sql of MIGRATIONS) {
      try { await DB.prepare(sql).run(); } catch (_) {}
    }
    schemaReady = true;
  }

  const allowed = [7, 30, 90, 0];
  let days = parseInt(url.searchParams.get("days") || "30", 10);
  if (!allowed.includes(days)) days = 30;
  const now = Date.now();
  const span = days * 24 * 60 * 60 * 1000;
  const since = days > 0 ? now - span : 0;
  const prevSince = days > 0 ? since - span : 0;
  // The chart's 7-day average needs the six days before the range too.
  const trendSince = days > 0 ? since - 6 * 24 * 60 * 60 * 1000 : 0;

  const q = (sql, ...args) => DB.prepare(sql).bind(...args);
  const [
    views, prevViews, unique, prevUnique, actions, prevActions,
    byDay, topPaths, languages, actionRows, devices, browsers,
    topReferrers, topCountries, recent,
  ] = await DB.batch([
    q(`SELECT COUNT(*) AS c FROM pageviews WHERE ts >= ? AND ${PV}`, since),
    q(`SELECT COUNT(*) AS c FROM pageviews WHERE ts >= ? AND ts < ? AND ${PV}`, prevSince, since),
    q("SELECT COUNT(DISTINCT visitor) AS c FROM pageviews WHERE ts >= ? AND visitor IS NOT NULL", since),
    q("SELECT COUNT(DISTINCT visitor) AS c FROM pageviews WHERE ts >= ? AND ts < ? AND visitor IS NOT NULL", prevSince, since),
    q(`SELECT COUNT(*) AS c FROM pageviews WHERE ts >= ? AND ${ACT}`, since),
    q(`SELECT COUNT(*) AS c FROM pageviews WHERE ts >= ? AND ts < ? AND ${ACT}`, prevSince, since),
    q(`SELECT strftime('%Y-%m-%d', ts/1000, 'unixepoch') AS day, SUM(CASE WHEN ${PV} THEN 1 ELSE 0 END) AS views, COUNT(DISTINCT visitor) AS visitors FROM pageviews WHERE ts >= ? GROUP BY day ORDER BY day`, trendSince),
    q(`SELECT path, COUNT(*) AS c FROM pageviews WHERE ts >= ? AND ${PV} GROUP BY path ORDER BY c DESC LIMIT 10`, since),
    q(`SELECT ${LANG} AS lang, COUNT(*) AS c FROM pageviews WHERE ts >= ? AND ${PV} GROUP BY lang ORDER BY c DESC`, since),
    q(`SELECT action, COUNT(*) AS c FROM pageviews WHERE ts >= ? AND ${ACT} GROUP BY action ORDER BY c DESC`, since),
    q(`SELECT device, COUNT(*) AS c FROM pageviews WHERE ts >= ? AND ${PV} GROUP BY device ORDER BY c DESC`, since),
    q(`SELECT COALESCE(browser,'Unknown') AS browser, COUNT(*) AS c FROM pageviews WHERE ts >= ? AND ${PV} GROUP BY 1 ORDER BY c DESC`, since),
    q(`SELECT CASE WHEN referrer IS NULL OR referrer = '' THEN 'Direct / none' ELSE referrer END AS ref, COUNT(*) AS c FROM pageviews WHERE ts >= ? AND ${PV} GROUP BY ref ORDER BY c DESC LIMIT 10`, since),
    q(`SELECT CASE WHEN country IS NULL OR country = '' THEN 'Unknown' ELSE country END AS country, COUNT(*) AS c FROM pageviews WHERE ts >= ? AND ${PV} GROUP BY country ORDER BY c DESC LIMIT 10`, since),
    q("SELECT ts, COALESCE(kind,'pageview') AS kind, action, target, path, device, browser, city, country FROM pageviews WHERE ts >= ? ORDER BY ts DESC LIMIT 50", since),
  ]);

  const first = (r) => (r.results && r.results[0] ? r.results[0].c : 0) || 0;
  const all = (r) => r.results || [];

  return json({
    days,
    now,
    views: first(views),
    unique: first(unique),
    actions: first(actions),
    // No earlier period to compare "all time" with.
    prev: days > 0 ? { views: first(prevViews), unique: first(prevUnique), actions: first(prevActions) } : null,
    byDay: all(byDay),
    topPaths: all(topPaths),
    languages: all(languages),
    actionBreakdown: all(actionRows),
    devices: all(devices),
    browsers: all(browsers),
    topReferrers: all(topReferrers),
    topCountries: all(topCountries),
    recent: all(recent),
  });
}
