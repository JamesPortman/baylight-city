#!/usr/bin/env python3
# Fails if any page links to a local file that doesn't exist: src=, href= and
# poster= attributes on every .html page, resolved the way a browser would from
# that page's own URL. It exists because the translated home pages (/es/ etc.)
# once pointed their video poster at a relative "assets/..." path, which
# resolved to /es/assets/... and 404'd while the English page looked fine.
#
#   python3 tools/check-links.py
#
# External URLs, anchors, mailto:/tel:/data: and /api/ (Pages Functions) are skipped.
import os, re, sys, html
from urllib.parse import urlparse, unquote
root = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
bad = []
pages = []
for d, _, fs in os.walk(root):
    if '/.git' in d or '/node_modules' in d: continue
    pages += [os.path.join(d, f) for f in fs if f.endswith('.html')]
for p in pages:
    src = open(p, encoding='utf-8').read()
    for attr, url in re.findall(r'\b(src|href|poster)="([^"]+)"', src):
        url = html.unescape(url)
        u = urlparse(url)
        if u.scheme or url.startswith(('#', 'mailto:', 'tel:', 'data:', '//')) or '{' in url:
            continue
        path = unquote(u.path)
        if not path: continue
        target = os.path.normpath(os.path.join(root, path.lstrip('/')) if path.startswith('/') else os.path.join(os.path.dirname(p), path))
        cands = [target, target + '.html', os.path.join(target, 'index.html')]
        if path.startswith('/api/'): continue          # Pages Functions
        if not any(os.path.isfile(c) for c in cands):
            bad.append(f'{os.path.relpath(p, root)}: {attr}="{url}"')
print(f'{len(pages)} pages checked')
if bad:
    print('Missing local targets:'); print('\n'.join(bad)); sys.exit(1)
print('all local links resolve')
