# LOWER через Squads: локальные проверки v88–v95

Исторический этап v88,20.10.2026: **OFFLINE_SDK_CONTRACT_PASS**.
Публичные сверки LP v94 и Treasury v95, локальные этапы v92/v93 описаны ниже;
исторические v90/v91 и ограничения — далее.
В v88 выполнялись сборка и анализ инструкций, без исполнения программ. **MAINNET_GO=NO**.

## v95: завершённая публичная сверка Treasury

Treasury адрес восстановлен по сохранённому `read_snapshot.py` из v34:
multisig `Fg5AiXSjZrnUUmNTDQH47WBtAhtTXiM6yX66fFw4UNBz`.
SDK вывел vault index0 `3w5DmerxzYfMhVLHsdjHn5BU194u3R9DD5HaD7rr5VRm`;
этот же owner Treasury ATA указан в отчёте v45.

20.10.2026 22:08:39 Asia/Dushanbe получен finalized-срез Treasury
459307036–459307215. Настройки3/5/172800 секунд (48h) подтвердились свежими bytes.
Все5 участников имеют mask7 (initiate/vote/execute), configAuthority default;
SpendingLimit accounts0 в известном layout/filter. transactionIndex2/staleIndex1.
Среди2 retained proposals: Config1 Executed:SetTimeLock172800 и Vault2 Executed.
Незавершённых/Approved vault proposals в этой выборке0; готового нового funding
предложения не найдено. SOL баланс vault на первом слоте20001000lamports,
то есть0.020001SOL; это не утверждённая смета и не готовность финансирования.

Свежий Squads ELF1470416bytes/hashdec8d3e0… совпал с v90 и LP v94;
source/build parity по-прежнему не доказана. Genesis проверен до/после,
контексты finalized с монотонным floor, multisig bytes до/после одинаковы.
Raw ответы/запросы сохранены в `treasury-snapshot-v95.json`, отдельный офлайн
SDK/fixed-offset/PDA/hash readback PASS — `treasury-review-v95.json`.

| Контур | Публичный срез | Порог | Timelock |
|---|---|---|---|
| Treasury |20.10 22:08 Душанбе,459307036–459307215|3/5|48h|
| LP Operations |20.10 21:30 Душанбе,459296308–459296533|2/3|12h|

Три ключа участников LP входят в список пяти Treasury. Это сопоставление
публичных адресов, а не подтверждение их доступности или независимости людей.
Параллельная модель v43 использовала такие же пороги/задержки; реальный отсчёт
для новых операций требует новых одобрений, конкретных сообщений и funding.
48h остаётся модельной частью пути, а не обещанием календарного T0.

Reader расширен фиксированным target `treasury`, сохраняя прежний LP default.
Reviewer понимает новый target и нормализует большие числа config actions
в десятичные строки. Офлайн-readback сохранённого LP v94 полностью совпал с
прежним результатом; синтаксис обоих скриптов проверен.

Первая попытка чтения Treasury была остановлена средой:
`network approval was cancelled before a decision was returned`.
После подтверждённого пользователем продолжения публичное чтение завершилось.
В `treasury-preparation-v95.json` заполнены фактические поля и ссылки на snapshot/
review; предыдущая остановка сохранена как история. LP-08 остаётся OPEN:
доступность подписантов и актуальное состояние старых контроллеров v45 здесь
не подтверждены. Один RPC, разные слоты и retained known-layout accounts не
доказывают полноту истории закрытых аккаунтов и неизменность состояния в будущем.

Выполненные команды (при повторе выбирать новые output filenames):

```
node read-lp-governance.cjs --live treasury-snapshot-v95.json --target treasury
node review-lp-governance.cjs treasury-snapshot-v95.json treasury-review-v95.json
```

Reader ограничен публичными методами чтения и не создаёт транзакции.
Проверка адреса/PDA не подтверждает доступ к подписантам или разрешение funding.
Источники адресов и исторического профиля перечислены в preparation JSON.
Новые реальные подписи, транзакции, funding и governance changes0. MAINNET_GO=NO.

## v94: реальные настройки LP Operations

20.10.2026 21:30:11 Asia/Dushanbe получен публичный finalized-срез LP multisig
`9CcvfhksgjsQhK7fi4S7Mjv4gaCMNDpDiqGgS4CduA7B`, vault index0
`2bfo1Z7kfFu5BgmjCNCK5jAPqzV8emB39gCag62gravK`.
Raw account responses/request bodies находятся в `governance-snapshot-v94.json`;
повторная офлайн-декодировка — в `governance-review-v94.json`.

| Поле | Наблюдение |
|---|---|
| Контексты чтения | 459296308–459296533; предложения на459296354 |
| Порог / участники / timelock | 2/3;43200 секунд (12h) |
| Права | все3 участника имеют mask7: initiate/vote/execute |
| Config authority | default; autonomous multisig |
| SpendingLimit accounts | 0 в известном layout/filter этого multisig |
| transactionIndex / staleTransactionIndex | 3 / 2 |
| Предложение1 | Approved,ConfigTransaction:SetRentCollector(vault0),index1≤stale2 |
| Предложения2 / 3 | Executed:SetTimeLock43200 / Executed:VaultTransaction |
| Approved VaultTransaction | 0 среди3 найденных retained proposals |
| Vault native SOL | 20000000lamports =0.02SOL на первом слоте; не смета запуска |
| Squads ELF |1470416bytes,dec8d3e0fae58c7c8f2416e5f67c25e673f047afd6dd2bba4a47e0b29a01d34c; совпал с v90 |

Не терминальный статус Approved у предложения1 нельзя приравнивать к готовности
исполнения. В закреплённом исходнике `config_transaction_execute.rs` требуется
proposal.index>staleTransactionIndex; здесь1≤2. Это классификация по правилу
исходника; реальный execute не вызывался. Тот же stale-check нельзя переносить
на уже Approved VaultTransaction: `vault_transaction_execute.rs` прямо допускает
такое исполнение без этой проверки. Source/build parity отдельно не доказана.

Reader разрешает только getGenesisHash/getMultipleAccounts/getProgramAccounts.
Проверены genesis до/после, finalized и монотонный minContextSlot, owner/discriminator,
SDK decode/serialize и PDA. В офлайн-повторе threshold/timelock/индексы дополнительно
проверены по фиксированным offsets сырых bytes; все3 proposal/transaction сопоставлены
по PDA/index/hash,времена статусов нормализованы в decimal strings. До/после bytes
multisig совпали. Свежий ProgramData загружен для хеша; в JSON сохранены header/hash,
ELF повторно в Git не включён (полная совпадающая fixture есть в пакете v90).

Это один RPC, несколько слотов и известные layouts. Голоса/статусы proposals
могли меняться между чтениями даже при неизменном multisig. Закрытые исторические
аккаунты не восстановлены; полнота RPC криптографически не доказана. Проверка
не охватывает Treasury и не подтверждает доступность людей/ключей подписантов.
LP-08 остаётся OPEN; выбранный vault не становится approved config authority.
Никакие транзакции не строились/не подписывались/не отправлялись; MAINNET_GO=NO.

Воспроизведение:

```
node read-lp-governance.cjs --live NEW_SNAPSHOT.json
node review-lp-governance.cjs governance-snapshot-v94.json NEW_REVIEW.json
```

CLI отказывается перезаписывать существующий output. Второй вызов офлайн;
он сверяет сохранённые bytes, а не обновляет mainnet-состояние.

