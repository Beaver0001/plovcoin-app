# LOWER через Squads: локальные проверки v88–v90

Исторический этап v88,20.10.2026: **OFFLINE_SDK_CONTRACT_PASS**.
Текущий этап v90 и ограничения описаны в конце документа.
Это сборка и анализ инструкций, без исполнения программ. **MAINNET_GO=NO**.

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
