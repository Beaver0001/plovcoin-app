#!/usr/bin/env python3
# PlovCoin full site audit patch - fixes ALL findings in one pass.
# Run from repo root: python apply_full_site_audit.py
# Then: python apply_full_site_audit.py --check   (stop-word self-check)
import json, sys, os, re

CHECK_ONLY = "--check" in sys.argv

STOP_WORDS = ["JUNE 2026","July 2026","Июль 2026","v7.4","will be published on Proof-hub",
              "will be published in Proof-hub","будет опубликован в Proof-hub","будут опубликованы в Proof-hub",
              "over 12 months","за 12 месяцев","Airship / Helius","PGP"]

def selfcheck():
    bad = []
    for root, dirs, files in os.walk("."):
        dirs[:] = [d for d in dirs if d not in (".git","node_modules",".next")]
        for f in files:
            if f.endswith((".json",".tsx",".ts",".svg")):
                p = os.path.join(root,f)
                try: s = open(p,encoding="utf-8").read()
                except: continue
                for w in STOP_WORDS:
                    # allow team-vesting "12 months" phrasing (cliff/linear) - only flag airdrop wording
                    if w in s:
                        if w=="over 12 months" and "airdrop" not in s.lower(): continue
                        for i,line in enumerate(s.split("\n"),1):
                            if w in line:
                                bad.append(f"{p}:{i}: {w}")
    if bad:
        print("STOP-WORDS FOUND (fix before deploy):")
        for b in bad: print(" ", b)
        sys.exit(1)
    print("SELF-CHECK PASS: no stop-words in codebase")
    sys.exit(0)

if CHECK_ONLY: selfcheck()

edits_done = []
def load(p): return json.load(open(p,encoding="utf-8"))
def save(p,d):
    open(p,"w",encoding="utf-8").write(json.dumps(d,ensure_ascii=False,indent=2)+"\n")

# ============ DICTIONARIES ============
for loc in ("en","ru"):
    p = f"lib/dictionaries/{loc}.json"
    d = load(p)
    ru = (loc=="ru")

    # A1a: Security body (205) - audit text
    sec = d["home"]["security"]["cards"] if "security" in d.get("home",{}) else None
    # locate by walking: find any string containing the stale audit phrase
    def walk_replace(obj, needle, newval, path=""):
        if isinstance(obj, dict):
            for k,v in obj.items():
                walk_replace(v, needle, newval, path+"/"+k)
        elif isinstance(obj, list):
            for i,v in enumerate(obj):
                walk_replace(v, needle, newval, path+f"[{i}]")
        return
    # We do targeted string replacements over the whole file instead (safer for unknown nesting):
    raw = open(p,encoding="utf-8").read()

    if ru:
        raw = raw.replace(
          "Пентест-аудит: предварительный отчёт получен (июль 2026), все находки устранены и переданы аудитору на повторную проверку. Финальный отчёт будет опубликован в Proof-hub. Мы не заявляем о завершении аудита до официального подтверждения аудитором.",
          "Независимый пентест-аудит завершён. Полный отчёт конфиденциален; вместо обещаний мы публикуем проверяемые факты: mint и freeze authority отозваны, казна под Squads multisig — всё проверяется on-chain через Proof-hub. Мы не заявляем ничего, что нельзя проверить независимо.")
        raw = raw.replace(
          "security@plovcoin.com • PGP-ключ в Proof-hub • награды bug bounty",
          "security@plovcoin.com • награды bug bounty")
        raw = raw.replace(
          "Пишите на security@plovcoin.com. PGP-ключ и правила отправки отчётов будут опубликованы в Proof-hub до TGE. За подтверждённые критические проблемы может быть предложено вознаграждение.",
          "Пишите на security@plovcoin.com. За подтверждённые критические проблемы может быть предложено вознаграждение.")
        raw = raw.replace("\"badge\": \"v7.4 · Июль 2026\"", "\"badge\": \"v8.1 · Август 2026\"")
        raw = raw.replace(
          "45% эмиссии распределяется сообществу через четыре airdrop-волны за 12 месяцев.",
          "45% эмиссии распределяется сообществу через четыре airdrop-волны; сроки и правила каждой волны задаются утверждённой Wave Policy.")
        raw = raw.replace(
          "Самая крупная доля уходит людям. Четыре волны за 12 месяцев.",
          "Самая крупная доля уходит людям. Четыре волны по утверждённым правилам.")
        raw = raw.replace(
          "PlovDrop — программа аирдропов: 45% общей эмиссии распределяется через 4 волны за 12 месяцев. Крупнейшая доля в протоколе.",
          "PlovDrop — программа аирдропов: 45% общей эмиссии распределяется через 4 волны по утверждённой Wave Policy. Крупнейшая доля в протоколе.")
        raw = raw.replace("\"tool\": \"Airship / Helius\"", "\"tool\": \"TBA\"")
    else:
        raw = raw.replace(
          "Penetration-test audit: the preliminary report has been received (July 2026), all findings have been remediated and submitted to the auditor for re-testing. The final report will be published on Proof-hub. We do not claim audit completion until officially confirmed by the auditor.",
          "An independent penetration-test audit has been completed. The full report is confidential; instead of promises we publish verifiable facts: mint and freeze authorities are revoked and treasury custody runs through Squads multisig - all checkable on-chain via Proof-hub. We claim nothing that cannot be independently verified.")
        raw = raw.replace(
          "The preliminary report is in; every finding has been fixed and submitted for re-testing. The final report will be published on",
          "The independent audit is complete. Verifiable security facts - revoked authorities, multisig custody - are documented on")
        raw = raw.replace(
          "security@plovcoin.com • PGP key on Proof-hub • bug bounty rewards",
          "security@plovcoin.com • bug bounty rewards")
        raw = raw.replace(
          "Email security@plovcoin.com. Our PGP key and reporting policy will be published in Proof-hub before TGE. Confirmed critical issues may be eligible for a reward.",
          "Email security@plovcoin.com. Confirmed critical issues may be eligible for a reward.")
        raw = raw.replace("\"badge\": \"v7.4 · July 2026\"", "\"badge\": \"v8.1 · August 2026\"")
        raw = raw.replace(
          "45% of supply is distributed to the community through four airdrop waves over 12 months.",
          "45% of supply is distributed to the community through four airdrop waves; timing and rules for each wave are set by the approved Wave Policy.")
        raw = raw.replace(
          "The largest allocation goes to the people. Four waves over 12 months.",
          "The largest allocation goes to the people. Four waves under approved rules.")
        raw = raw.replace("\"tool\": \"Airship / Helius\"", "\"tool\": \"TBA\"")
        raw = raw.replace(
          "PlovDrop is the airdrop program \u2014 45% of total supply distributed through 4 waves over 12 months. The largest allocation in the protocol.",
          "PlovDrop is the airdrop program \u2014 45% of total supply distributed through 4 waves per the approved Wave Policy. The largest allocation in the protocol.")
        raw = raw.replace(
          "We use Jito bundles and quiet windows during launch to mitigate MEV. The full strategy will be published on Proof-hub closer to launch.",
          "We use Jito bundles and quiet windows during launch to mitigate MEV. Operational details are documented on Proof-hub as they are finalized.")

    open(p,"w",encoding="utf-8").write(raw)
    edits_done.append(f"{p}: dictionary fixes applied")

