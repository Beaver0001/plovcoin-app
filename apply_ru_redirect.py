#!/usr/bin/env python3
# Add ru.plovcoin.com -> plovcoin.com/ru redirect (path preserved) to next.config.js
# Run from repo root: python apply_ru_redirect.py
import sys

p = "next.config.js"
s = open(p, encoding="utf-8").read()

if 'ru.plovcoin.com' in s:
    print("Redirect already present - nothing to do.")
    sys.exit(0)

redirect_block = '''  async redirects() {
    return [
      // ru.plovcoin.com subdomain -> plovcoin.com/ru (path preserved)
      {
        source: "/:path*",
        has: [{ type: "host", value: "ru.plovcoin.com" }],
        destination: "https://plovcoin.com/ru/:path*",
        permanent: true,
      },
    ];
  },
'''
anchor = "  async rewrites() {"
if anchor not in s:
    print("ERROR: anchor not found in next.config.js - config structure changed?")
    sys.exit(1)

s = s.replace(anchor, redirect_block + anchor)
open(p, "w", encoding="utf-8").write(s)
print("=== PATCH APPLIED ===")
print(" - next.config.js: ru.plovcoin.com redirect -> plovcoin.com/ru/:path* (308)")
print()
print("NEXT: npm run build ; git add -A ; git commit -m 'ru subdomain redirect' ; git push")
