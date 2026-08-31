#!/usr/bin/env python3
"""
WEB-REC-002 content fixes for plovcoin-app.
Запускать из корня репозитория: python3 apply_webrec_fixes.py
Вносит 7 замен в lib/dictionaries/en.json и ru.json, проверяет валидность JSON.
Идемпотентно: повторный запуск не навредит (просто скажет 'уже применено').
"""
import json, os, sys

EDITS = {
 "lib/dictionaries/en.json": [
  ('"taglineStart": "Billions have tasted it.",', '"taglineStart": "Loved across the world.",'),
  ('"taglineEnd": "Now they can own it.",', '"taglineEnd": "Now on-chain.",'),
  ("PlovCoin is the first universal cultural memecoin on Solana. Billions have tasted it. Now they can own it. Fair launch, 45% to community, no presale, no VC.",
   "PlovCoin is the first universal cultural memecoin on Solana. A dish loved across the world. Now on-chain. Fair launch, 45% to community, no presale, no VC."),
  ("The largest allocation goes to the people. Four waves over 12 months. No insiders, no whitelists, no pay-to-play.",
   "The largest allocation goes to the people. Four waves over 12 months. No insiders, no pay-to-play. Eligibility and access rules for each wave are published in the official wave rules."),
 ],
 "lib/dictionaries/ru.json": [
  ('"taglineStart": "Миллиарды пробовали.",', '"taglineStart": "Любимо во всём мире.",'),
  ('"taglineEnd": "Теперь они могут владеть.",', '"taglineEnd": "Теперь on-chain.",'),
  ("Самая крупная доля уходит людям. Четыре волны за 12 месяцев. Без инсайдеров, без вайтлистов, без pay-to-play.",
   "Самая крупная доля уходит людям. Четыре волны за 12 месяцев. Без инсайдеров, без pay-to-play. Правила участия и доступа для каждой волны публикуются в официальных правилах волны."),
 ],
}

if not os.path.isdir("lib/dictionaries"):
    print("ОШИБКА: запусти из корня репозитория (нет папки lib/dictionaries)."); sys.exit(1)

total_applied = 0
for path, repls in EDITS.items():
    if not os.path.exists(path):
        print(f"ПРОПУСК: {path} не найден"); continue
    s = open(path, encoding="utf-8").read()
    applied = 0
    for old, new in repls:
        if old in s:
            s = s.replace(old, new); applied += 1
        elif new in s:
            pass  # уже применено ранее
        else:
            print(f"  ⚠ НЕ НАЙДЕНО в {path}: {old[:50]}...")
    open(path, "w", encoding="utf-8").write(s)
    # валидация JSON — критично
    try:
        json.load(open(path, encoding="utf-8"))
        print(f"✓ {path}: применено {applied}, JSON валиден")
    except Exception as e:
        print(f"✗ {path}: JSON СЛОМАН — {e}"); sys.exit(1)
    total_applied += applied

# финальная проверка: стоп-слов не осталось
leftovers = []
for path in EDITS:
    if os.path.exists(path):
        s = open(path, encoding="utf-8").read().lower()
        for bad in ["whitelist", "вайтлист", "billions have tasted", "миллиарды пробовали"]:
            if bad in s: leftovers.append((path, bad))
if leftovers:
    print("✗ ОСТАЛИСЬ стоп-слова:", leftovers); sys.exit(1)
print(f"\n✅ ГОТОВО. Всего замен: {total_applied}. Стоп-слов не осталось. Можно коммитить.")