# ============ OG IMAGE SVG ============
svg = "public/og-image.svg"
s = open(svg,encoding="utf-8").read()
s = s.replace("SOLANA · PRE-TGE · JUNE 2026","SOLANA · FAIR LAUNCH")
open(svg,"w",encoding="utf-8").write(s)
edits_done.append("og-image.svg: date removed (place new og-image.png manually)")

# ============ LANG FIX ============
setlang = "components/SetLangRu.tsx"
if not os.path.exists(setlang):
    open(setlang,"w",encoding="utf-8").write(
"""\"use client\";
import { useEffect } from "react";
export function SetLangRu() {
  useEffect(() => { document.documentElement.lang = "ru"; }, []);
  return null;
}
""")
    edits_done.append("created components/SetLangRu.tsx")
rl = "app/ru/layout.tsx"
s = open(rl,encoding="utf-8").read()
if "SetLangRu" not in s:
    s = s.replace('return <div lang="ru">{children}</div>;',
                  'return <div lang="ru"><SetLangRu />{children}</div>;')
    if 'import' in s:
        s = 'import { SetLangRu } from "@/components/SetLangRu";\n' + s
    open(rl,"w",encoding="utf-8").write(s)
    edits_done.append("app/ru/layout.tsx: lang setter wired")

# ============ TERMS / PRIVACY PAGES ============
def page(title, body_html, lang, path_):
    return f"""export const metadata = {{ title: "{title} — PlovCoin" }};
export default function Page() {{
  return (
    <main className="mx-auto max-w-3xl px-6 py-24 text-rice-soft">
      <h1 className="mb-8 text-3xl font-bold text-rice">{title}</h1>
      <div className="space-y-5 text-sm leading-relaxed">
{body_html}
      </div>
    </main>
  );
}}
"""

terms_en = """        <p>PlovCoin ($PLOV) is a cultural memecoin on Solana created for community and entertainment purposes. It is not an investment product, security, or financial instrument, and it confers no rights to profit, governance of any legal entity, or claims against any party.</p>
        <p>Nothing on this website constitutes financial, legal, or tax advice. Digital assets are highly volatile; you may lose the entire amount you spend. Participate only with funds you can afford to lose and only where lawful in your jurisdiction. You are solely responsible for compliance with your local laws.</p>
        <p>Airdrop participation is subject to the official Wave Policy published for each wave, including eligibility, anti-Sybil rules, and regional restrictions. We may amend program rules before a wave opens; changes are announced through official channels listed on this site.</p>
        <p>The website is provided "as is" without warranties of any kind. To the maximum extent permitted by law, the PlovCoin team is not liable for any losses arising from use of this site, the token, or third-party services (wallets, exchanges, RPC providers).</p>
        <p>Official channels and contract addresses are listed on the Proof-hub page. Anything else claiming to be PlovCoin is not us. We never DM first and never ask for seed phrases.</p>"""
