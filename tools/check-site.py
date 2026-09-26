#!/usr/bin/env python3
"""Static checks run in CI (.github/workflows/ci.yml). No dependencies.

  * _headers still sends a Content-Security-Policy with script-src 'self'.
  * No page has inline <script> bodies or on*= event-handler attributes,
    which that policy would silently block in the browser.
  * Every local script a page references exists.
"""
import glob, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
problems = []

headers = open(os.path.join(ROOT, "_headers"), encoding="utf-8").read()
m = re.search(r"Content-Security-Policy:\s*(.+)", headers)
if not m:
    problems.append("_headers: no Content-Security-Policy")
else:
    script_src = re.search(r"script-src([^;]*)", m.group(1))
    if not script_src or "'self'" not in script_src.group(1) or "unsafe-inline" in script_src.group(1):
        problems.append("_headers: script-src must include 'self' and not 'unsafe-inline'")

pages = [p for p in glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True)
         if "/node_modules/" not in p]
for page in pages:
    rel = os.path.relpath(page, ROOT)
    s = open(page, encoding="utf-8").read()
    for tag in re.finditer(r"<script\b([^>]*)>([\s\S]*?)</script>", s, re.I):
        attrs, body = tag.group(1), tag.group(2)
        if "src=" not in attrs and "application/ld+json" not in attrs and body.strip():
            problems.append(f"{rel}: inline <script> (move it to a .js file)")
        src = re.search(r'src="(/[^"?#]+)', attrs)
        if src and not os.path.exists(os.path.join(ROOT, src.group(1).lstrip("/"))):
            problems.append(f"{rel}: script {src.group(1)} does not exist")
    for h in re.finditer(r"<[a-z][^>]*\s(on[a-z]+)=", s, re.I):
        problems.append(f"{rel}: inline {h.group(1)}= handler (use addEventListener)")

for p in problems:
    print("FAIL", p)
print(f"checked {len(pages)} pages: {'ok' if not problems else f'{len(problems)} problem(s)'}")
sys.exit(1 if problems else 0)
