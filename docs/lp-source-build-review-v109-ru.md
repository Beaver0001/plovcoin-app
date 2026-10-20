# Meteora: публичная сверка программы и сборки v109

21 октября 2026, Душанбе. **LIVE_BINARY_MATCH_SOURCE_BUILD_PARITY_OPEN. MAINNET_GO=NO.**

## Подтверждено

Новый finalized mainnet read: program/ProgramData slot459376266,
повтор pointer/header slot459376269, genesis проверен до и после.
DAMM v2 cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG указывает на
ProgramData AUh8bm2XsMfex3KjYGcM3G4uBqUNSDw6HEhWaWMYnyPH.
Deployment slot457080014; ELF2174352bytes,
SHA256 `967ff9fb161eec2e62f66d2c899100739fb747c445f697b8625c86b31b9a2022`.
Хеши полного ProgramData и ELF совпали с сохранёнными v90.
В конце повторены pointer/header, не весь бинарный account.
Это один RPC; снимок не гарантирует неизменность программы к будущему запуску.

Публичный main репозитория MeteoraAg/damm-v2 по GitHub API остаётся
`5398b5c7c534de014091132da37c6478cce671a8`, Release0.2.5.
Для15 сохранённых файлов проверены Git blob SHA-1 и byte size по tree этого commit,
вычислены SHA256. Включены Cargo.lock, оба Cargo.toml, Anchor.toml,
rust-toolchain.toml, CI, package.json, entrypoint/admin и выбранные инструкции.
Это проверка происхождения исходников, не результат их компиляции.

## Существенное отличие тестовой сборки

В .github/workflows/ci.yml build вызывает `bun run build-local`.
package.json раскрывает его как `anchor build --ignore-keys -- --features local`.
В instructions/admin/auth.rs ветка `local` возвращает true для admin;
ветка без local сверяет signer со списком ADMINS.
Поэтому local build/успех тестового CI не являются свидетельством равенства
производственному ELF. Для main commit API Actions вернул0 workflow runs;
это не доказательство отсутствия проверок PR, иных refs или внешних систем.

Одна новая native LiteSVM проверка на сохранённом ELF с совпавшим свежим хешем:
произвольный локальный синтетический signer пытается создать Operator permission1.
Результат `InvalidAdmin6005`; System CPI успел завершиться, но Operator account
после отказа отсутствует. Payer потерял только5000lamport локальной network fee.
Одна локальная program transaction и один отдельный synthetic airdrop.
Это проверка границы admin и rollback, не доказательство всего feature set
или точного source commit. Сетевая транзакция не отправлялась.

## Что не подтверждено

Публичный GET https://verify.osec.io/status/cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG
20.10.2026 21:17:04UTC вернул HTTP200, `is_verified=false`, пустые hashes/repo/commit,
last_verified_at=null. Это отсутствие положительной проверки в ответе сервиса,
а не обнаруженное несовпадение хешей и не заключение об уязвимости.
Remote verification job не заказывался.

Независимая воспроизводимая сборка здесь не выполнена: в текущем runtime отсутствуют
Docker/Podman, Cargo/Rust, Anchor/Solana и solana-verify. Сами исходники заявляют
Rust1.94.0, Solana3.1.10, Anchor1.0.2. Точный production build recipe/flags и digest
контейнера не подтверждены. Нельзя заменить эти недостающие данные тестовым local build.

Полное соответствие source↔ELF и область применимого аудита остаются открытыми.
Аудит чужого контракта не подтверждает новый клиентский код PlovCoin.
Наши прежние локальные тесты по этому ELF сохраняют прежнюю область доказательств.

## Продолжение

Ответ Meteora не является условием продолжения. Проверку parity можно закрывать
независимой воспроизводимой сборкой в подходящем runner и сравнением с актуальными
байтами программы; до успешного сравнения статус остаётся открытым.
Другая независимая работа — конкретные payer/signers, ALT/message и процедура
проверки перед исполнением. Совместимый actual config текущего TWO остаётся
отдельным техническим условием; v108 public scan не переписан.

Никаких production подписей/send/funding, внешних сообщений, изменений mint authority,
бюджета, geometry/T0, сайта, dependencies или launch flags. Бюджет и возврат60PLOV
остаются перед запуском. MAINNET_GO=NO.

## Сохранённые доказательства

- research/lower-squads-offline/live-program-pin-v109.json
- research/lower-squads-offline/source-evidence-v109.json
- research/lower-squads-offline/otter-status-v109.json
- research/lower-squads-offline/source-build-review-v109.json
- research/lower-squads-offline/check-admin-boundary-v109.cjs
- research/lower-squads-offline/admin-boundary-result-v109.json

Первичные источники:
https://github.com/MeteoraAg/damm-v2/tree/5398b5c7c534de014091132da37c6478cce671a8
https://solana.com/docs/programs/verified-builds
https://github.com/otter-sec/solana-verified-programs-api
