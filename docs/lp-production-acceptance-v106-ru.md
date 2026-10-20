# PlovCoin: пакет приёмки ликвидности v106

**21.10.2026. Пакет собран; производство заблокировано. MAINNET_GO=NO.**

Локальные v100–v105 завершили перенос точной геометрии, native пути, Squads custody, атомарное создание и Treasury→LP handoff. Выдача реального config, доступ ключей и производственное финансирование этим не подтверждены. Повторять прогоны без изменения входов не требуется.

## 1. Известные адреса

| Назначение | Адрес | Основание |
|---|---|---|
| Mint PLOV | B4LhtMwbKh8D1nfj7dE6FefKpg7U2qkbYC371DBcJq9x | Сохранённый проектный mint; decimals9 — ожидаемый профиль, live проверка впереди. |
| WSOL mint | So11111111111111111111111111111111111111112 | Стандартный WSOL; decimals9 — ожидаемый профиль. |
| LP multisig | 9CcvfhksgjsQhK7fi4S7Mjv4gaCMNDpDiqGgS4CduA7B | Raw v94 от20.10;2/3+12ч. |
| LP vault0 | 2bfo1Z7kfFu5BgmjCNCK5jAPqzV8emB39gCag62gravK | PDA совпал с raw v94. Кандидат authority/NFT custody. |
| Treasury multisig | Fg5AiXSjZrnUUmNTDQH47WBtAhtTXiM6yX66fFw4UNBz | Raw v95 от20.10;3/5+48ч. |
| Treasury vault0 | 3w5DmerxzYfMhVLHsdjHn5BU194u3R9DD5HaD7rr5VRm | PDA совпал с raw v95. |
| LP PLOV ATA | 73uLrfPQCELdWEPKbiceQkqeWfDgM2g34xRsdJro6vDj | Офлайн-вывод, нынешнее существование/баланс не проверены. |
| LP WSOL ATA | ASNjimLJYvHngozupSMQGyBarrAkFFQ5hrWpbTMFQB2E | Офлайн-вывод. |
| Treasury PLOV ATA | 4Xw9pQhyVrjkrdtTGFuGBWXDPSVhekwYWXjrspvcHGWS | Офлайн-вывод. |
| UPPER customizable PDA | 64CgrpfD1mirgn7jea22wT8sJgnHwqTPTzZksYUC6ZsR | Офлайн-вывод; не свидетельство создания/владения. |
| Meteora pool authority | HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC | Глобальный PDA владельца token vaults; не LP multisig и не config authority. |

LOWER PDA нельзя зафиксировать без реального config. Свежий transaction index нужен для двух ephemeral NFT PDA; наблюдённые LP3/Treasury2 не резервируют следующие индексы. Реальная ALT не назначена.

## 2. Ближайшее решение владельца

Предложение: использовать **LP vault 2bfo1Z7kfFu5BgmjCNCK5jAPqzV8emB39gCag62gravK** как poolCreatorAuthority LOWER dynamic config. Account LP multisig 9CcvfhksgjsQhK7fi4S7Mjv4gaCMNDpDiqGgS4CduA7B не заменяет vault signer. Нативные Squads-прогоны проверили vault signer/CPI механизм.

Это назначение полномочий config. Поэтому authorityApproved=false, approvedAuthority=null, approvalReference=null сохраняются. Mint/update authority не меняется; Meteora Operator проекту не запрашивается.

Текст для отдельного согласования:

> Утверждаю LP vault 2bfo1Z7kfFu5BgmjCNCK5jAPqzV8emB39gCag62gravK как poolCreatorAuthority для запроса LOWER dynamic config типа1 с permission0. Утверждение касается выбора authority. Выдача config, платежи, подписи, реальные переводы и запуск требуют своих оснований и разрешений.

Бюджет, production geometry, T0 и возврат60PLOV остаются перед запуском. Производственное принятие атомарной схемы также ещё открыто. Предложение выше не заполняет эти поля.

## 3. Условия приёмки