Источники: [Config execute,закреплённый commit](https://github.com/Squads-Protocol/v4/blob/af94153ff77a28b6effe46b9c94baaa93742b48c/programs/squads_multisig_program/src/instructions/config_transaction_execute.rs),
[Vault execute,тот же commit](https://github.com/Squads-Protocol/v4/blob/af94153ff77a28b6effe46b9c94baaa93742b48c/programs/squads_multisig_program/src/instructions/vault_transaction_execute.rs),
[permissions](https://docs.squads.so/main/development/reference/permissions),
[config transactions](https://docs.squads.so/main/development/typescript/instructions/create-config-transaction).

## v93: один голос отмены не останавливает исполнение

`npm run check:cancellation -- /absolute/path/to/fixtures` повторяет v92 и
добавляет четыре последовательности: add/remove × cancel-first/execute-first.
`cancellation-review-result.json`: **LOCAL_CANCELLATION_ORDER_PASS**,
80 локальных program-транзакций = 57 успешных + 23 ожидаемых отказа;
19 базовых,31 из v92,30 новых (включая создание proposals/голоса).

В синтетическом multisig2/3 после первого `proposalCancelV2` статус остаётся
Approved, в cancelled ровно один участник. После истечения timelock корректные
add и remove в таком состоянии успешно исполняются с точной liquidity delta.
Второй голос отмены после Executed получает InvalidProposalStatus: отмена не
является откатом уже исполненной операции. В обратном порядке второй голос
сначала переводит proposal в Cancelled; последующие execute и повторное approve
отклоняются с InvalidProposalStatus. Снимки отслеживаемого состояния при этих
отказах совпадают; внешние плательщики комиссий не включены в сравнение.

Практический порядок восстановления (не разрешение на реальные транзакции):

1. Проверить точный multisig, transaction index, сохранённое сообщение и текущий
   статус старого proposal. Первый голос отмены не обозначать как «остановлено».
2. Собрать требуемую отмену и проверить её подтверждение и итоговый статус
   по принятой политике finalized-чтения; факт отправки или один голос недостаточны.
3. Если фактический статус Executed, сначала сверить изменения позиции, vault,
   токенов и SOL. Нельзя отправлять прежнюю замену, предполагая, что старая
   операция не состоялась. Суммы и действия надо пересчитать от нового состояния.
4. Только после установленного исхода старого proposal готовить новую котировку,
   отдельное сообщение и новый индекс, заново проводить одобрения и timelock.
   Если исход не установлен, не объявлять старое отменённым и замену безопасной.

Проверены детерминированные порядки в локальной VM, не конкурентная работа
валидаторов, сетевой приоритет, MEV или гарантия включения отмены раньше execute.
Чтение статуса также не даёт автоматической блокировки следующей транзакции.
Нельзя переносить порог двух голосов на иные multisig без проверки их настроек.
Реальные governance/config/кошельки не использовались, MAINNET_GO=NO.

## v92: изменение рынка за время timelock

`npm run check:delayed -- /absolute/path/to/fixtures` запускает отдельную
синтетическую репетицию с пятью закреплёнными ELF из v90. Сеть и реальные
кошельки не используются. `delayed-review-result.json`: **LOCAL_DELAYED_REVIEW_PASS**,
50 локальных program-транзакций, включая 19 базовых v89 и 31 новую; это не 50
независимых сценариев. 33 исполнения успешны, 17 отказов ожидаемые.

Для пополнения и частичного вывода отдельно проверена последовательность:
точная котировка → предложение и 2 одобрения → реальный локальный swap другого
участника во время 12h timelock → истечение timelock → отказ ExceededSlippage.
Повторное исполнение также отклоняется. Снимки vault, LP, резервов, NFT, trader,
multisig, proposal и сохранённого сообщения не меняются при отказе; внешний
fee payer исключён из сравнения, поскольку комиссия не откатывается.

Важный результат: отказ по slippage **не отменяет** предложение — оно остаётся
Approved и потенциально может исполниться при возврате подходящей цены.
Новое предложение само по себе не выводит старое из обращения. Здесь старое
отдельно отменено двумя голосами через proposalCancelV2; последующий execute
даёт InvalidProposalStatus без изменения отслеживаемого состояния. Затем
собраны новая котировка и новое предложение, заново пройдены одобрения и
timelock; пополнение/вывод исполнились с точным изменением liquidity позиции.

Это не доказательство автоматического срока действия котировки или защиты
при любом движении рынка. В этой схеме отмена/разбор старого одобрения —
отдельный обязательный шаг восстановления, не локальная правка уже одобренного
сообщения. Все суммы и диапазоны синтетические. Реальный config, бюджет,
геометрия, wallet acceptance и запуск остаются не подтверждёнными.
MAINNET_GO=NO; приложение, root lockfile и launch-флаги не менялись.

## Что проверено

Изолированный пакет закрепляет Meteora SDK1.5.1, Squads SDK2.1.4 и web3.js1.98.0.
Корневые зависимости приложения и lockfile не изменены. Все mint/config/multisig,
member и blockhash в тесте синтетические, кроме публичного стандартного WSOL mint.
Реальные project authority, бюджет, диапазон и цена здесь не выбираются.
Сетевой fetch запрещён; Connection нужен только как аргумент конструктора SDK.
Ключевые пары не создаются. Проверка не сохраняет готовую транзакцию для подписи.

| Проверка | Результат |
|---|---|
| `initializePoolWithDynamicConfig`: payer и poolCreatorAuthority | signer = synthetic vault PDA |
| Новый position NFT mint | writable signer = ephemeral PDA index0 |
| `creator` / владелец NFT | явно выбран тот же synthetic vault |
| Внутреннее сообщение Squads | ровно2 signing accounts: vault и NFT mint |
| Внешние remaining accounts execute | vault/NFT PDA не требуют внешней криптоподписи |
| `ephemeralSigners=0` | NFT mint остаётся внешним signer; обнаружена ошибка сборки |
| Чужой transaction index | старый NFT mint не распознаётся как ephemeral signer |
| Token-2022 WSOL | SDK отклоняет до сборки |
| Размер unsigned v0 create / execute | 1146 / 972 bytes без ALT и compute-budget instructions |
| RPC / подписи / send | 0 / 0 / 0 |

`result.json` содержит7 проверок, размеры и SHA256 внутреннего сообщения.
Это детерминированный результат SDK, не успешная simulation, CPI или pool creation.
Размеры относятся только к этой синтетической сборке: memo, lock, compute budget,
другие аккаунты/инструкции и иные типы сообщения требуют нового замера.
Нулевые подписи при измерении нужны лишь для размера контейнера, не для отправки.

## Путь подписи по закреплённым исходникам

1. После чтения актуального multisig выбрать следующий transaction index как bigint,
   получить transaction PDA. Индекс теста1 не резервирует индекс реального проекта.
2. От него получить `getEphemeralSignerPda({ transactionPda, ephemeralSignerIndex:0 })`.
   Это новый mint адрес позиции; обычная секретная keypair для этого пути не нужна.
3. Передать этот публичный адрес как `positionNft` в
   `createCustomPoolWithDynamicConfig`. `payer`, `poolCreatorAuthority` и `creator`
   в рассматриваемой схеме указывают на один выбранный vault. Это проектная схема,
   а не требование протокола всегда делать эти три роли одинаковыми.
4. В `vaultTransactionCreate` указать `ephemeralSigners:1`, нужный vaultIndex,
   **тот же** transactionIndex и полное внутреннее сообщение SDK, включая ATA/wrap.
   Если индекс занят параллельным предложением, пересчитать transaction/NFT/position
   адреса и заново собрать предложение. Подмена только индекса недостаточна.
5. Пройти установленный порог и timelock. Исполняющий member и плательщик внешней
   транзакции — внешние подписанты. Не путать их с vault PDA в роли payer внутри CPI.
6. Squads execute восстанавливает signer flags внутреннего сообщения и вызывает
   `invoke_signed` с seeds vault и ephemeral PDAs. Meteora видит signer NFT mint и
   signer authority. Config обязан содержать точно этот pool_creator_authority.
7. Meteora создаёт Token-2022 position NFT и его token account PDA. Владелец token
   account — **creator**, не автоматически оператор, executor или config authority.
   Поэтому до утверждения обязательно сверить creator и ownership после исполнения.

Это вывод по исходникам и офлайн-клиентам. Фактические Squads/Meteora binary pins,
CPI depth/CU, ограничения реальной транзакции и разрешения конкретного config
проверяются при runtime-репетиции; здесь они не выданы за PASS.

## Найденная деталь финансирования WSOL

`prepareCreatePoolParams` SDK1.5.1 создаёт идемпотентные ATA-инструкции для payer
(включая off-curve owner), затем для NATIVE_MINT добавляет `SystemProgram.transfer`
на payer WSOL ATA и `SyncNative`. В этом пути нет свежего WSOL keypair и дополнительного
внешнего подписанта. `tokenBAmount` служит суммой wrap; он не устанавливает жёсткий
on-chain лимит token B в initialize instruction. Фактический debit выводится из
liquidity/price/range и должен проверяться отдельно, включая округление.

При предварительно пополненном WSOL ATA нельзя считать, что SDK использует только
готовый WSOL: обычный builder всё равно добавляет указанный wrap. Не добавлять ещё
один ручной wrap поверх builder и не обнулять сумму наугад. Перед реальным proposal
нужны баланс до/после, список всех переводов и утверждённый способ фондирования.
В данном тесте перевод1 lamport — синтетическая метка, не рекомендация суммы.

## Первичные источники

Meteora program: commit `5398b5c7c534de014091132da37c6478cce671a8`:
[dynamic init](https://github.com/MeteoraAg/damm-v2/blob/5398b5c7c534de014091132da37c6478cce671a8/programs/cp-amm/src/instructions/initialize_pool/ix_initialize_pool_with_dynamic_config.rs).
Проверены `Signer` payer/authority, `has_one`, init signer mint, token authority creator,
и расчёт реальных сумм перед transfer_from_user.

Meteora SDK source: commit `79ebbfe59a225e641a2f37cd03404f26de1b0c8e`, package.json1.5.1:
[CpAmm.ts](https://github.com/MeteoraAg/damm-v2-sdk/blob/79ebbfe59a225e641a2f37cd03404f26de1b0c8e/src/CpAmm.ts),
[token helpers](https://github.com/MeteoraAg/damm-v2-sdk/blob/79ebbfe59a225e641a2f37cd03404f26de1b0c8e/src/helpers/token.ts).
Совпадение номера версии не является доказательством воспроизводимой npm/source parity.

Squads source: commit `af94153ff77a28b6effe46b9c94baaa93742b48c`, SDK package.json2.1.4:
[PDA derivation](https://github.com/Squads-Protocol/v4/blob/af94153ff77a28b6effe46b9c94baaa93742b48c/sdk/multisig/src/pda.ts),
[vault execute](https://github.com/Squads-Protocol/v4/blob/af94153ff77a28b6effe46b9c94baaa93742b48c/programs/squads_multisig_program/src/instructions/vault_transaction_execute.rs),
[ephemeral seeds](https://github.com/Squads-Protocol/v4/blob/af94153ff77a28b6effe46b9c94baaa93742b48c/programs/squads_multisig_program/src/utils/ephemeral_signers.rs),
[invoke_signed / message validation](https://github.com/Squads-Protocol/v4/blob/af94153ff77a28b6effe46b9c94baaa93742b48c/programs/squads_multisig_program/src/utils/executable_transaction_message.rs).

## Что осталось для runtime

Нужна репетиция Squads → Meteora → Token-2022/System/ATA с реальными программными
бинарниками и synthetic state: успешный create, NFT ownership, debit/rent и CU;
отказы при wrong authority/config type, пропущенном или чужом ephemeral PDA,
недостаточном SOL/PLOV, неподтверждённом proposal и невышедшем timelock; полный rollback.
В synthetic state Operator доступ должен маркироваться synthetic и не закрывает LP-03.
До devnet/mainnet следует повторно сверить network/genesis, deployments, authority
и config. Предыдущий C+B результат не переносится на эту новую exact-message сборку.

## Воспроизведение

Из этой папки: `npm ci --ignore-scripts --no-audit --no-fund`, затем `npm run check`.
Запуск не требует кошелька, SOL, config аккаунта или RPC доступа.
При установке без native build используется pure-JS bigint; проверка прошла в этом режиме.


# v89 — исполнение программ в LiteSVM

Локальная проверка завершена: **LOCAL_SBF_SUITE_PASS**, 19 транзакций программы:
8 успешных, 11 ожидаемых отказов. Дополнительно5 локальных airdrop для тестового
фондирования. Все ключи, mint, multisig, Operator state и config — синтетические.
Реальные кошельки/сеть: prompts0, sends0. **MAINNET_GO=NO**.

Загружены свежие mainnet ELF Meteora/Squads (finalized read09:32UTC /14:32Dushanbe):
program read459181440, ProgramData read459181480; genesis проверен до/после.
Meteora deployment457080014, ELF SHA256967ff9fb…a2022 (совпадает с v85).
Squads deployment302582236, ELF SHA256dec8d3e0…01d34c.
Полные хеши и адреса — `program-pins.json` в сохранённом пакете бинарников.
Это чтение одного RPC в разных контекстах, без доказательства source/build parity.
SPL Token/Token-2022/ATA взяты из LiteSVM1.4.1; они не закреплены по mainnet ELF.
Обычный native mint state создан в fixture вручную. Положительный тест — исполнение
реальных Meteora/Squads ELF с тестовым состоянием, не полная копия mainnet.

| Сценарий | Результат |
|---|---|
| Создание synthetic Squads 2/3 с timelock43200 | PASS |
| Operator permission0 / CreateConfigKey отсутствует | InvalidPermission6054; config не появилась |
| Создание dynamic config с synthetic CreateConfigKey | PASS; type1, нужный vault authority |
| Test mint/инвентарь, vault transaction, proposal, два голоса | PASS |
| Один голос / задержка не вышла | InvalidProposalStatus / TimeLockNotReleased |
| Config с другим authority / static type | ConstraintHasOne / InvalidConfigType |
| Недостаточно SOL / токенов | ожидаемый отказ; полный откат проверяемого состояния |
| Нет ephemeral signer / NFT от другого transaction PDA | InvalidAccount |
| Лимит100000CU | ожидаемое исчерпание; полный откат |
| Исполнение после2 голосов и12h | PASS;173304CU в данной локальной среде |
| Повтор исполненного proposal | InvalidProposalStatus; повторного списания нет |

Для10 отказов на исполнение до/после успешного create сравниваются данные, owner,
lamports и наличие12 аккаунтов; тест чужого ephemeral дополнительно проверяет13-й.
Отдельно отсутствие config/неизменность Operator проверены при отказе issuance.
Исполнитель платит локальную tx fee и исключён из сравнения отката. Ошибки после
начала Meteora init также откатывают создание pool/position/NFT, wrap и переводы.
Missing/foreign ephemeral, wrong authority/type и недостаточные балансы внесены
через локальное изменение fixture state. Это fault injection, не утверждение,
что такое изменение approved proposal доступно злоумышленнику в реальной сети.

Readback успешного пула: NFT supply1/decimals0, token account owner=vault;
base fee2500004/1e9 постоянная, protocol20%, dynamic0, compounding0, OnlyB,
timestamp activation, Alpha Vault отсутствует. Тестовые1e9 token units и1e9 lamports
поступили в соответствующие резервы; остаток WSOL ATA0. Vault debit1024645360lamports
равен principal1e9 + сумме lamports новых аккаунтов24645360. Это расходы тестового
создания, **не полный бюджет запуска**: внешние fees/proposal/config/сервис оператора
и реальная выбранная конфигурация оцениваются отдельно. Значения не меняют бюджет.

Воспроизведение: установить зависимости из lockfile; распаковать сохранённый пакет
и задать `PLOV_LOCAL_FIXTURES` на папку `fixtures`; запустить `npm run check:runtime`.
Скрипт проверит SHA256 обеих ELF из соседнего `program-pins.json`. Подписи создаются
только детерминированными тестовыми keypairs и отправляются только в локальную VM;
HTTP RPC в runtime отсутствует. При необходимости **нового** read-only среза:
`python download-program-fixtures.py --output /absolute/scratch/path`.
Новый срез может содержать другой код и потребует отдельной оценки результата.

Первый прогон выявил отсутствующий native mint в fixture; он явно добавлен в setup.
При доработке теста исправлены Uint8Array для сериализации и ожидаемый код
InvalidPermission6054. После исправлений полная suite и7 offline checks прошли.
Не проводились installed Phantom, devnet/mainnet execution, source/build audit,
production wiring или утверждение настоящего config/manifest. LP-03/09/15 Открыто.


# v90 — полный цикл и пять закреплённых программ

**LOCAL_PINNED_LIFECYCLE_PASS**:93 программные транзакции,76 успешных и17
ожидаемых отказов. Включает19 сценарных шагов v89, повторённых с новыми support ELF,
и74 дополнительных транзакции. Число93 включает служебные proposals/голоса;
это не93 независимых экономических сценария. Дополнительно5 локальных funding airdrop.
Реальных prompts/network sends0; подписи есть только от детерминированных fixture keys.

Meteora/Squads ELF сохранены из finalized read459181440/459181480. Дополнительно
прочитаны SPL Token, Token-2022 и ATA на459185138/459185174 (14:45:56Dushanbe).
Каждый ELF проверяется по SHA256 перед загрузкой. Loader для support-программ
также учитывается: ATA — legacy BPF Loader2, SPL Token/Token-2022 — upgradeable.
`program-pins-v90.json` содержит полные адреса, loader, contexts/slots и хеши.
Это два среза одного RPC; они не атомарны и не доказывают честность сервера.
Native mint state, governance, balances, config/Operator и геометрия синтетические.
Бинарники исполняются в LiteSVM1.4.1 с её native runtime/sysvars/features, не в mainnet.

## Результаты полного цикла

| Действие | Проверка |
|---|---|
| Пополнение LP через2/3+12h Squads | position liquidity выросла на SDK quote delta; NFT остаётся у vault |
| Нулевой допустимый входной лимит add | ExceededSlippage, rollback |
| ExactIn и ExactOut, A→B и B→A |4 успешных swaps; точные token/reserve deltas по quote |
| Невозможный min output swap | ExceededSlippage; LP/pool/trader token state откатились |
| Сбор LP fees через Squads | OnlyB:43921lamport получил vault; A fees0 |
| Частичный вывод | liquidity/token/SOL deltas совпали с withdraw quote |
| Завышенный min output вывода | ExceededSlippage, rollback |
| Закрытие непустой позиции | PositionIsNotEmpty, rollback |
| Реальная локальная передача NFT другому владельцу | vault claim отклонён InvalidAuthority6053, получатель может claim |
| Возврат NFT в vault | права восстановлены без изменения config authority |
| Полный вывод остатка позиции | unlocked/pool liquidity0, суммы совпали с quote |
| Закрытие пустой позиции | position/NFT mint/NFT token account закрыты,9897120lamports ренты вернулись vault |
| Два одновременно фондированных пула одной пары | config-based и customizable имеют разные PDA; вывод LOWER не меняет companion |
| Второй customizable той же пары | тот же PDA; создание отклонено, новые NFT/position аккаунты откатились |

Geometry companion-пула синтетическая и служит проверке PDA. Она не выбирает
production UPPER/LOWER диапазоны, цену или бюджет. Даже после закрытия LP позиции
pool account остаётся; его закрытие этим циклом не выполняется.

У4 swaps дополнительно проверены SOL и оба token vault delta, включая локальную
fee5000lamports на каждую одно-подписную транзакцию. Это параметр данного теста,
не калькуляция реальных сетевых расходов. Максимальный wire container1186bytes
(с ComputeBudget instruction, без ALT); применимость к другому набору инструкций
не следует из этого размера. Успешный LOWER create173363CU в этой VM.

## Округления, которые нельзя терять в отчёте

Сумма quote LP fees43922, фактический claim43921:1raw unit остаётся из-за
накопления/округления fee growth. Protocol B fees10979 проверены отдельно.
После частичного, затем полного вывода и закрытия позиции в пуле остаются
2raw units A и10981raw units B (protocol10979 + non-protocol residual2).
Это не «нулевые резервы». Остатки сверены с балансами перед последним выводом
минус точные amounts SDK quote; закрытие NFT/позиции их не перемещает.
Все значения относятся к синтетическому SPL9/WSOL9 примеру; бюджет проекта не меняется.

## Публичная проверка source/build

Read-only GET documented OtterSec status API выполнен20.10 в14:50Dushanbe.
Сырые ответы сохранены в `public-build-status-v90.json`:
Meteora/Squads/ATA — `is_verified:false`; SPL Token/Token-2022 — true.
Для Squads, SPL Token и Token-2022 registry on_chain_hash совпадает с SHA256
наших ELF после удаления trailing0 bytes. Полные ELF hashes из pins не заменяются.
У true-ответов registry executable_hash также совпадает; это сообщение внешнего
реестра, а не наша независимая воспроизводимая сборка. У Squads executable_hash
пустой, поэтому наличие repo URL/совпавшего on_chain_hash не превращено в PASS.
Флагfalse не означает автоматически уязвимость или доказанное различие исходников.
API описан владельцем: https://github.com/otter-sec/solana-verified-programs-api.
Новых jobs/verification requests, сетевых транзакций и сообщений не создавалось.

## Воспроизведение v90

Из этой папки установить зависимости из lockfile. Распаковать сохранённый пакет,
задать `PLOV_LOCAL_FIXTURES` на его абсолютную папку fixtures и выполнить
`npm run check:lifecycle -- /absolute/path/to/fixtures`. Скрипт использует соседний
program-pins.json с5 программами; launcher также работает в Windows с путём в кавычках.
Полный результат и logs — `lifecycle-result.json`; предыдущие v88/v89 JSON сохранены.
Пример нового read-only support snapshot: `python download-program-fixtures.py
--support-only --output /absolute/scratch/path`. Он не перезаписывает прежний срез.

## Что ещё требует реальных входов

Actual Operator issuance/config и финальный authority; реальные UPPER/LOWER и
одобренный manifest; исходники/сборки/аудит применимого release; production host,
provider/storage policy и installed Phantom; отдельно разрешённая реальная проверка
подписи/отправки; окончательный release GO. Бюджет/геометрия и возврат60PLOV остаются
решениями владельца перед запуском. Весь этот блок не требует его текущего участия,
но также не закрывает эти production gates. MAINNET_GO=NO.

Инвентарь `docs/trading-release-gates.json` обновлён доv90:13 текущих source hashes
проверены; запись реальной wallet acceptance остаётся NOT_RUN/null. Старое описание
provider integration уточнено с учётомv84; исторические144 browser/109 Node checks
здесь не перезапускались. Root app dependencies/lock/routes/launch flag не менялись.

Дополнительная проверка совместного фондирования: companion создаётся до полного
вывода LOWER, обе liquidity положительны. Hash companion pool неизменен после
полного вывода/закрытия LOWER позиции. На final remove SDK также закрыл общий
WSOL ATA с прежним балансом/рентой2039280lamports и вернул их vault. Поэтому SOL
прирост равен quote-поступлению из пула **плюс** прежние lamports WSOL ATA; этот
возврат учтён отдельно от ренты позиции9897120. В production нельзя считать, что
unwrap затрагивает только средства конкретной LP операции.

# v91 — проверка байтов полученного config

`config-account-check.cjs` — отдельная офлайн-проверка известного Config328.
Она не обращается к RPC, не обнаруживает кошельки и не подписывает/отправляет
транзакции. `npm run check:config` проверил30 условий, включая отказы и сохранение
текущей проектной карточки NOT_RUN/null. Результат — `config-account-check-result.json`.

Вход1 — JSON snapshot с полями schema1, genesisBefore/genesisAfter, capturedAt
(канонический UTC ISO с миллисекундами), currentFinalizedSlot, commitment,
address и accountResponse (сырой getAccountInfo result с context/value).
Вход2 — ожидаемые authority, index (десятичная строка u64), address,
minContextSlot, maxSlotLag, maxAgeMs. Все поля обязательны. Временные/slot лимиты
задаёт вызывающий; скрипт не выбирает и не утверждает production policy.
Команда: `node config-account-check.cjs SNAPSHOT.json EXPECTED.json`.

Проверяются основной genesis до/после чтения, finalized, время/slot floor/lag,
program owner, non-executable, канонический base64, размер328/discriminator,
dynamic type1, точное authority/index/PDA и все128 permission bits=0.
Fixed-offset чтение отдельно сверяется с decoder SDK1.5.1 (`Config`, snake_case).
Неизвестный размер/layout отклоняется; совместимость с иной deployed-версией
требует отдельного decoder/program pin review. Геометрия/fees/mint-пара будущего
пула не проверяются внутри dynamic config: эти поля не фиксируют будущий LOWER.

Успешный результат называется `EXPECTED_ACCOUNT_FIELDS_MATCH_ONLY` и всегда
сохраняет issuanceAccepted=false, poolCreationAuthorized=false,
readyForNetworkSend=false и MAINNET_GO=NO. Он доказывает только внутреннее
совпадение переданных байтов и ожиданий. Заголовки RPC, timestamps и ожидания
поставляет вызывающий; подпись/честность сервера или одобрение владельца этим
не устанавливаются. SHA256 — контроль содержимого, не удостоверение подлинности.

Отдельно остаются текущие program/deployment/ELF pins, успешная finalized issuance
transaction, исторический Operator authorization path, одобрение authority/расходов
и actual pools/manifest. CLI не заполняет acceptanceRecord и не назначает authority.
Реальный config в v91 не получен; тестовый index89 не зарезервирован в сети.

## v100 — точный перенос исследовательских v29 в Q64.64

20.10.2026. Проверены12 проходящих TWO MIN/IDEAL×90/100%×три frozenFX
из финального математического v29 (при FX103.80 —4 сочетания).
`v29-geometry-input.json` хранит точные дроби Q/FX/цен/коэффициентов,
источник summarySHA256 d53364a6b5aebe661bda724c4ef1597db98fcdd2f2be05f238e825ce1f134372
и хеш финального v29 ZIP. Это исследовательские параметры, не выбор запуска.

В этой папке после восстановления закреплённых зависимостей выполните:

```bash
node v29-geometry.cjs
python3 -S verify-v29-geometry.py
```

Первый скрипт использует фактический SDK1.5.1: перевод ценыSOL/PLOV в sqrtQ64,
liquidity из amountA дляUPPER/amountB дляLOWER, validator диапазона/старта/fees,
debit округлённый вверх и withdrawal округлённый вниз.206 проверокPASS.
ТокеныPLOV иWSOL имеют9 decimals, поэтому raw/UIprice scale одинаков.
Начальная общая границаP0 использует ОДНО целое sqrt для обеих полос.
UPPER приT0 содержит700M PLOV/0SOL; LOWER —0PLOV/seedSOL.
СуммаSOL переводится в lamports вниз (капитал не увеличен), liquidity вниз,
потребность инициализации — вверх. Во всех24 полосах debit точно равен
целому бюджету; превышений или скрытого дополнительного wrap не заявлено.
Скрипт не строит транзакции, поэтому фактический wrap builder здесь не проверялся.

Независимый Pythonoracle безSDK/model проверяет sqrt через isqrt и рациональные
неравенства, заново выводит физический низ из Q/P/L, пересчитывает liquidity/debit
большими целыми, u128 представление, u256 размеры показанных произведений,
полноту12 сочетаний и границы округления.564 проверкиPASS.
SDK sqrt во всех случаях совпал с точным floor; максимальная относительная
ошибка цены отQ64floor≈9.034e−17, виртуального коэффициента≈2.656e−12.
Недовнесение отперевода seed в lamports<1lamport; разница ceil/floor для
одного и того же liquidity≤1rawединица каждого токена.

JSONрезультаты сохраняют SDKentry/lock/input/result SHA256. Исходники входят
в Git, не дублируются отдельным архивом. Rootapp/dependencies/lock не менялись.
Это проверка ЧИСЛЕННЫХ начальных параметров и SDKvalidator, не nativepoolcreation,
не полный atomicreplay D0–D90, не доказательство полного набора runtime maxL
ограничений и не получение реальногоconfig. Предыдущие syntheticELFпрогоны
v90/v93 не считаются исполнением этих точных v29кандидатов.

Следующий технический шаг: native replay этих исследовательских кандидатов
с точными atomic fees/claims/returns, проверкой10SOL/drop/IL и реальных runtime
ограничений. Productionconfig/authority/адреса/бюджет остаются не утверждены.
RPC/кошельки/подписи/сборки/сетевые отправки0. Wave1inputs=null;MAINNET_GO=NO.

## v101 — полный нативный путь исследовательских v29

20.10.2026. Все12 проходящих TWO MIN/IDEAL×90/100%×три frozenFX
исполнены вLiteSVM1.4.1 на пяти retainedELF v90. Для каждой VM создаются
синтетические mint9decimals, Operator/config, customizableUPPER иdynamicLOWER
с точными Q64/liquidity v100. Реальный PLOVmint не меняется. Все подписанты
локальные прямые keypairs; это не новый тест Squads и не приёмка realconfig.

```bash
node v29-native.cjs /absolute/path/to/v90/fixtures
python3 -S verify-v29-native.py
```

Fixtures предоставляются явно; скрипт сверяет все5ELF SHA256 с
program-pins-v90.json. Никаких автоматических скачиваний/RPC нет.
Существующий PLOV_LIQUIDITY_v90_FULL_CYCLE.zip содержит pinnedfixtures.
Для cloneрепозитория нужны зависимости из закреплённого локального lock.
SDKentry/lock/input/runner/oracle hashes — v29-native-reproduction.json.

Результат одного итогового прогона:246 nativeтранзакций,234успеха,
12 ожидаемых ExceededSlippage с откатом10 отслеживаемых аккаунтов
(внешний плательщик теряет только5000lamports). Отдельно36локальных funding
airdrops.162swaplegs,24poolinitializations,24реальных localLPfeeclaims,
60postсобытий. Все границы иinitialliquidity прочитаны обратно из программы.
Второй полный прогон дал побайтно одинаковые4 JSON/CSVрезультата.

v29-path-input.json сохраняет точные исходные покупки/claim и непрерывные
referenceevents. Покупки переводятся в атомы вниз; возврат=floor((1−k)*buyAtoms).
Три claim распределяются разностями cumulativefloor, поэтому сумма точно
W=1171170270PLOV, без потери последнего атома. Купленные токены и выданные
claim в тесте принадлежат одному синтетическому trader; retained/return
суммы учитываются отдельным точным ledger, не создают новых marketпокупок.
TERMINAL имеет условный VMday91 только для порядка послеD90; это не заданная
дата возврата когорт или принятие производственного календаря Wave1.

Маршрут покупки: LOWERдообщейP0границы, затемUPPER; маршрут продажи:
UPPERдоP0, затемLOWER. Переход использует PartialFill с точным остатком,
остальные покупкиExactOut ипродажиExactIn. Это ручной SDKмаршрут,
не доказательство того, что Jupiter выберет те же legs или исполнит атомарно
двухпуловую сделку. Здесь legs исполняются последовательно в замороженном
локальном состоянии; конкурентная торговля между ними не моделируется.

3593 независимых Pythonпроверки (безSDK/model) заново считают feeceil,
protocolfloor20%, swapQ64переходы/amounts, conservation, claims/returns,
withdrawablefloorprincipal иIL, minOutrollback/transactionlimits.
IL использует доступные к выводу curveA/B и claimableLPfees, а не все балансы
vault. Порог principal≥10SOL соблюдён во всех60 событиях; минимум
10.001001103SOL. Падение≤45%, downside/all-post IL≥−.19% сохранены.
Послеterminal фактически полученные LPfees совпали с claimableснимком;
principal/price не изменились. Refund существующего WSOLrent отделён отfee.

| Основной FX103.80 | Минимальный withdrawableprincipal,SOL | Максимальное падение,% |
|---|---:|---:|
| MIN90% | 10.001001438 | 36.065736779935 |
| MIN100% | 10.001001438 | 23.868044148543 |
| IDEAL90% | 10.001001435 | 23.298941496967 |
| IDEAL100% | 10.001001435 | 10.168042609234 |

Нативный readback выявил1lamport начального баланса customizableUPPER
WSOLvault сверхprincipal: vaultB=1, pool.tokenBAmount=0, lamports2039281,
nativeRentReserve2039280. ДляdynamicLOWER такого превышения нет.
Этот surplus явно исключён изprincipal/fees и не представлен какseedQ.
Доказан балансовый факт, но не отдельно аудит всех источников этойединицы.
Сумма реального operationalB по этим данным не утверждается.
Rounddust accountminuswithdrawable достигает18293rawPLOV и5lamports;
это тоже не доступный резерв. Max price delta кcontinuousv29≈2.427e−18USD,
max demanddelta≈6.995e−9SOL. Глобальная оптимальность спроса не заявлена.

Подготовительные попытки остановились сначала из-за завышенного запроса
localairdrop (fundingнепрошёл, поэтому добавлена проверка fundingreadback),
затем из-за неверного ожидания отсутствия nativevaultsurplus. Исправлен
стенд/учёт; Q/диапазоны/покупки/fees/пороги v29 не подгонялись.

Полный transcript с nativeлогами сохранён отдельно:1278481байт,
SHA256 a8838ea7c5e6f0363ef84bbd36b72eddad4e456c7cd4bad3d8325b5bc69b341b,
PLOV_v101_NATIVE_TRANSCRIPT.json (Library libfile_fc9c1b5ffae081919994027fbbba1ad1).
Он воспроизводится скриптом и игнорируетсяGit; исходники/input/review/summary/
eventcomparison/reproduction вGit. Не копировать чужой transcript как новыйrun.

Открыты exactcandidateSquads handoff, realconfig/authority/manifest,
source/buildparity, mainnet features/ordering/Jupiter/walletacceptance,
операционный бюджет и фактический спрос. Это не новый mainsnapshot и не
выбор бюджета/productionгеометрии. Networkrequests/sends/realwalletprompts0;
есть только localsyntheticsignatures. Wave1inputs=null;MAINNET_GO=NO.

## v102 — точные кандидаты через Squads и закрытый старт

20.10.2026. Проверены те же12 исследовательских сочетаний и24 poolinitializations,
теперь через synthetic2/3+12h Squads, на пяти retainedELFv90. Настоящие
config/authority/vault/кошельки проекта не используются.

```bash
node v29-squads.cjs /absolute/path/to/v90/fixtures
python3 -S verify-v29-squads.py
```

UPPER иLOWER создаются двумя отдельными предложениями. Для каждогоmessage
ephemeralSigners=1; NFTmint PDA зависит от конкретного transactionindex.
Внутренниеsigners — только vault иNFT PDA.36 messageбайт (24initializations+
12feeclaims) заново сериализованы из nativeVaultTransaction и совпали с
проверенными доstore. При добавлении этой проверки тестовый decoder вернул
Uint8Array, тогда как компактный Beetcodec требовалArray: нормализован только
формат accountIndexes/data для сравнения, байты инструкций не менялись.

Порог2/3 и12h исполнены настоящим SquadsELF. NativeProposal timestamps
подтверждают43201сек между Approved/Executed в каждом из36предложений.
Не прошли исполнение с одной подписью, доtimelock, при неправильном
configauthority/type, отсутствующем NFTephemeral, недостатке base/SOL,
повторное исполнение и прямое получениеLPfees обычным member безvault.
Некоторые отрицательные случаи — явно внесённые локальные повреждения
accounts, не действия производственного сервиса.

Readback24пулов совпал с точными sqrt/liquidity/principal v100. Все24NFT
остались уvault. SOLdebit vault равен сумме lamports всех созданных аккаунтов,
включая principal иrent; PLOVdebit точно соответствует700M/0 по полосам.
СозданиеLOWER не меняетUPPER. После публичной D0продажи70M PLOV
12отдельных feeпредложений сephemeralSigners=0 иединственным signervault
фактически выдали claimableSOL. WSOLrentrefund2039280lamports отделён отfees;
principal/price/NFTowner не изменились. Это D0smoke, не повтор полногоD0–D90;
полный математический/nativeпуть остаётся отдельным v101результатом.

### Обнаруженный промежуток между пулами

При последовательных timelockисполнениях между UPPER иLOWER в этой
репетиции43201сек. Активация «сразу при создании» не даёт атомарной готовности
TWO. В финальном тесте обеим полосам передан ОДИН будущий timestamp;
24nativeпопытки торговли отклонены сPoolDisabled: UPPER, когдаLOWER ещё нет,
иLOWER за1сек до общего timestamp. Продажа при самом timestamp прошла.
Оба пула созданы заранее;300сек запаса после второго — только testfixture,
не рекомендованный operationalбуфер и не датаTGE.

Критическое ограничение: timestamp НЕ проверяет наличие второго пула.
ЕслиLOWER не готов к реальномуT0, UPPER всё равно может открыться по времени.
Передmainnet нужны утверждённый план готовности обоих пулов и проверенная
процедура опоздания/переноса/отмены. Реальный activationPoint остаётсяnull,
productionactivationfailureprocedure OPEN. Этот тест не разрешает запуск
или самовольное изменение утверждённого календаря.

Итог одного прогона:444nativeтранзакции,240успехов/204ожидаемыхотказа,
60отдельных localfundingairdrops.1558независимых Pythonпроверок PASS:
полнота12×2,геометрия/суммы/fees,бюджет/rent,NFTowner,proposal timestamps,
readbackmessagehash,общаяактивация и сохранность rollbackhashes.
Максимальный serializedenvelope1194байта, CU181601 в этойVM; безALT,
не mainnetfee/CUquote. Показанные размеры относятся к этим отдельным
предложениям, а не к атомарной сборке сразу двух пулов.

Повторный полныйrun дал побайтно одинаковые3 JSON/CSVвыхода.
Полный transcript1062057байт SHA256
27657c4121578d5c40cf5831b2a35e36c57b9b06d4edd760ec099d259009b6ce
сохранён отдельно какPLOV_v102_SQUADS_TRANSCRIPT.json,
Library libfile_45a9937163e4819194c8112e017132bb. Исходники, summary/review/
reproduction вGit; большой генерируемый rawtranscript игнорируетсяGit.

Не подтверждены realconfig/authority/manifest, фактическое финансирование
Treasury, безопасность governanceнаживыхкошельках/доступподписантов,
sourcebuildparity, atomic/Jupiterrouting, mainnetконкуренция иreleaseGO.
Бюджет/60PLOV отложены владельцем. Rootapp/deps/lock/routes/flags прежние;
networkrequests/sends/realwallet0, есть localsyntheticsignatures.
Wave1inputs=null; MAINNET_GO=NO.

### v103 — missing LOWER: postponement and stop boundaries

The pinned SDK1.5.1 IDL exposes **no activation-time update instruction**. Its
`setPoolStatus` requires an Operator account; pool creation/NFT ownership alone
does not provide that permission. This suite does not establish project Operator
access. The native absent-Operator test fails `AccountOwnedByWrongProgram`,
without modifying the pool or governance state.

Twelve fresh synthetic VMs cover four current-FX v29 candidates (MIN/IDEAL,
90/100% retention) and three deterministic orderings. Each creates exact UPPER
through Squads2/3+12h, stores the real LOWER creation message and cancels it with
two votes. LOWER remains absent; cancellation leaves UPPER bytes and T0 unchanged.
Separately approved full-withdrawal and disable messages are read back from the
native stored message account. No v102 runner, geometry or budget was modified.

| Ordering | Native result |
|---|---|
| Abort timelock matures301s before T0 | Withdrawal at T0−301s rejects `PoolDisabled`, despite mature approval; retry at T0 succeeds if executed before any trade. |
| Abort becomes executable42900s after T0, no intervening trade | Timelock prevents earlier execution; full withdrawal at maturity succeeds. |
| Same late abort, public1SOL buy at T0 lands first | UPPER trades with LOWER absent; unchanged-price withdrawal floor then rejects `ExceededSlippage`, remaining Approved. |
| Creator vault attempts pool disable without an Operator account | Rejected in all12 VMs; ordinary creator custody is insufficient. |

The preactivation rejection is **a protocol boundary**, not a harness failure:
even preapproving an abort more than12h ahead does not let the creator withdraw
before pool activation. Successful postactivation withdrawals return the
independently calculated floor PLOV amount, set pool/position liquidity to0 and
return the existing2039280lamport WSOL account rent separately from principal.
The tested buy then fails. Pool account, NFT custody and original T0 remain;
this is not pool deletion or a clock reset.

There is **no proven safe prestart abort** for the current independently funded,
creator-only two-timer design. An at-T0 withdrawal is exposed to transaction
ordering. Requoting after an intervening trade needs a new approved message and
its applicable timelock; zero thresholds are not approved production policy.
Cancelling LOWER cannot stop an already created UPPER. Do not treat a larger
calendar buffer or one cancellation vote as an automatic readiness guard.

Next technical gate: verify whether both exact initializations can execute
atomically in one governance operation, or establish and test a genuinely
authorized stop mechanism before adopting any independently funded UPPER timer.
Neither alternative is accepted by this suite. Actual project config, approved
manifest, signer access, Treasury funding, production budget/geometry, Phantom
acceptance and launch GO remain open.

Per final run:388 native transactions (276 success/112 expected failures), plus
60 separate local funding airdrops.762 independent stdlib Python checks verify
coverage, timelock inequalities, floor amounts, native logs, message hashes,
tracked-account rollback, separate rent refund and zero-liquidity readback.
Second complete run preserves3 outputs byte-for-byte. Max1194serialized bytes,
183041CU in this VM; not a mainnet cost/priority estimate. Only four frozen
current-FX candidates are covered here; historical v101/v102 wider coverage is
unchanged. Five retained v90 ELF are hash-pinned, not freshly fetched, and
source/build parity remains unproved.

Reproduce from this directory using retained fixtures:
```sh
node v29-activation.cjs /absolute/path/to/continuation_v90/fixtures
python3 verify-v29-activation.py
```

Sources: `v29-activation.cjs`, `verify-v29-activation.py`.
Versioned results: `v29-activation-review.json`,
`v29-activation-summary.csv`, `v29-activation-reproduction.json`.
The ignored raw transcript is retained separately as
PLOV_v103_ACTIVATION_TRANSCRIPT.json (716096bytes,
SHA2563f75cc62a1d308c80b466590bb1d9a1c3812510218c1b6746020c20c65c86d7e,
Library libfile_bbde135abc34819191fad0db358ae6de). Initial diagnostic expectations were corrected
to the actual absent-Operator error and the observed preactivation prohibition;
the final suite records these boundaries as expected failures.

Root application/dependencies/lock/routes/launch flag unchanged; no real keys,
wallet prompts, chain sends, operator contact, funding, merge or deployment.
Only synthetic local signatures/transactions. Wave1Inputs=null; MAINNET_GO=NO.

### v104 — атомарное создание UPPER и LOWER (21.10.2026)

**Локально найден и проверен альтернативный путь для блокера v103:** обе
точные инициализации помещены в одну VaultTransaction Squads. Это одна
транзакция исполнения с двумя NFT ephemeral signer PDA, а не Batch с раздельными
исполнениями. При отказе поздней инструкции UPPER тоже откатывается. Независимая
схема с заранее созданным funded UPPER по-прежнему имеет ограничения v103;
производственный переход на атомарную схему ещё не утверждён.

Обычное сообщение хранения занимает1244байта без внешней обёртки; его упаковка
в vaultTransactionCreate превышает размер сериализатора. Финальный execute без
ALT занимает1243байта при лимите1232. Это ограничение данной конкретной сборки,
а не доказательство невозможности всех вариантов без ALT.

В каждой VM таблица адресов создана, заполнена и заморожена реальными локальными
инструкциями Address Lookup Table Program. Проверены состав, отсутствие authority,
прогрев после lastExtendedSlot и отказ изменения замороженной таблицы. Сообщение
с ALT занимает534байта, его запись в Squads —862байта, финальное исполнение —
440байт. Хеши всех48 сообщений совпали с native VaultTransaction account readback.
Таблица содержит адреса и ничего не разрешает подписывать от имени vault.

| Режим для каждого из12 кандидатов v29 | Результат |
|---|---|
| Исполнение за300сек до общего T0 | Оба пула создаются одним execute; обе публичные попытки обмена вT0−1 отклонены PoolDisabled. |
| Исполнение ровно вT0 | Оба пула создаются одним execute. Это граничный тест, не рекомендация исполнять запуск в последнюю секунду. |
| Исполнение после фиксированного T0 | InvalidActivationPoint; оба пула отсутствуют, proposal остаётсяApproved. Автоматической отмены заявки нет. |
| Два голоса отмены до execute | Статус Cancelled; execute отклонён InvalidProposalStatus, оба пула отсутствуют. |

В24 успешных dual-execute создано48пулов и48NFT, все NFT принадлежат vault.
Точные sqrtQ64/liquidity/initial principal, общий activationPoint и статическая
комиссия2500004/1e9, protocol20%, OnlyB, dynamic0/compounding0 сверены с v100.
Ceil суммы проверены независимой целочисленной формулой. SOL дебет равен сумме
lamports всех новых аккаунтов; начальный WSOL surplus1lamport UPPER сохранён
отдельно от principal. Цена/бюджет/границы v29 не менялись.

На каждый успешный режим до окончательного исполнения вводятся ошибки:
неверная authority/type LOWER config, недостаток SOL для LOWER, отсутствие второго
ephemeral signer и недостаточный CU budget. В96 пробах native лог уже содержит
успешный CPI UPPER, но поздняя ошибка откатывает все19 отслеживаемых аккаунтов:
оба пула/NFT/позиции/vaults отсутствуют, balances и proposal не меняются.
Отдельный внешний плательщик теряет5000lamports комиссии. Replay исполненной
заявки тоже отвергается. Подмена config/funding/signers сделана только в VM.

Итог:48 VM-кейсов,924native TX/run (576успехов/348ожидаемых отказов) и240отдельных
local funding airdrops.3371 независимая Python-проверка PASS. Второй полный
прогон побайтно воспроизвёл3 JSON/CSV результата. Максимум862байта/320408CU в VM
не является оценкой комиссии или приоритета mainnet.

Практический вывод для последующего принятия схемы: LOWER config и все адреса
нужно знать до фиксации сообщения и ALT; обе инициализации должны оставаться
одним execute. После изменения T0/содержимого потребуется новая заявка с
применимым quorum/timelock. Просроченная заявка не превращается в новый запуск.
До подтверждённого полного readback обоих пулов нельзя считать подготовку
ликвидности принятой. Общий timestamp сам по себе не проверяет готовность;
атомарность обеспечивает отсутствие частично созданной пары в проверенном
исполнении. Отмена/вывод уже успешно созданных пулов — отдельная задача v103.

Ограничения: пять retained ELF v90 hash-pinned, не свежий mainnet snapshot;
Address Lookup Table Program — встроенная реализация LiteSVM1.4.1,
**не отдельно захваченный mainnet ELF**. Source/build parity не установлена.
Реальные config/authority/manifest/ALT, доступ signers, Treasury funding,
Phantom и production adoption/GO не приняты. Это init/rollback boundary suite,
не полный D0–D90 и не атомарный swap/Jupiter route. Следующий технический блок —
репетиция Treasury→LP funding handoff без выбора производственного бюджета.

Воспроизведение из этой папки:
```sh
node v29-atomic.cjs /absolute/path/to/continuation_v90/fixtures
python3 verify-v29-atomic.py
```

В Git: исходники `v29-atomic.cjs`, `verify-v29-atomic.py`,
`v29-atomic-review.json`, `v29-atomic-summary.csv`,
`v29-atomic-reproduction.json`. Raw transcript не включён в Git:
PLOV_v104_ATOMIC_TRANSCRIPT.json, 2626599bytes,
SHA2563cb8a7867f92b765c39650c27b34fa901f70381cbf1deaaa095dab5bbaf926bc,
Library libfile_5996379c50448191aff970105772f183.

В первых диагностических попытках поправлены number→BigInt для ALT slot и
Uint8Array→Array при native message reserialization; поздний T0 выделен как
ожидаемый InvalidActivationPoint вместо успешного создания. Финальные проверки
отражают наблюдаемое поведение, исходные предположения v29 не изменены.

Root app/dependencies/lock/routes/flags прежние. Только синтетические локальные
подписи; real wallet/network sends0. Production T0=null, бюджет/геометрия/60PLOV
остаются перед запуском. MAINNET_GO=NO.

### v105 — Treasury → LP: финансирование перед атомарным созданием (21.10.2026)

**Локальная передача SOL+PLOV и последующее создание обоих пулов проверены.**
Параметры ранее наблюдённой governance воспроизведены на новых синтетических
аккаунтах: Treasury3/5+172800сек и LP2/3+43200сек. Это не новое чтение состояния
реальных кошельков и не подтверждение доступа их подписантов. Три участника LP
входят в пять Treasury, как в сохранённых наблюдениях; независимость людей
из этого не следует.

Изначально LP vault вообще отсутствует и получает0 SOL/PLOV напрямую из faucet.
700M тестовых PLOV выпускаются в ATA синтетического Treasury. LP ATA заранее
создаёт внешний участник; он же оплачивает governance/ALT и комиссии. Внешние
участники и Treasury получают отдельные тестовые airdrops. Прямого airdrop LP
нет. Реальная mint authority, эмиссия и токеномика не меняются.

Одна Treasury VaultTransaction последовательно содержит System transfer SOL и
SPL transferChecked PLOV. Нативное исполнение требует три голоса и48ч. Если
поздний перевод PLOV не проходит, уже прошедший SOL transfer откатывается:
оба LP-баланса остаются нулевыми. Недостаток SOL в Treasury тоже не приводит
к частичному переводу. Replay исполненной заявки отклоняется.

| Порядок одобрений | Время от Treasury threshold approval до создания обоих пулов в fixture |
|---|---|
| LP получает два голоса заранее, до финансирования | 172801сек, то есть48ч+1сек. В12ч+1сек LP уже выдержал свой timelock, но без Treasury funding execute отклоняется. После финансирования применяется та же ранее одобренная LP-заявка. |
| Второй голос LP появляется только после Treasury funding | 216002сек, то есть60ч+2сек. Новый12ч timelock начинается с достижения LP quorum. |

Это два проверенных расписания, а не обещание календарного срока или правило,
что все запуски обязаны ждать60ч. Перекрытие задержек возможно только при заранее
зафиксированных точных сообщениях, известных config/адресах/ALT/T0 и доступных
подписантах. Финансирование и создание — **две отдельные транзакции**: после
успешного Treasury funding ошибка LP не возвращает средства автоматически в
Treasury; они сохраняются у LP. Атомарность относится отдельно к паре переводов
и отдельно к паре инициализаций. Семантическую правильность получателя/сумм
задаёт рассмотренное сообщение; Squads не знает деловую цель перевода.

В каждом из12 вариантов v29 проверены оба расписания —24 VM и48 созданных
пулов/NFT. Отдельно введён недостаток PLOV/SOL у LP после финансирования. Он не
оставляет частичную пару;24 поздних SOL-отказа откатывают уже полностью успешный
UPPER CPI. Все24 отслеживаемых аккаунта, включая Treasury governance и balances,
сверяются по hash/lamports; внешний плательщик теряет5000lamports комиссии.
CPI успех распознаётся по завершению depth2 вызова, исключая self-CPI event.
При дополнительной read-only сверке raw v104 все96 ранее заявленных успешных
UPPER перед поздними отказами также подтверждены на depth2; исторические
исходники/результаты v104 не изменены.

Тестовый размер SOL финансирования состоит из seed v29,47251441lamport
инициализации (rent новых аккаунтов и отдельный1lamport UPPER surplus) и890880
lamports минимального rent для пустого LP system account. Сумма выведена из
закреплённого v104 native readback и проверяется против нового фактического
дебета/созданных аккаунтов. После создания у LP остаётся ровно890880lamports,
а свободных тестовых PLOV —0. Это rent floor, **не операционный бюджет**.
Внешние fee/rent payers заранее обильно профинансированы в VM: доступность их
реальных средств и производственная политика плательщиков остаются открытыми.

792native TX/run:456успехов/336ожидаемых отказов,168отдельных localairdrops.
2794 независимые stdlib Python-проверки PASS: две ledger conservation identities,
timelock timestamps, quorums, depth2 CPI, rollback, native message hash readback,
floor/ceil geometry, NFT custody и начальный principal. Второй полный прогон
побайтно воспроизвёл3 JSON/CSV выхода. Макс862байта/329346CU в VM; это не оценка
mainnet fees/priority.48 сообщений (24 funding+24 LP) совпали с native accounts.
В обоих расписаниях24×2 попытки публичного swap доT0 отклонены.

Пять retained ELF v90 hash-pinned, не свежие mainnet данные; ALT Program остаётся
LiteSVM builtin, не отдельным mainnet-read ELF. Source/build parity не доказана.
Реальные config/authority/manifest/ALT, подписанты, payer policy, финансирование,
Phantom/network acceptance и GO не приняты. Производственные бюджет/геометрия/T0
и60PLOV остаются отложенными до запуска. Это init/funding suite, не D0–D90
replay и не атомарный swap/Jupiter route.

Следующий блок — единый конкретный пакет приёмки real config/authority/manifest,
frozen ALT и signer/payer policy. Локальные handoff и atomic init повторять без
изменения входов не требуется; выдача config/подписи/реальное финансирование
остаются самостоятельными незакрытыми условиями.

```sh
node v29-funding.cjs /absolute/path/to/continuation_v90/fixtures
python3 verify-v29-funding.py
```

В Git: `v29-funding.cjs`, `verify-v29-funding.py`,
`v29-funding-review.json`, `v29-funding-summary.csv`,
`v29-funding-reproduction.json`. Raw отдельно:
PLOV_v105_FUNDING_TRANSCRIPT.json, 1915880bytes,
SHA25621f8a32e98c17ea7e445a0c00f2e90f2fe7033233f64a9f92b3d38da1e956205,
Library libfile_d67963bcd7c88191b8901d9f6474141c.

Root app/dependencies/lock/routes/flags прежние. Только синтетические локальные
подписи; real wallet/network sends0, Wave1Inputs=null, MAINNET_GO=NO.