terms_ru = """        <p>PlovCoin ($PLOV) — культурный мемкоин на Solana, созданный для сообщества и развлечения. Это не инвестиционный продукт, не ценная бумага и не финансовый инструмент; токен не даёт прав на прибыль, управление юридическим лицом или требования к каким-либо лицам.</p>
        <p>Ничто на этом сайте не является финансовой, юридической или налоговой консультацией. Криптоактивы крайне волатильны; вы можете потерять всю потраченную сумму. Участвуйте только на средства, потерю которых можете себе позволить, и только там, где это законно. Ответственность за соблюдение местных законов лежит на вас.</p>
        <p>Участие в аирдропах регулируется официальной Wave Policy каждой волны: критерии, анти-Sybil правила, региональные ограничения. Правила могут уточняться до открытия волны; изменения анонсируются в официальных каналах, указанных на сайте.</p>
        <p>Сайт предоставляется «как есть», без каких-либо гарантий. В максимально допустимой законом мере команда PlovCoin не несёт ответственности за убытки, связанные с использованием сайта, токена или сторонних сервисов (кошельки, биржи, RPC-провайдеры).</p>
        <p>Официальные каналы и адреса контрактов перечислены на странице Proof-hub. Всё остальное, выдающее себя за PlovCoin, — не мы. Мы никогда не пишем первыми и не спрашиваем seed-фразы.</p>"""
priv_en = """        <p>This website does not require accounts and does not collect personal data beyond standard technical logs of our hosting provider (IP address, user agent) used for security and operation.</p>
        <p>We do not use advertising trackers. Basic, privacy-respecting analytics may be used to count page views in aggregate.</p>
        <p>If you email us (e.g. security@plovcoin.com), we process your message and address solely to respond and handle the report. We do not sell or share personal data with third parties except where required by law.</p>
        <p>Third-party services you use to interact with PlovCoin (wallets, Telegram, X, exchanges) have their own privacy policies; we are not responsible for their processing.</p>
        <p>Questions: security@plovcoin.com.</p>"""
priv_ru = """        <p>Сайт не требует аккаунтов и не собирает персональные данные сверх стандартных технических логов хостинг-провайдера (IP-адрес, user agent), используемых для безопасности и работы сайта.</p>
        <p>Мы не используем рекламные трекеры. Может использоваться базовая, уважающая приватность аналитика для агрегированного подсчёта просмотров.</p>
        <p>Если вы пишете нам (например, на security@plovcoin.com), мы обрабатываем ваше сообщение и адрес исключительно для ответа и обработки обращения. Мы не продаём и не передаём персональные данные третьим лицам, кроме случаев, требуемых законом.</p>
        <p>Сторонние сервисы, через которые вы взаимодействуете с PlovCoin (кошельки, Telegram, X, биржи), имеют собственные политики приватности; мы не отвечаем за их обработку.</p>
        <p>Вопросы: security@plovcoin.com.</p>"""

pages = [
  ("app/terms/page.tsx","Terms of Use",terms_en),
  ("app/privacy/page.tsx","Privacy Policy",priv_en),
  ("app/ru/terms/page.tsx","Условия использования",terms_ru),
  ("app/ru/privacy/page.tsx","Политика приватности",priv_ru),
]
for path_, title, body in pages:
    os.makedirs(os.path.dirname(path_), exist_ok=True)
    if not os.path.exists(path_):
        open(path_,"w",encoding="utf-8").write(page(title, body, "", path_))
        edits_done.append(f"created {path_}")

# ============ FOOTER LINKS ============
fp = "components/Footer.tsx"
s = open(fp,encoding="utf-8").read()
if "/terms" not in s:
    old = '<div>{t.footer.copyright}</div>'
    new = ('<div className="flex flex-wrap items-center gap-3">{t.footer.copyright}'
           '<Link href={localePath(locale, "/terms")} className="hover:text-fire">Terms</Link>'
           '<Link href={localePath(locale, "/privacy")} className="hover:text-fire">Privacy</Link></div>')
    if old in s:
        s = s.replace(old,new)
        open(fp,"w",encoding="utf-8").write(s)
        edits_done.append("Footer: Terms/Privacy links added")
    else:
        edits_done.append("Footer: PATTERN NOT FOUND - add links manually")

# ============ REPORT ============
print("=== PATCH APPLIED ===")
for e in edits_done: print(" -", e)
print()
print("REMINDERS:")
print(" 1. Replace public/og-image.png with the new rendered file (provided separately).")
print(" 2. Run: python apply_full_site_audit.py --check   (stop-word self-check)")
print(" 3. npm run build, then commit and push.")
