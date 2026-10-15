// Stats dashboard. External so the admin page's CSP can forbid inline script.
const $ = (id) => document.getElementById(id);
  let chart, donut, recentRows = [], showAll = false;

  const ACTION_LABELS = {
    pdf_open: "Chapter PDF opened",
    audio_play: "Audio played",
    video_play: "Video played",
    outbound_click: "Outbound link",
    signup_submit: "Mailing-list sign-up",
  };
  const LANG_NAMES = { en: "English", es: "Spanish", fa: "Persian", fr: "French", pt: "Portuguese", zh: "Mandarin" };

  function escapeHtml(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}

  // A table of label + count, each row with a bar scaled to the largest value.
  function rows(el, data, labelOf, empty){
    el.innerHTML = data.length ? "" : '<tr><td class="muted">'+(empty||"No data yet")+'</td></tr>';
    const max = Math.max(1, ...data.map(d => d.c));
    data.forEach(d => {
      const tr = document.createElement("tr");
      const pct = Math.round(d.c / max * 100);
      tr.innerHTML = '<td class="bar"><div class="fill" style="width:'+pct+'%"></div><span>'+escapeHtml(labelOf(d))+'</span></td><td class="n">'+d.c.toLocaleString()+'</td>';
      el.appendChild(tr);
    });
  }

  // "+20%" / "-20%" / "new" against the previous period of the same length.
  function delta(el, cur, prev){
    el.className = "delta";
    if (prev === null || prev === undefined) { el.textContent = ""; return; }
    if (prev === 0) { el.textContent = cur > 0 ? "▲ new vs previous period" : "— vs previous period"; if (cur > 0) el.classList.add("up"); return; }
    const pct = Math.round((cur - prev) / prev * 100);
    if (pct === 0) { el.textContent = "0% vs previous period"; return; }
    el.textContent = (pct > 0 ? "▲ +" : "▼ ") + pct + "% vs previous period";
    el.classList.add(pct > 0 ? "up" : "down");
  }

  // Days with no traffic come back missing; fill them so the x-axis doesn't skip.
  // The server sends six extra days before the range, which feed the first
  // points of the 7-day average; they are dropped before plotting.
  function fillDays(byDay, days, now){
    const map = new Map(byDay.map(d => [d.day, d]));
    let count = days + 6;
    if (!days) { // all time: from the first recorded day to today
      if (!byDay.length) return [];
      count = Math.round((Date.parse(new Date(now).toISOString().slice(0, 10)) - Date.parse(byDay[0].day)) / 864e5) + 1;
    }
    const out = [];
    for (let i = count - 1; i >= 0; i--) {
      const day = new Date(now - i * 864e5).toISOString().slice(0, 10);
      out.push(map.get(day) || { day, views: 0, visitors: 0 });
    }
    // Each day's average covers that day and up to six before it.
    out.forEach((d, i) => {
      const win = out.slice(Math.max(0, i - 6), i + 1);
      d.avg7 = Math.round(win.reduce((n, x) => n + x.visitors, 0) / win.length * 10) / 10;
    });
    return days ? out.slice(6) : out;
  }

  function renderRecent(){
    const el = $("t-recent");
    const list = showAll ? recentRows : recentRows.slice(0, 15);
    if (!recentRows.length) { el.innerHTML = '<tr><td class="muted">No activity yet</td></tr>'; $("more").classList.add("hidden"); return; }
    el.innerHTML = '<tr><th>Time</th><th>Event</th><th>Page</th><th>Device</th><th>Location</th></tr>';
    list.forEach(e => {
      const tr = document.createElement("tr");
      const when = new Date(e.ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      const ev = e.kind === "action"
        ? '<span class="tag">'+escapeHtml(ACTION_LABELS[e.action] || e.action)+'</span>' + (e.target ? ' <span class="muted">'+escapeHtml(e.target)+'</span>' : "")
        : '<span class="muted">page view</span>';
      const dev = escapeHtml(e.device || "") + (e.browser ? ' <span class="muted">· '+escapeHtml(e.browser)+'</span>' : "");
      const loc = [e.city, e.country].filter(Boolean).map(escapeHtml).join(", ") || '<span class="muted">unknown</span>';
      tr.innerHTML = '<td class="muted">'+escapeHtml(when)+'</td><td>'+ev+'</td><td>'+escapeHtml(e.path)+'</td><td>'+dev+'</td><td>'+loc+'</td>';
      el.appendChild(tr);
    });
    const more = $("more");
    if (recentRows.length > 15) { more.classList.remove("hidden"); more.textContent = showAll ? "Show less" : "Show all " + recentRows.length; }
    else more.classList.add("hidden");
  }

  // "Don't count this browser": track.js checks this flag before sending anything.
  function excluded(){ try { return localStorage.getItem("bl_no_track") === "1"; } catch(_) { return false; } }
  function renderExclusion(){
    const off = excluded();
    $("ex-status").textContent = off ? "✓ This browser is not counted." : "This browser is currently counted.";
    $("ex-toggle").textContent = off ? "Count this browser again" : "Don't count this browser";
    $("ex-toggle").className = off ? "btn inline ghost" : "btn inline";
  }
  function toggleExclusion(){
    try {
      if (excluded()) localStorage.removeItem("bl_no_track");
      else localStorage.setItem("bl_no_track", "1");
    } catch(_) {
      $("ex-status").textContent = "This browser blocks site storage, so it can't be excluded.";
      return;
    }
    renderExclusion();
  }

  async function load(){
    const key = sessionStorage.getItem("bl_admin_key");
    const days = $("range") ? $("range").value : "30";
    const res = await fetch("/api/stats?days=" + days, { headers: { "x-admin-key": key } });
    if (res.status === 401) throw new Error("Wrong password.");
    if (!res.ok) throw new Error("Couldn't load stats.");
    const d = await res.json();

    $("gate").classList.add("hidden");
    $("dash").classList.remove("hidden");
    $("m-unique").textContent = d.unique.toLocaleString();
    $("m-views").textContent = d.views.toLocaleString();
    $("m-actions").textContent = d.actions.toLocaleString();
    delta($("d-unique"), d.unique, d.prev && d.prev.unique);
    delta($("d-views"), d.views, d.prev && d.prev.views);
    delta($("d-actions"), d.actions, d.prev && d.prev.actions);
    $("updated").textContent = "Updated " + new Date().toLocaleString();

    rows($("t-paths"), d.topPaths, x => x.path);
    rows($("t-lang"), d.languages, x => LANG_NAMES[x.lang] || x.lang);
    rows($("t-actions"), d.actionBreakdown, x => ACTION_LABELS[x.action] || x.action, "No actions recorded yet");
    rows($("t-browsers"), d.browsers, x => x.browser);
    rows($("t-ref"), d.topReferrers, x => x.ref, "No external referrers yet");
    rows($("t-country"), d.topCountries, x => x.country);
    recentRows = d.recent; showAll = false; renderRecent();

    const series = fillDays(d.byDay, d.days, d.now);
    if (chart) chart.destroy();
    chart = new Chart($("chart"), {
      type: "line",
      data: { labels: series.map(x=>x.day), datasets: [
        { label:"Visitors", data: series.map(x=>x.visitors), borderColor:"#39f08a", backgroundColor:"rgba(57,240,138,.14)", fill:true, tension:.3, pointRadius:2 },
        { label:"Views", data: series.map(x=>x.views), borderColor:"#9fb3c0", backgroundColor:"transparent", borderDash:[4,4], fill:false, tension:.3, pointRadius:0 },
        { label:"Visitors, 7-day average", data: series.map(x=>x.avg7), borderColor:"#ff4d4d", backgroundColor:"transparent", borderWidth:2.5, fill:false, tension:.3, pointRadius:0 }
      ]},
      options: { maintainAspectRatio:false, plugins:{ legend:{ labels:{ color:"#8a99a6", boxWidth:12 } } },
        scales:{ x:{ ticks:{ color:"#8a99a6", maxTicksLimit:8 }, grid:{ color:"rgba(255,255,255,.06)" } },
                 y:{ beginAtZero:true, ticks:{ color:"#8a99a6", precision:0 }, grid:{ color:"rgba(255,255,255,.06)" } } } }
    });

    if (donut) donut.destroy();
    donut = new Chart($("devices"), {
      type: "doughnut",
      data: { labels: d.devices.map(x => x.device || "unknown"),
        datasets: [{ data: d.devices.map(x => x.c), backgroundColor: ["#39f08a", "#9fb3c0", "#e0a93b", "#7c9cf5"], borderColor: "#141a20", borderWidth: 2 }] },
      options: { cutout: "62%", plugins: { legend: { position: "bottom", labels: { color: "#8a99a6", boxWidth: 12 } } } }
    });
  }

  async function unlock(){
    const key = $("pw").value.trim();
    if(!key) return;
    sessionStorage.setItem("bl_admin_key", key);
    $("err").textContent = "Checking…";
    try { await load(); } catch(e){ $("err").textContent = e.message; sessionStorage.removeItem("bl_admin_key"); }
  }

  $("unlock").addEventListener("click", unlock);
  $("pw").addEventListener("keydown", e => { if(e.key==="Enter") unlock(); });
  $("refresh").addEventListener("click", () => load().catch(()=>{}));
  $("range").addEventListener("change", () => load().catch(()=>{}));
  $("more").addEventListener("click", () => { showAll = !showAll; renderRecent(); });
  $("ex-toggle").addEventListener("click", toggleExclusion);
  renderExclusion();

  if (sessionStorage.getItem("bl_admin_key")) load().catch(()=>{ sessionStorage.removeItem("bl_admin_key"); });
