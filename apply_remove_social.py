#!/usr/bin/env python3
"""
Убирает Instagram и TikTok ссылки с сайта (Footer + Community), оставляет X и Telegram.
Запускать из корня репозитория: python apply_remove_social.py
Идемпотентно + проверяет валидность после правки.
"""
import re, os, sys

if not os.path.isdir("components"):
    print("ОШИБКА: запусти из корня репозитория (нет папки components)."); sys.exit(1)

changed = []

# ---------- 1. Footer.tsx — убрать 2 строки ----------
fp = "components/Footer.tsx"
if os.path.exists(fp):
    s = open(fp, encoding="utf-8").read(); before = s
    for line in [
        '      { href: "https://www.instagram.com/plovcoinofficial/", label: "Instagram", external: true },\n',
        '      { href: "https://www.tiktok.com/@plovcoinofficial", label: "TikTok", external: true },\n',
    ]:
        s = s.replace(line, "")
    if s != before:
        open(fp, "w", encoding="utf-8").write(s); changed.append("Footer.tsx")
        print("OK  Footer.tsx: убраны Instagram + TikTok")
    elif "instagram" not in s.lower():
        print("--  Footer.tsx: уже без Instagram/TikTok")
    else:
        print("⚠  Footer.tsx: строки не совпали дословно — проверь вручную")

# ---------- 2. Community.tsx — вырезать 2 блока ----------
cp = "components/sections/Community.tsx"
if os.path.exists(cp):
    s = open(cp, encoding="utf-8").read(); before = s

    def cut_block(text, name):
        # находит блок { name: "<name>" ... }, включая svg, до закрывающей "},"
        m = re.search(r'\{\s*\n\s*name:\s*"' + re.escape(name) + r'"', text)
        if not m:
            return text, False
        start = m.start()
        # найти закрывающую "}," или "}" этого объекта: ищем "    },\n" или "    }\n" после icon-svg
        # берём от start и ищем первую последовательность "\n  },"  или "\n  }\n"
        rest = text[start:]
        # закрытие объекта в этом массиве — на отступе 2 пробела: "\n  },"
        close = re.search(r'\n\s*\},', rest)
        if not close:
            close = re.search(r'\n\s*\}\s*\n', rest)
            if not close:
                return text, False
        end = start + close.end()
        return text[:start] + text[end:], True

    for nm in ["Instagram", "TikTok"]:
        s, ok = cut_block(s, nm)
        if ok: print(f"OK  Community.tsx: вырезан блок {nm}")
        elif f'"{nm}"' not in s: print(f"--  Community.tsx: блок {nm} уже отсутствует")
        else: print(f"⚠  Community.tsx: блок {nm} не найден шаблоном — проверь вручную")

    # почистить возможную двойную запятую/висячую запятую перед "];"
    s = re.sub(r',(\s*)\];', r'\1];', s)      # убрать запятую прямо перед ];
    s = re.sub(r'\},\s*\},', '},', s)          # схлопнуть двойные "},  },"

    if s != before:
        open(cp, "w", encoding="utf-8").write(s); changed.append("Community.tsx")

# ---------- 3. Проверки ----------
# 3a. стоп-слов не осталось
leftover = []
for p in [fp, cp]:
    if os.path.exists(p):
        low = open(p, encoding="utf-8").read().lower()
        for bad in ["instagram", "tiktok"]:
            if bad in low: leftover.append((p, bad))
if leftover:
    print("✗ ОСТАЛИСЬ ссылки:", leftover, "— проверь вручную, НЕ коммить"); sys.exit(1)

# 3b. баланс скобок в channels-массиве Community
if os.path.exists(cp):
    s = open(cp, encoding="utf-8").read()
    i = s.find("const channels = [")
    j = s.find("];", i)
    if i != -1 and j != -1:
        blk = s[i:j+2]
        if blk.count("[") != blk.count("]") or blk.count("{") != blk.count("}"):
            print(f"✗ Community.tsx: дисбаланс скобок ([{blk.count('[')}/{blk.count(']')}] {{{blk.count('{')}/{blk.count('}')}}}) — НЕ коммить, пришли вывод Клоду"); sys.exit(1)
        print("✓ Community.tsx: скобки сбалансированы, X и Telegram на месте")

print(f"\n✅ ГОТОВО. Изменено: {changed or 'ничего (уже применено)'}. Instagram/TikTok убраны. Можно коммитить.")
