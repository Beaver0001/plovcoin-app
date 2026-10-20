# PlovCoin — LOWER dynamic config: authority согласована, запрос подготовлен

21.10.2026, v107. **DRAFT_NOT_SENT. MAINNET_GO=NO.**

## Что утверждено

Владелец ответил «давай» на отдельный вопрос v106 о выборе authority.
Утверждён poolCreatorAuthority:

**2bfo1Z7kfFu5BgmjCNCK5jAPqzV8emB39gCag62gravK**

Это vault0 LP multisig 9CcvfhksgjsQhK7fi4S7Mjv4gaCMNDpDiqGgS4CduA7B.
[Запись решения](lp-config-authority-approval-v107.json) фиксирует узкую область:
выбор authority для будущего config. [Текущий overlay](lp-production-acceptance-v107.json)
закрывает A01 и сохраняет остальные13 условий открытыми. Исторический v106 не переписан.

Выдача config ещё не принята; её address/index/issuer/transaction/readback остаютсяnull.
Платёж, реальные подписи, отправка запроса и запуск этим ответом не разрешены.
Production atomic design, NFT custody и pool creator остаются отдельными условиями
приёмки. Бюджет/геометрия/T0/60PLOV остаются перед запуском.

## Готовый текст обращения (русский)

Здравствуйте. Проект PlovCoin готовит PLOV/SOL LOWER pool в Meteora DAMM v2.
Владелец проекта утвердил следующий poolCreatorAuthority:

2bfo1Z7kfFu5BgmjCNCK5jAPqzV8emB39gCag62gravK

Это Squads vault0 (LP multisig: 9CcvfhksgjsQhK7fi4S7Mjv4gaCMNDpDiqGgS4CduA7B).
Требуется один dynamic config: configType1, permissionU128=0, обычная mint validation.
Сеть mainnet-beta; DAMM v2 program:
cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG.

Подтвердите, пожалуйста, конкретную возможность выдачи такого config уполномоченным
оператором, применимые условия/стоимость услуги и on-chain расходов, плательщика,
срок исполнения и срок действия предложения. Если предоставляете отдельный devnet
config для репетиции, укажите доступность и его условия.

Предполагаемое использование — LOWER PLOV/SOL; мы учитываем, что config не задаёт
on-chain ограничение только на эту mint pair. Project Operator role не запрашивается.
Параметры fees/диапазона/ликвидности/T0 относятся к будущему пулу и не являются
аргументами выдачи config.

После отдельно согласованной выдачи нам потребуются config address/index,
успешная finalized issuance transaction, сведения об issuer и историческом
Operator authorization path для независимой проверки. Это запрос доступности и
условий, без заказа платной услуги или разрешения производственных транзакций.

## English version for developer support

Hello. PlovCoin is preparing a PLOV/SOL LOWER pool on Meteora DAMM v2.
The project owner has approved this poolCreatorAuthority:

2bfo1Z7kfFu5BgmjCNCK5jAPqzV8emB39gCag62gravK

This is vault0 of the LP Squads multisig:
9CcvfhksgjsQhK7fi4S7Mjv4gaCMNDpDiqGgS4CduA7B.
We need one dynamic config, configType1 and permissionU128=0, with normal mint
validation, on mainnet-beta under program:
cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG.

Please confirm project-specific availability of authorized issuance, applicable
service/on-chain charges and payer, lead time, and quote validity. If you offer
a separate devnet rehearsal config, please specify its availability and terms.

LOWER PLOV/SOL is the intended use, not a claimed on-chain pair restriction.
We are not requesting a project Operator role. Pool fees, ranges, liquidity and
activation time will be accepted separately and are not config issuance fields.

After separately authorized issuance, we will need the config address/index,
successful finalized issuance transaction, issuer identity and historical Operator
authorization evidence for independent readback. This is an availability/terms
inquiry, not an order or authorization for paid services or production transactions.

## Канал и состояние передачи

Официальная [документация Meteora](https://docs.meteora.ag/get-started) указывает
Discord как developer support. Её ссылка
[discord.gg/meteora](https://discord.gg/meteora)21.10.2026 перенаправила на
[discord.com/invite/meteora](https://discord.com/invite/meteora).
Это подтверждает вход в сообщество, но не назначенного issuer/получателя или
доступность услуги. Recipient, ticket и service quote неизвестны. Ничего не отправлено.

После ответа сопоставить authority с утверждённой записью; новый адрес требует
отдельного решения. Сервисные условия и on-chain расходы сверить раздельно.
До принятия actual config сохраняются NOT_RUN/null и readyForIssuance=false.

## История и воспроизведение

v106 — исторический снимок до утверждения authority; его JSON и хеши сохранены
без изменений. Старый assembler проверяет прежнее authorityApproved=false и
воспроизводится на commit160777108ba8d8e11bd0d3c1c69c02de71f855d0.
На новой карточке это условие намеренно не выполняется; старый snapshot не надо
пересобирать поверх текущего решения. Актуальные identity/status — в v107 overlay.

Root app/dependencies/lock/routes/flags прежние. Реальных транзакций, выдачи config,
funding, изменения mint/governance authority или внешних сообщений в этом блоке нет.
