// Stats dashboard. External so the admin page's CSP can forbid inline script.
const $ = (id) => document.getElementById(id);
  let chart;

  function rows(el, data, labelKey){
    el.innerHTML = data.length ? "" : '<tr><td class="muted">No data yet</td></tr>';
    data.forEach(d => {
      const tr = document.createElement("tr");
      tr.innerHTML = '<td>'+escapeHtml(String(d[labelKey]))+'</td><td class="n">'+d.c+'</td>';
      el.appendChild(tr);
    });
  }
  function escapeHtml(s){return s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}

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
    const mob = (d.devices.find(x=>x.device==="mobile")||{}).c || 0;
    const desk = (d.devices.find(x=>x.device==="desktop")||{}).c || 0;
    $("m-mob").textContent = mob.toLocaleString();
    $("m-desk").textContent = desk.toLocaleString();
    $("updated").textContent = "Updated " + new Date().toLocaleString();

    rows($("t-paths"), d.topPaths, "path");
    rows($("t-ref"), d.topReferrers, "ref");
    rows($("t-country"), d.topCountries, "country");

    const labels = d.byDay.map(x=>x.day);
    if (chart) chart.destroy();
    chart = new Chart($("chart"), {
      type: "line",
      data: { labels, datasets: [
        { label:"Visitors", data: d.byDay.map(x=>x.visitors), borderColor:"#39f08a", backgroundColor:"rgba(57,240,138,.14)", fill:true, tension:.3, pointRadius:2 },
        { label:"Views", data: d.byDay.map(x=>x.views), borderColor:"#9fb3c0", backgroundColor:"transparent", borderDash:[4,4], fill:false, tension:.3, pointRadius:0 }
      ]},
      options: { plugins:{ legend:{ labels:{ color:"#8a99a6", boxWidth:12 } } },
        scales:{ x:{ ticks:{ color:"#8a99a6", maxTicksLimit:8 }, grid:{ color:"rgba(255,255,255,.06)" } },
                 y:{ beginAtZero:true, ticks:{ color:"#8a99a6", precision:0 }, grid:{ color:"rgba(255,255,255,.06)" } } } }
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

  if (sessionStorage.getItem("bl_admin_key")) load().catch(()=>{ sessionStorage.removeItem("bl_admin_key"); });
