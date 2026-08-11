#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Pre-render translated pages, one real HTML file per language + page.

  English (source, hand-authored):  index.html   prequel.html
  Generated per language <code>:     <code>/index.html   <code>/prequel/index.html

Text is translated using the same dictionaries the site already ships
(i18n/<code>.json) with the SAME rules the browser used (body text only, skip
<script>/<style>, whitespace-collapsed keys). Scripts, attributes, layout and
whitespace are preserved byte-for-byte outside the translated text runs.

Re-run after editing English content or the dictionaries:
    python3 tools/build-i18n.py
"""
import json, os, re, html

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SITE = "https://baylight.city"
LANGS = ["pt", "es", "fr", "zh", "fa"]
RTL = {"fa"}
PAGES = {"home": "index.html", "prequel": "prequel.html"}

# Translated <head> metadata (not covered by the body dictionaries).
HEAD = {
 "fr": {
  "home": ("Baylight After Image — un roman de James Portman",
           "La ville ne punit pas. Elle aide. Un thriller de surveillance en futur proche, signé James Portman — lisez le roman, écoutez le livre audio, regardez le microdrame.",
           "Baylight After Image", "La ville ne punit pas. Elle aide."),
  "prequel": ("Enregistrement original — une préquelle de Baylight par James Portman",
           "Enregistrement original — une préquelle gratuite de Baylight After Image. Une comédienne de doublage entend sa propre chaleur transformée en instrument de docilité de la ville.",
           "Enregistrement original — une préquelle de Baylight",
           "Ils n’ont pas volé une voix. Ils ont volé une façon de prendre soin.")},
 "es": {
  "home": ("Baylight After Image — una novela de James Portman",
           "La ciudad no castiga. Ayuda. Un thriller de vigilancia de un futuro cercano, de James Portman — lee la novela, escucha el audiolibro, mira el microdrama.",
           "Baylight After Image", "La ciudad no castiga. Ayuda."),
  "prequel": ("Grabación original — una precuela de Baylight por James Portman",
           "Grabación original — una precuela gratuita de Baylight After Image. Una actriz de voz oye su propia calidez convertida en el instrumento de obediencia de la ciudad.",
           "Grabación original — una precuela de Baylight",
           "No robaron una voz. Robaron una forma de cuidar.")},
 "pt": {
  "home": ("Baylight After Image — um romance de James Portman",
           "A cidade não pune. Ela ajuda. Um thriller de vigilância num futuro próximo, de James Portman — leia o romance, ouça o audiolivro, assista ao microdrama.",
           "Baylight After Image", "A cidade não pune. Ela ajuda."),
  "prequel": ("Gravação original — uma prequela de Baylight por James Portman",
           "Gravação original — uma prequela gratuita de Baylight After Image. Uma dubladora ouve o próprio acolhimento transformado no instrumento de obediência da cidade.",
           "Gravação original — uma prequela de Baylight",
           "Não roubaram uma voz. Roubaram um modo de cuidar.")},
 "zh": {
  "home": ("Baylight After Image — 詹姆斯·波特曼的长篇小说",
           "城市不惩罚。它帮助你。詹姆斯·波特曼的近未来监控惊悚小说——阅读小说、收听有声书、观看微剧。",
           "Baylight After Image", "城市不惩罚。它帮助你。"),
  "prequel": ("原始录音 — Baylight 前传，詹姆斯·波特曼著",
           "原始录音 — Baylight After Image 的免费前传。一位配音女演员听见自己的温柔被改造成城市的顺从工具。",
           "原始录音 — 一部 Baylight 前传",
           "他们偷走的不是一个声音，而是一种关怀的方式。")},
 "fa": {
  "home": ("Baylight After Image — رمانی از جیمز پورتمن",
           "شهر مجازات نمی‌کند. کمک می‌کند. یک تریلرِ نظارتیِ آینده‌ی نزدیک از جیمز پورتمن — رمان را بخوانید، کتابِ صوتی را بشنوید، میکرودراما را تماشا کنید.",
           "Baylight After Image", "شهر مجازات نمی‌کند. کمک می‌کند."),
  "prequel": ("ضبطِ اصلی — پیش‌درآمدی بر Baylight از جیمز پورتمن",
           "ضبطِ اصلی — پیش‌درآمدی رایگان بر Baylight After Image. یک صداپیشه می‌شنود که گرمای خودش به ابزارِ فرمان‌برداریِ شهر بدل شده است.",
           "ضبطِ اصلی — پیش‌درآمدی بر Baylight",
           "آن‌ها یک صدا را ندزدیدند. آن‌ها شیوه‌ای از مراقبت را دزدیدند.")},
}

# ---- routing helpers (mirror i18n.js) --------------------------------------
def link_page(href):
    if not href or re.match(r'^(https?:|mailto:|tel:|data:|#)', href, re.I):
        return None
    path = href.split("#")[0].split("?")[0].rstrip("/")
    seg = [s for s in path.split("/") if s]
    if seg and seg[0].lower() in (["en"] + LANGS):
        seg = seg[1:]
    rest = "/".join(seg)
    if rest == "":
        return "home"
    if re.search(r'(^|/)index\.html$', rest):
        return "home"
    if re.search(r'(^|/)prequel(\.html)?$', rest):
        return "prequel"
    return None

def page_path(page, code):
    base = "" if code == "en" else "/" + code
    if page == "prequel":
        return "/prequel" if code == "en" else base + "/prequel/"
    return base + "/" if base else "/"

# ---- transforms ------------------------------------------------------------
def translate_body(s, dct):
    lo = s.lower()
    b0 = lo.find("<body"); b0 = s.find(">", b0) + 1
    b1 = lo.find("</body>")
    head, body, tail = s[:b0], s[b0:b1], s[b1:]
    out = []; pos = 0; skip = 0
    for m in re.finditer(r'<[^>]+>', body, re.S):
        text = body[pos:m.start()]; tag = m.group(0); low = tag.lower()
        if text:
            if skip == 0:
                out.append(_seg(text, dct))
            else:
                out.append(text)
        if re.match(r'<script(\s|>)', low): skip += 1
        elif low.startswith('</script'): skip = max(0, skip - 1)
        elif re.match(r'<style(\s|>)', low): skip += 1
        elif low.startswith('</style'): skip = max(0, skip - 1)
        out.append(tag); pos = m.end()
    rest = body[pos:]
    out.append(_seg(rest, dct) if skip == 0 else rest)
    return head + "".join(out) + tail

def _seg(text, dct):
    key = re.sub(r'\s+', ' ', html.unescape(text)).strip()
    if not key: return text
    v = dct.get(key)
    if v is None: return text
    lead = re.match(r'\s*', text).group(0)
    trail = re.search(r'\s*$', text).group(0)
    return lead + html.escape(v, quote=False) + trail

def rewrite_hrefs(s, lang, hrefs):
    def fix_tag(m):
        tag = m.group(0)
        def fix_href(hm):
            x = hm.group(1)
            if x in hrefs:
                nx = hrefs[x]
            else:
                p = link_page(x)
                nx = page_path(p, lang) if p else x
            return 'href="' + nx + '"'
        return re.sub(r'href="([^"]*)"', fix_href, tag)
    return re.sub(r'<[^>]+>', fix_tag, s)

def set_html_lang_dir(s, lang):
    dir_attr = ' dir="rtl"' if lang in RTL else ''
    return re.sub(r'<html[^>]*>', '<html lang="%s"%s>' % (lang, dir_attr), s, count=1)

def set_canonical(s, url):
    return re.sub(r'(<link\s+rel="canonical"\s+href=")([^"]*)(")',
                  lambda m: m.group(1) + url + m.group(3), s, count=1)

def set_title(s, val):
    return re.sub(r'<title>.*?</title>', lambda m: '<title>' + html.escape(val, quote=False) + '</title>', s, count=1, flags=re.S)

def set_meta(s, kind, name, val):
    pat = r'(<meta\s+%s="%s"\s+content=")(.*?)(")' % (kind, re.escape(name))
    return re.sub(pat, lambda m: m.group(1) + html.escape(val, quote=True) + m.group(3), s, count=1, flags=re.S)

def inject_rtl(s):
    css = ('<style id="bl-rtl">html[dir=rtl] body{direction:rtl}'
           'html[dir=rtl] p,html[dir=rtl] h1,html[dir=rtl] h2,html[dir=rtl] h3,'
           'html[dir=rtl] .sec,html[dir=rtl] .sec-lead,html[dir=rtl] .eyebrow,'
           'html[dir=rtl] li,html[dir=rtl] blockquote{text-align:right}</style>\n')
    return s.replace('</head>', css + '</head>', 1)

def build_page(src, page, lang, dct):
    title, desc, ogt, ogd = HEAD[lang][page]
    s = translate_body(src, dct)
    s = rewrite_hrefs(s, lang, dct.get("__hrefs__", {}))
    s = set_html_lang_dir(s, lang)
    s = set_canonical(s, SITE + page_path(page, lang))
    s = set_title(s, title)
    s = set_meta(s, "name", "description", desc)
    s = set_meta(s, "property", "og:title", ogt)
    s = set_meta(s, "property", "og:description", ogd)
    if lang in RTL:
        s = inject_rtl(s)
    return s

def main():
    src = {p: open(os.path.join(ROOT, f), encoding="utf-8").read() for p, f in PAGES.items()}
    n = 0
    for lang in LANGS:
        dct = json.load(open(os.path.join(ROOT, "i18n", lang + ".json"), encoding="utf-8"))
        # home -> <lang>/index.html
        os.makedirs(os.path.join(ROOT, lang), exist_ok=True)
        open(os.path.join(ROOT, lang, "index.html"), "w", encoding="utf-8").write(build_page(src["home"], "home", lang, dct))
        # prequel -> <lang>/prequel/index.html
        os.makedirs(os.path.join(ROOT, lang, "prequel"), exist_ok=True)
        open(os.path.join(ROOT, lang, "prequel", "index.html"), "w", encoding="utf-8").write(build_page(src["prequel"], "prequel", lang, dct))
        n += 2
        print("built", lang + "/index.html", "+", lang + "/prequel/index.html")
    print("done:", n, "pages")

if __name__ == "__main__":
    main()
