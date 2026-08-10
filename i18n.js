/* Baylight lightweight i18n — English lives in the HTML; each other language is
   a JSON file in /i18n/<code>.json. Add a language by dropping in its JSON and
   adding one entry to LANGS below. No page duplication. */
(function () {
  // ===== Add languages here =====
  var LANGS = [
    { code: "en", label: "English" },
    { code: "pt", label: "Português" },
    { code: "es", label: "Español" },
    { code: "fr", label: "Français" },
    { code: "zh", label: "中文" },
    { code: "fa", label: "فارسی" }
  ];
  var RTL = { fa: 1 };   // right-to-left languages
  var DEFAULT = "en";
  var STORE = "bl_lang";

  var dicts = {};        // loaded JSON dictionaries by code
  var textNodes = [];    // {node, orig, key}
  var origHref = [];     // {el, orig}
  var origTitle = "";

  function norm(s) { return s.replace(/\s+/g, " ").trim(); }

  function collect() {
    origTitle = document.title;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = walker.nextNode())) {
      var p = n.parentNode; if (!p) continue;
      var tag = p.nodeName.toLowerCase();
      if (tag === "script" || tag === "style") continue;
      if (p.closest && p.closest("#bl-lang")) continue;
      var key = norm(n.nodeValue);
      if (!key) continue;
      textNodes.push({ node: n, orig: n.nodeValue, key: key });
    }
    var links = document.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) origHref.push({ el: links[i], orig: links[i].getAttribute("href") });
  }

  function restore() {
    for (var i = 0; i < textNodes.length; i++) textNodes[i].node.nodeValue = textNodes[i].orig;
    for (var j = 0; j < origHref.length; j++) origHref[j].el.setAttribute("href", origHref[j].orig);
    document.title = origTitle;
  }

  function applyDict(d, code) {
    var hrefs = d.__hrefs__ || {};
    for (var i = 0; i < textNodes.length; i++) {
      var t = textNodes[i], v = d[t.key];
      if (v != null) {
        var lead = (t.orig.match(/^\s*/) || [""])[0];
        var trail = (t.orig.match(/\s*$/) || [""])[0];
        t.node.nodeValue = lead + v + trail;
      } else {
        t.node.nodeValue = t.orig;
      }
    }
    for (var j = 0; j < origHref.length; j++) {
      var h = origHref[j];
      var nav = navHref(h.orig, code);          // in-language page navigation
      h.el.setAttribute("href", nav != null ? nav : (hrefs[h.orig] || h.orig));
    }
    if (d.__title__) document.title = d.__title__;
  }

  // ---- path-based language routing -------------------------------------------
  // Which same-site page a link/href points at, ignoring any language prefix.
  // Returns "home", "prequel", or null (external / asset / anchor).
  function linkPage(href) {
    if (!href) return null;
    if (/^(https?:|mailto:|tel:|data:|#)/i.test(href)) return null;
    var path = href.split("#")[0].split("?")[0].replace(/\/+$/, "");
    var seg = path.split("/").filter(Boolean);
    if (seg.length && has(seg[0])) seg.shift();      // drop leading /xx
    var rest = seg.join("/");
    if (rest === "" ) return "home";
    if (/(^|\/)index\.html$/.test(rest)) return "home";
    if (/(^|\/)prequel(\.html)?$/.test(rest)) return "prequel";
    return null;
  }
  // The clean URL for a page in a given language.
  function pagePath(page, code) {
    var base = (code === DEFAULT) ? "" : "/" + code;
    if (page === "prequel") return (code === DEFAULT) ? "/prequel.html" : base + "/prequel";
    return base + "/";
  }
  // Rewrite an in-site page link so navigation stays in the active language.
  function navHref(orig, code) {
    var page = linkPage(orig);
    return page ? pagePath(page, code) : null;
  }
  // Which page THIS document is (from the current address).
  function currentPage() {
    var p = linkPage(location.pathname);
    return p || "home";
  }
  function absUrl(path) { return location.origin.replace(/\/$/, "") + path; }

  function setLang(code) {
    document.documentElement.lang = code;
    document.documentElement.dir = RTL[code] ? "rtl" : "ltr";
    if (code === DEFAULT) { restore(); done(code); return; }
    if (dicts[code]) { applyDict(dicts[code], code); done(code); return; }
    fetch("/i18n/" + code + ".json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (j) { dicts[code] = j; applyDict(j, code); done(code); })
      .catch(function () { done(code); });
  }
  function done(code) {
    try { localStorage.setItem(STORE, code); } catch (e) {}
    var sel = document.getElementById("bl-lang-select"); if (sel) sel.value = code;
    updateUrl(code);
  }
  // Reflect the active language as a clean path (e.g. /fr/, /fr/prequel) so every
  // page is shareable as a direct link. English is the default and stays at the
  // root path. Also self-canonicalizes the page to the active-language URL.
  function updateUrl(code) {
    var path = pagePath(currentPage(), code);
    if (window.history && history.replaceState) {
      try { history.replaceState(null, "", path + location.search + location.hash); } catch (e) {}
    }
    var can = document.querySelector('link[rel="canonical"]');
    if (can) can.setAttribute("href", absUrl(path));
  }

  function pick() {
    // 1) language prefix in the path (/fr/…) — the canonical, shareable form
    try {
      var seg0 = location.pathname.split("/").filter(Boolean)[0];
      if (seg0) { seg0 = seg0.toLowerCase(); if (has(seg0)) return seg0; }
    } catch (e) {}
    // 2) ?lang= query — back-compat for older links; canonicalized to a path
    try { var u = new URLSearchParams(location.search).get("lang"); if (u) { u = u.toLowerCase().slice(0, 2); if (has(u)) return u; } } catch (e) {}
    // 3) saved preference, then 4) browser language
    try { var s = localStorage.getItem(STORE); if (s && has(s)) return s; } catch (e) {}
    var navs = navigator.languages || [navigator.language || "en"];
    for (var i = 0; i < navs.length; i++) {
      var c = (navs[i] || "").slice(0, 2).toLowerCase();
      if (has(c)) return c;
    }
    return DEFAULT;
  }
  function has(c) { for (var i = 0; i < LANGS.length; i++) if (LANGS[i].code === c) return true; return false; }

  function buildSelector() {
    var host = document.querySelector("header .wrap") || document.body;
    var wrap = document.createElement("div"); wrap.id = "bl-lang";
    var sel = document.createElement("select"); sel.id = "bl-lang-select";
    sel.setAttribute("aria-label", "Language");
    for (var i = 0; i < LANGS.length; i++) {
      var o = document.createElement("option");
      o.value = LANGS[i].code; o.textContent = LANGS[i].label;
      sel.appendChild(o);
    }
    sel.addEventListener("change", function () { setLang(sel.value); });
    wrap.appendChild(sel); host.appendChild(wrap);
    var st = document.createElement("style");
    st.textContent = "#bl-lang{margin-left:14px;display:inline-flex;align-items:center}" +
      "#bl-lang select{background:transparent;color:#8a99a6;border:1px solid rgba(255,255,255,.18);" +
      "border-radius:3px;font:12px/1 'JetBrains Mono',monospace;letter-spacing:.08em;padding:7px 8px;cursor:pointer}" +
      "#bl-lang select:hover{color:#39f08a;border-color:#1f7a4a}" +
      "#bl-lang option{background:#10151a;color:#e8edf1}" +
      // Right-to-left support (Farsi): flow prose the correct direction.
      "html[dir=rtl] body{direction:rtl}" +
      "html[dir=rtl] p,html[dir=rtl] h1,html[dir=rtl] h2,html[dir=rtl] h3,html[dir=rtl] .sec,html[dir=rtl] .sec-lead,html[dir=rtl] .eyebrow,html[dir=rtl] li,html[dir=rtl] blockquote{text-align:right}" +
      "html[dir=rtl] #bl-lang{margin-left:0;margin-right:14px}";
    document.head.appendChild(st);
  }

  function init() { collect(); buildSelector(); setLang(pick()); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
