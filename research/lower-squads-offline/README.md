# LOWER через Squads: проверка контракта SDK v88

20.10.2026, Asia/Dushanbe. Результат: **OFFLINE_SDK_CONTRACT_PASS**.
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