| ID | Состояние | Условие закрытия |
|---|---|---|
| A01 | OWNER_DECISION | **Утвердить poolCreatorAuthority**. Кандидат — LP vault; требуются owner approval reference и approved authority. |
| A02 | PRODUCTION_ADOPTION_OPEN | **Принять атомарную схему**. Один VaultTransaction с обеими инициализациями и двумя ephemeral NFT PDA; раздельные batch execute не заменяют атомарность. |
| A03 | EXTERNAL_ISSUANCE_OPEN | **Получить и принять LOWER config**. config/index/PDA/type1/permission0/authority; finalized issuance transaction и историческая Operator authorization. Офлайн v91 checker сверяет лишь ожидаемые поля. |
| A04 | LIVE_EVIDENCE_OPEN | **Обновить chain evidence**. Genesis до/после, finalized context/floors/time, mint/program/governance/config/UPPER existence/балансы. Снимки20.10 не объявлять текущими. |
| A05 | OWNER_DEFERRED | **Бюджет, геометрия и T0**. Выбрать production candidate/капитал/границы/объёмы/operating budget/T0 перед запуском; research MIN/IDEAL и frozen FX не подставлять автоматически. |
| A06 | SIGNER_ACCESS_OPEN | **Подтвердить подписантов**. Treasury3/5, LP2/3; public membership не доказывает контроль ключа или доступность человека. |
| A07 | PAYER_POLICY_OPEN | **Назначить плательщиков**. Отдельно governance/ALT/ATA rent, init rent/seed, transaction/priority fees, услуга config и operating reserve.890880lamports fixture не operating budget. |
| A08 | MESSAGE_IDENTITY_OPEN | **Зафиксировать два сообщения**. Treasury SOL→LP vault и checked PLOV→LP ATA; LP обе инициализации; свежие transaction indexes, exact bytes/hash, signer/writable metas, CU/bytes. |
| A09 | ALT_ACCEPTANCE_OPEN | **Принять frozen ALT**. Реальные address/owner/program/contents/index mapping/authority absent/activation slot/readback; builtin LiteSVM не mainnet ELF acceptance. |
| A10 | SOURCE_PARITY_OPEN | **Привязать актуальные программы и аудит**. Deployment/ProgramData/ELF и source/build review; cached v90 и application hashes не доказывают binary parity. |
| A11 | SIGN_ONLY_NOT_RUN | **Installed Phantom sign-only**. Согласованные wallet/origin/RPC/build/manifest/message; temporary signature preservation; retired v67 не использовать. |
| A12 | NETWORK_ACCEPTANCE_OPEN | **Отдельно разрешить real send**. Sign-only не разрешает send; finalized actual governance/config/funding/pools/NFT/readback после действий. |
| A13 | RELEASE_GO_OPEN | **Отдельный release GO**. Approved runtime manifest и live routing/storage/browser acceptance; MAINNET_GO остаётсяNO. |
| A14 | OWNER_DEFERRED | **Вернуть60PLOV до POOL_CREATE**. Решение/действие владельца перед запуском; проверить распределение и чужой customizable pool перед созданием, переводов в пакете нет. |

## 4. Порядок действий

1. Сначала зафиксировать выбор authority и ссылку на решение. [Черновик обращения](lower-config-inquiry.json) остаётся DRAFT_NOT_SENT. У оператора нужны конкретная доступность выдачи, применимые условия/стоимость/плательщик/срок. Общий SDK/Squads механизм уже исследован.
2. Принимать config по raw account и успешной finalized issuance transaction, включая историческое разрешение Operator. config-account-check.cjs сверяет поля с заданными ожиданиями; его PASS не равен одобрению или доказательству происхождения.
3. После реального config и отложенных решений связать свежие indexes, NFT PDAs, LOWER PDA, frozen ALT, seed/rent/операционный бюджет и плательщиков с хешами двух сообщений. Первый public member key не становится автоматически плательщиком.
4. Treasury SOL→LP vault + checked PLOV→LP ATA — одна транзакция. UPPER+LOWER — другая, внутри неё обе инициализации. Ошибка funding откатывает оба перевода; поздняя ошибка создания сохраняет уже переданные средства у LP.
5. LP12ч могут перекрываться с Treasury48ч при заранее согласованном точном сообщении. Репетиция48ч вместо60ч не гарантирует календарного срока. Изменение T0/содержимого требует новой рассмотренной заявки с применимыми голосами/задержкой.
6. Installed Phantom sign-only, real send и release GO принимаются отдельно. Retired v67 не использовать. Seed/private key, неизвестный Phantom account или произвольная дозаправка SOL не нужны для этого review.

## 5. Проверка и границы

Raw v94/v95 повторно декодированы и совпали с сохранёнными review, PDA, threshold, timelock и roster. Три LP member адреса входят в пять Treasury; личности/контроль/человеческая независимость неизвестны. Все13 application source pins совпали. Свежих RPC reads в этой сборке нет.

JSON фиксирует15 source evidence hashes,13 application hashes, хеш assembler, пять исторических program/ProgramData/ELF pins и исследовательский fee profile с alphaVault=false. ALT v104/v105 — builtin LiteSVM. Source/build parity и нынешнее deployment состояние не установлены. Готовых transaction bytes, подписей, назначенных плательщиков и send-разрешений нет.

Пакет не является runtime manifest: нет approved config/LOWER/geometry/T0/ALT и root pools array. Приложение продолжает требовать отдельно утверждённый manifest и фактические live accounts.

JSON: [lp-production-acceptance-v106.json](lp-production-acceptance-v106.json). SHA256: a7bc8f4b47b4fd19718ec57054b0bfb719b8796e5ec41ceb47cd9daa75f8f402.

Воспроизведение из research/lower-squads-offline: node assemble-production-review.cjs --write.

В этой сборке RPC/transaction builds/signatures/wallet prompts/network sends/external messages0. Whitepaper/токеномика/authority/балансы/production flags не менялись.
