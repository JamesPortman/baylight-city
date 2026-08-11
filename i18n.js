/* Baylight language switcher (path-based).
   Each language is a real, pre-rendered page:
     English : /            and /prequel.html
     Others  : /<code>/     and /<code>/prequel/
   The translated HTML is generated at build time by tools/build-i18n.py, so the
   content is server-rendered per URL (good for SEO and sharing). This script only
   builds the language dropdown and NAVIGATES between those pages — it no longer
   translates text on the fly, so there is nothing to re-render on the client. */
(function () {
  var LANGS = [
    { code: "en", label: "English" },
    { code: "pt", label: "Português" },
    { code: "es", label: "Español" },
    { code: "fr", label: "Français" },
    { code: "zh", label: "中文" },
    { code: "fa", label: "فارسی" }
  ];
  var DEFAULT = "en";
  var STORE = "bl_lang";

  function has(c) { for (var i = 0; i < LANGS.length; i++) if (LANGS[i].code === c) return true; return false; }

  // Language prefix in the current path (/fr/… -> "fr"), else English.
  function currentLang() {
    var seg = location.pathname.split("/").filter(Boolean)[0];
    if (seg) { seg = seg.toLowerCase(); if (has(seg)) return seg; }
    return DEFAULT;
  }
  // "home" or "prequel", independent of language.
  function currentPage() {
    var seg = location.pathname.split("/").filter(Boolean);
    if (seg.length && has(seg[0].toLowerCase())) seg.shift();
    var rest = seg.join("/").toLowerCase().replace(/\/+$/, "");
    if (/(^|\/)prequel(\.html)?$/.test(rest)) return "prequel";
    return "home";
  }
  // Clean URL for a page in a language.
  function pagePath(page, code) {
    var base = (code === DEFAULT) ? "" : "/" + code;
    if (page === "prequel") return (code === DEFAULT) ? "/prequel" : base + "/prequel/";
    return base + "/";
  }


  function storedChoice() {
    try { var s = localStorage.getItem(STORE); return (s && has(s)) ? s : null; } catch (e) { return null; }
  }
  function browserLang() {
    var navs = navigator.languages || [navigator.language || "en"];
    for (var i = 0; i < navs.length; i++) {
      var c = (navs[i] || "").slice(0, 2).toLowerCase();
      if (has(c)) return c;
    }
    return DEFAULT;
  }
  // True when the visitor arrived from outside this site (external site, or a
  // direct/bookmark hit with no referrer). In-site navigation — including a
  // dropdown switch — is same-origin, so it never counts as an external landing.
  function externalLanding() {
    try {
      if (!document.referrer) return true;
      return new URL(document.referrer).origin !== location.origin;
    } catch (e) { return true; }
  }

  // Redirects, in priority order. The dropdown ALWAYS wins: choosing a language
  // stores it (see buildSelector), which permanently disables auto-localisation,
  // and an in-site switch is never treated as an external landing.
  function maybeRedirect() {
    var L = currentLang(), P = currentPage();
    // 1) old ?lang=xx links -> the clean path
    try {
      var q = new URLSearchParams(location.search).get("lang");
      if (q) { q = q.toLowerCase().slice(0, 2); if (has(q) && q !== L) { location.replace(pagePath(P, q) + location.hash); return true; } }
    } catch (e) {}
    // 2) first-visit localisation: only on the English page, only for a visitor
    //    who has never chosen a language AND is landing from outside the site.
    if (L === DEFAULT && !storedChoice() && externalLanding()) {
      var pref = browserLang();
      if (pref !== DEFAULT) { location.replace(pagePath(P, pref) + location.hash); return true; }
    }
    return false;
  }

  function buildSelector() {
    var L = currentLang(), P = currentPage();
    var host = document.querySelector("header .wrap") || document.body;
    var wrap = document.createElement("div"); wrap.id = "bl-lang";
    var sel = document.createElement("select"); sel.id = "bl-lang-select";
    sel.setAttribute("aria-label", "Language");
    for (var i = 0; i < LANGS.length; i++) {
      var o = document.createElement("option");
      o.value = LANGS[i].code; o.textContent = LANGS[i].label;
      if (LANGS[i].code === L) o.selected = true;
      sel.appendChild(o);
    }
    sel.addEventListener("change", function () {
      var code = sel.value;
      try { localStorage.setItem(STORE, code); } catch (e) {}
      window.location.href = pagePath(P, code);
    });
    wrap.appendChild(sel); host.appendChild(wrap);
    var st = document.createElement("style");
    st.textContent = "#bl-lang{margin-left:14px;display:inline-flex;align-items:center}" +
      "#bl-lang select{background:transparent;color:#8a99a6;border:1px solid rgba(255,255,255,.18);" +
      "border-radius:3px;font:12px/1 'JetBrains Mono',monospace;letter-spacing:.08em;padding:7px 8px;cursor:pointer}" +
      "#bl-lang select:hover{color:#39f08a;border-color:#1f7a4a}" +
      "#bl-lang option{background:#10151a;color:#e8edf1}" +
      "html[dir=rtl] #bl-lang{margin-left:0;margin-right:14px}";
    document.head.appendChild(st);
  }

  function init() { if (maybeRedirect()) return; buildSelector(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
