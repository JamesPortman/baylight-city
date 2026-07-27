/* Baylight lightweight i18n — English lives in the HTML; each other language is
   a JSON file in /i18n/<code>.json. Add a language by dropping in its JSON and
   adding one entry to LANGS below. No page duplication. */
(function () {
  // ===== Add languages here =====
  var LANGS = [
    { code: "en", label: "EN" },
    { code: "pt", label: "PT" },
    { code: "es", label: "ES" },
    { code: "fr", label: "FR" },
    { code: "zh", label: "中文" }
  ];
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

  function applyDict(d) {
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
      h.el.setAttribute("href", hrefs[h.orig] || h.orig);
    }
    if (d.__title__) document.title = d.__title__;
  }

  function setLang(code) {
    document.documentElement.lang = code;
    if (code === DEFAULT) { restore(); done(code); return; }
    if (dicts[code]) { applyDict(dicts[code]); done(code); return; }
    fetch("/i18n/" + code + ".json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (j) { dicts[code] = j; applyDict(j); done(code); })
      .catch(function () { done(code); });
  }
  function done(code) {
    try { localStorage.setItem(STORE, code); } catch (e) {}
    var sel = document.getElementById("bl-lang-select"); if (sel) sel.value = code;
  }

  function pick() {
    try { var u = new URLSearchParams(location.search).get("lang"); if (u) { u = u.toLowerCase().slice(0, 2); if (has(u)) return u; } } catch (e) {}
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
      "#bl-lang option{background:#10151a;color:#e8edf1}";
    document.head.appendChild(st);
  }

  function init() { collect(); buildSelector(); setLang(pick()); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
