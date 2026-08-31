#!/usr/bin/env python3
"""
FAQ/Proof-hub аудит-фиксы (9 правок × 2 языка). Запускать из корня репозитория:
python apply_faq_proof_fixes.py
Правки: 1) аудит-ответ без обещания публикации отчёта/скоупа; 2) contribute без IG/TikTok;
3) CommunityBot убран из Official Sources и FAQ (в резерв, по канону); 4) +3 вопроса про
ликвидность (locked/one-sided/price support); 5) PGP "will be published"; 6) MEV "will be
published"; 7) Streamflow без бренда; 8) label для X; 9) TG-group ответ без упоминания бота.
Идемпотентно. JSON перезаписывается идентичным форматом (проверено round-trip).
"""
import json, os, sys

if not os.path.isdir("lib/dictionaries"):
    print("ОШИБКА: запусти из корня репозитория."); sys.exit(1)

def fix(lang):
    p=f"lib/dictionaries/{lang}.json"
    d=json.load(open(p,encoding='utf-8'))
    faq=d['faq']; changed=[]

    # --- 1. Аудит-ответ (security cat, item 0) ---
    sec=[c for c in faq['categories'] if c['id']=='security'][0]
    new_audit = {
     'en': "Yes. An independent security review of the project's infrastructure, custody architecture and website has been completed, and all identified issues were addressed. The strongest results are verifiable by anyone on-chain: the mint and freeze authorities are permanently revoked — no new tokens can ever be created, and no wallet can ever be frozen.",
     'ru': "Да. Независимая проверка безопасности инфраструктуры, кастодиальной архитектуры и сайта завершена, все выявленные замечания устранены. Самые сильные результаты каждый может проверить on-chain: mint и freeze authority отозваны необратимо — новые токены создать нельзя, кошельки заморозить нельзя."
    }[lang]
    if sec['items'][0]['a'] != new_audit:
        sec['items'][0]['a'] = new_audit; changed.append("audit answer")

    # --- 2. Contribute (team cat, item 2) ---
    team=[c for c in faq['categories'] if c['id']=='team'][0]
    new_contrib = {
     'en': "Follow PlovCoin on X (@PlovTeam) and the official Telegram announcements channel for verified updates. KOL partnerships: contact us through official channels.",
     'ru': "Следите за PlovCoin в X (@PlovTeam) и получайте проверенные обновления через официальный Telegram-канал анонсов. По вопросам KOL-партнёрств обращайтесь через официальные каналы."
    }[lang]
    if team['items'][2]['a'] != new_contrib:
        team['items'][2]['a'] = new_contrib; changed.append("contribute")

    # --- 3a. CommunityBot из officialSources ---
    src=faq['officialSources']['items']
    before=len(src)
    faq['officialSources']['items']=[it for it in src if 'CommunityBot' not in it.get('value','')]
    if len(faq['officialSources']['items'])<before: changed.append("officialSources: bot removed")

    # --- 3b. Вопрос "What is @PlovCoinCommunityBot?" удалить ---
    before=len(sec['items'])
    sec['items']=[it for it in sec['items'] if 'CommunityBot' not in it.get('q','')]
    if len(sec['items'])<before: changed.append("bot Q removed")

    # --- 9. TG-group ответ без бота ---
    for it in sec['items']:
        if ('community group' in it.get('q','').lower()) or ('группа' in it.get('q','').lower()):
            new_a = {
             'en': "PlovCoin currently operates one official announcements channel: @PlovCoinAnnouncements. There is no separate public Telegram community group at this stage — any group claiming to be PlovCoin is unofficial.",
             'ru': "На текущем этапе у PlovCoin один официальный канал анонсов: @PlovCoinAnnouncements. Отдельной публичной Telegram-группы сейчас нет — любая группа от имени PlovCoin неофициальна."
            }[lang]
            if it['a']!=new_a: it['a']=new_a; changed.append("TG group answer")

    # --- 5. PGP ---
    for it in sec['items']:
        if 'security@plovcoin.com' in it.get('a',''):
            new_a = {
             'en': "Email security@plovcoin.com. Our PGP key and reporting policy will be published in Proof-hub before TGE. Confirmed critical issues may be eligible for a reward.",
             'ru': "Пишите на security@plovcoin.com. PGP-ключ и правила отправки отчётов будут опубликованы в Proof-hub до TGE. За подтверждённые критические проблемы может быть предложено вознаграждение."
            }[lang]
            if it['a']!=new_a: it['a']=new_a; changed.append("PGP wording")

    # --- 6. MEV ---
    for it in sec['items']:
        if 'Jito' in it.get('a',''):
            new_a = {
             'en': "We use Jito bundles and quiet windows during launch to mitigate MEV. The full strategy will be published on Proof-hub closer to launch.",
             'ru': "Используем Jito bundles и quiet windows во время запуска для смягчения MEV. Полная стратегия будет опубликована в Proof-hub ближе к запуску."
            }[lang]
            if it['a']!=new_a: it['a']=new_a; changed.append("MEV wording")

    # --- 4. Ликвидностный блок: 3 вопроса в security-категорию ---
    liq_qs = {
     'en': [
      {"q":"Is the liquidity locked? Can the team pull it?",
       "a":"The LP position is owned by a Squads multisig (3/5 with a 48h timelock), not by any individual wallet. The operational delegate is technically unable to remove liquidity — that instruction is rejected at the program level. Any withdrawal requires multisig approval, a timelock delay, and documented change-control. Silent liquidity pulls are not possible.",
       "proofLabel":"Proof-hub","proofHref":"/proof"},
      {"q":"Why is the launch pool one-sided?",
       "a":"The pool starts with PLOV only, and the SOL side is built by market demand — the same model used by major launch platforms today. This is fair-launch by design: the price opens at the bottom of the range and is discovered by the market, and early sellers can only sell into SOL that buyers actually brought — not into treasury funds.",
       "proofLabel":"Whitepaper → Liquidity","proofHref":"/whitepaper#liquidity"},
      {"q":"Will the team support or guarantee the price?",
       "a":"No. PlovCoin makes no price guarantees and defends no price levels. The project maintains an operational liquidity reserve for orderly market operations under multisig control, but it is never used to promise, fix or protect any price.",
       "proofLabel":"Whitepaper → Liquidity","proofHref":"/whitepaper#liquidity"}],
     'ru': [
      {"q":"Ликвидность заблокирована? Может ли команда её вытащить?",
       "a":"LP-позицией владеет Squads-мультисиг (3/5 с таймлоком 48ч), а не чей-то личный кошелёк. Операционный делегат технически не может вывести ликвидность — такая инструкция отклоняется на уровне программы. Любой вывод требует одобрения мультисига, задержки таймлока и задокументированного change-control. Тихо вытащить ликвидность невозможно.",
       "proofLabel":"Proof-hub","proofHref":"/proof"},
      {"q":"Почему стартовый пул односторонний?",
       "a":"Пул стартует только с PLOV, а SOL-сторона формируется спросом рынка — по той же модели работают крупнейшие launch-платформы сегодня. Это честный запуск по конструкции: цена открывается с нижней границы и определяется рынком, а ранние продавцы могут продать только в SOL, который реально принесли покупатели, — не в деньги казны.",
       "proofLabel":"Whitepaper → Ликвидность","proofHref":"/whitepaper#liquidity"},
      {"q":"Будет ли команда поддерживать или гарантировать цену?",
       "a":"Нет. PlovCoin не даёт ценовых гарантий и не обороняет ценовые уровни. У проекта есть операционный резерв ликвидности для упорядоченных рыночных операций под контролем мультисига, но он никогда не используется для обещания, фиксации или защиты какой-либо цены.",
       "proofLabel":"Whitepaper → Ликвидность","proofHref":"/whitepaper#liquidity"}]
    }[lang]
    existing_qs = {it['q'] for it in sec['items']}
    added=0
    for q in liq_qs:
        if q['q'] not in existing_qs:
            sec['items'].append(q); added+=1
    if added: changed.append(f"liquidity block +{added}")


    # --- 10. Wave-таблица: tool "Streamflow" -> "TBA" (NF-3) ---
    wp=d.get('whitepaper') or d.get('plovdrop') or {}
    def fix_waves(node):
        n=0
        if isinstance(node,dict):
            if node.get('tool')=='Streamflow': node['tool']='TBA'; n+=1
            for v in node.values(): n+=fix_waves(v)
        elif isinstance(node,list):
            for v in node: n+=fix_waves(v)
        return n
    nfix=fix_waves(d)
    if nfix: changed.append(f"wave tool -> TBA x{nfix}")

    # --- 11. PlovArmy: убрать TikTok/Instagram хвост ---
    for c in faq['categories']:
        for it in c['items']:
            if 'PlovArmy' in it.get('q',''):
                new_a = {
                 'en': "PlovArmy is the PlovCoin community — a growing group of holders, creators, and supporters united around the plov symbol. Official updates are published on Telegram and X.",
                 'ru': "PlovArmy — сообщество PlovCoin: растущая группа держателей, креаторов и сторонников вокруг символа плова. Официальные обновления публикуются в Telegram и X."
                }[lang]
                if it['a']!=new_a: it['a']=new_a; changed.append("PlovArmy answer")

    # --- 7. Streamflow из proof.vesting ---
    pv=[s for s in d['proof']['sections'] if s['id']=='vesting'][0]
    new_note = {'en':"Vesting stream IDs for every team member.",
                'ru':"Vesting stream ID для каждого члена команды."}[lang]
    if pv['note']!=new_note: pv['note']=new_note; changed.append("vesting note")

    # --- 8. label для X в officialSources ---
    for it in faq['officialSources']['items']:
        if it.get('value')=='@PlovTeam' and 'label' not in it:
            # вставить label первым ключом не выйдет в dict — просто добавим
            it['label'] = {'en':'X / Twitter','ru':'X / Twitter'}[lang]
            changed.append("X label")

    out=json.dumps(d,ensure_ascii=False,indent=2)+"\n"
    open(p,'w',encoding='utf-8').write(out)
    # валидация
    json.load(open(p,encoding='utf-8'))
    print(f"✓ {lang}.json: {', '.join(changed) if changed else 'уже применено'} | JSON валиден")
    return changed

c1=fix('en'); c2=fix('ru')
# финальные проверки: стоп-строк не осталось
bad=[]
for lang in ['en','ru']:
    s=open(f'lib/dictionaries/{lang}.json',encoding='utf-8').read()
    for t in ['CommunityBot','TikTok, and Instagram','TikTok и Instagram','"tool": "Streamflow"','Streamflow stream','will be published on Proof-hub once officially finalized','будут опубликованы в Proof-hub после официального завершения']:
        if t in s: bad.append((lang,t))
if bad:
    print("✗ ОСТАЛИСЬ стоп-строки:",bad); sys.exit(1)
print("\n✅ ГОТОВО. Все правки применены, стоп-строк не осталось. Можно коммитить.")
