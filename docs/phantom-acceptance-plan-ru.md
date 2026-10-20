# LP v90 — условия целевой проверки Phantom

20.10.2026, Asia/Dushanbe. **ПРОТОКОЛ ПОДГОТОВЛЕН, ЗАПУСК ЗАБЛОКИРОВАН.**

Это план и незаполненная карточка доказательств. Исполняемого пакета для
кошелька, готовой транзакции, разрешения на подпись/отправку или launch GO нет.
Текущий runtime baseline: b7f06a0ec556ef874968c9427cd7fb0980f90994 (v84).
Инвентарь хешей обновлён в v90; это не новое подтверждение сборки или кошелька.
`MAINNET_GO=NO`, `TRADE_LAUNCH_ENABLED=false`; приложение не меняется.

## Что установлено сверкой

1. `scripts/fixtures/trading-accounts.json` прямо помечен SYNTHETIC и содержит
   fake program bytes. Его pool/config/program-data значения не являются
   разрешённым production manifest. PWA `public/manifest.json` также не является
   manifest пулов. В текущем журнале LP-03/LP-09 остаются открытыми.
2. `createSwapRecoveryHost` разрешает только ISOLATED_REHEARSAL и точный
   HTTP127.0.0.1 origin. Это владелец ресурсов восстановления, а не bootstrap
   реальной торговли. Production origin, trusted epoch/RPC-list/floor и
   первоначальное создание баз должны иметь отдельный проект и проверку.
3. В v84 `createInjectedPhantomReviewSession` и `bindInjectedPhantomSwapAttempt`
   используют общий private provider lifetime. Полная связка прошла локальные
   проверки с синтетическим provider, реальными локальными stores и loopback RPC.
   Это исторический результат144 browser/109 Node, не повторённый при v90 review.
   Production mount/bootstrap и установленный Phantom не проверены. `approve()`
   full-swap binding подписывает/claim/send и не подходит для sign-only диагностики.
4. Лимиты истории заданы на handle; старый writer без policy способен их обойти.
   Несохранённый ответ и предупреждение о нём после перезапуска неизвестны.
   Экспорт SHA256 не создаёт подлинности и не восстанавливает отсутствующее
   доказательство. Это отдельные открытые production-решения LP-15/LP-17.
5. v66 подтвердил только односторонний переход аккаунта с connect. v68 дал
   USER_REJECTED/4001, без полученной подписи. Отсутствие SOL — сообщение
   владельца, а не причина, доказанная кодом4001. v67 прекращён: не повторять,
   не финансировать, не обходить предупреждения.

Поиск Drive по manifest/config нашёл исторические пакеты, включая v46:
публичные материалы о config уже изучались; разрешённый production manifest
не следует из их наличия. В v46 прямо отмечены неподтверждённый доступ к
нужному config и отсутствие новых сетевых подтверждений. Это исторический
источник, а не свежая проверка доступности/отсутствия пулов. Поиск ограничен
доступными результатами; не утверждается отсутствие документа во всём мире.

## Матрица входов

| Вход | Что нужно предъявить | Состояние v90 |
|---|---|---|
| Manifest/markets | Подтверждённые UPPER/LOWER/config/authority, параметры активации/fees/границ и actual program-data hash/slot; отдельное одобрение источника и live проверки | OPEN, LP-03/09/10 |
| Origin/build/harness | Точный доверенный origin, commit/build hash, проверенный private sign-only harness без send; происхождение provider | OPEN, LP-13/14 |
| RPC | Явный endpoint/digest, genesis, commitment, актуальные slots/blockhash/lastValidBlockHeight; источник одобрения, без API-secret в отчёте | OPEN |
| Проверочный аккаунт | Выбранный владельцем обычный on-curve аккаунт, публичный адрес и право использования; свежие балансы и смета конкретного review | НЕ ВЫБРАН |
| Sign-only разрешение | Отдельное согласие на конкретное содержимое и один signTransaction, с журналом запрещённых send вызовов | НЕ ПОЛУЧЕНО |
| Full-send эксплуатация | Единая storage policy/initialization/recovery/quota/conflict/unsaved-response процедура, provider→controller integration | OPEN, LP-15/17 |
| Release | Build parity, применимый аудит нового wallet кода, network rehearsal и отдельный launch GO | OPEN, LP-10/11/18 |

Размер LP и возврат60PLOV отложены владельцем до запуска; этот протокол не
возвращает эти решения на согласование сейчас. Sign-only проверка независима
от готовности полного хранения/отправки, но требует своих manifest/origin/RPC/
review/harness условий. Она не закрывает send acceptance.

## Последовательность после снятия соответствующих блокеров

### A. Подготовка без обращения к кошельку

Зафиксировать commit/lock/build и хэши модулей, отдельное разрешение TEST_SIGN_ONLY,
origin и допустимый provider path. Проверить сеть/аккаунты read-only через
`loadVerifiedRoute` и `prepareVerifiedSwap`. Получить актуальный blockhash,
lastValidBlockHeight, исходный message digest/review id и успешную симуляцию.
Проверить декодированные инструкции, signer set и сохранение временной WSOL
подписи до передачи в provider. Placeholder blockhash и fixture запрещены.

Веб-сайт не публиковать и TRADE_LAUNCH_ENABLED не переключать. Будущий private
harness должен отдельно и прозрачно связывать разрешение TEST_SIGN_ONLY с
доверенным app-state; простое значение launchEnabled=true не является согласием.
Не добавлять автоматический переход к send/claim/enqueue в этот harness.

### B. Выбор аккаунта и отдельное подключение

Нужен аккаунт, который владелец специально разрешит для розничного теста.
Не использовать Treasury/Squads vault или кошелёк критических project authorities
как значение по умолчанию. Фактический публичный адрес пока не установлен.
Seed, приватный ключ и keypair-файл не передаются. Заранее записать версии
браузера/расширения и явный выбор injected extension, без embedded fallback.

Подключение — отдельное действие пользователя. Сравнить provider publicKey с
разрешённым адресом; проверить signTransaction/on/removeListener. isPhantom —
признак совместимости, а не доказательство происхождения. Не делать eager
connect, automatic reconnect или автоматическое продолжение после смены аккаунта.

Смета берётся из актуального review: amountIn для BUY + messageFee + temporaryRent
+ newAtaRent + extraReserve. Для SELL отдельно нужен PLOV amountIn. Проверить
свежие balances; не объявлять ни фиксированную сумму SOL, ни гарантированную
возможность подписи при нулевом балансе. Сейчас пополнение не требуется:
исполняемый тест ещё не разрешён и не подготовлен.

### C. Единственная sign-only попытка

До нажатия показать сеть/кошелёк/пулы, направление, вход/minOut, расходы, срок и
состав инструкций. Пользователь подтверждает именно этот review. Использовать
только createInjectedPhantomReviewSession.sign; отдельный review нельзя заранее
связать ещё и с dispatch attempt — общий one-use binding это запрещает.

После возврата проверить точное совпадение message bytes, blockhash и всех
signatures, включая временный WSOL signer, свежий контекст и signed simulation.
Нельзя менять message/blockhash/fee payer или добавлять подпись к изменённому
message. Отмена/истечение/изменение account/network/app policy прекращают попытку;
новый review и новая явная подпись не запускаются автоматически.

Сохранить лишь публичную подпись, review id/message hash, версии, boolean
результаты проверок и количество вызовов. Полные signed bytes/keypair не
выгружать в Drive/Library/logs/отчёт. Подписанные байты потенциально исполнимы;
отсутствие send в нашем клиенте не означает отсутствия других держателей байтов.
Постпроверка не отменяет уже полученную подпись.

### D. События и закрытие

В отдельно запланированных review проверить accountChanged с ключом/null,
disconnect/reconnect и app RPC/network/launch-policy изменения, в том числе
возврат к прежнему значению. Событие должно навсегда инвалидировать текущую
попытку. Подтверждать каждый реальный сценарий по журналу, не переносить
синтетический PASS на установленное расширение. Проверить listener cleanup.

Записать raw error code и очищенное описание, не угадывая причину. 4001 не
доказывает нехватку SOL и не доказывает несовместимость signTransaction.
После отказа не переключаться на signAndSendTransaction/request fallback.

### E. Отдельное принятие отправки

Этот этап не разрешается успешным sign-only. Нужны отдельное сетевое разрешение,
production storage/identity policy, полный provider/controller lifetime,
approved markets/RPC, durable claim, один enqueue и проверка исходной подписи.
UNKNOWN, quota, timeout и conflict не разрешают повторную операцию. Потребуются
отдельные наблюдения receipt/outcome/confirmation/recovery и эксплуатационный
порядок разбора. Только затем рассматривается release GO.

## Критерии и ограничения

Sign-only PASS возможен лишь с реальным подписанным результатом, сохранённым
WSOL signer, точными message bytes, успешными fresh/signature checks и отсутствием
send вызовов в проверенном harness. Заявление о нулевых send относится к
наблюдаемому клиенту, а не к глобальной сети. Ни один критерий пока не выполнен
на новом установленном кошельке. Все поля карточки JSON остаются null/NOT_RUN.

## Официальные источники (проверены при v82; в v90 повторно не открывались)

- https://docs.phantom.com/solana/sending-a-transaction — traditional sign-only
  доступен, но находится вне Wallet Standard реализации и может быть удалён;
  рекомендация Phantom sign-and-send не заменяет архитектурное решение проекта.
- https://docs.phantom.com/sdks/browser-sdk/sign-and-send-transaction — embedded
  не поддерживает signTransaction и не принимает предварительно подписанный
  transaction; это другой поток, не проверенный текущим кандидатом.
- https://docs.phantom.com/solana/detecting-the-provider — provider injection
  имеет требования к origin; isPhantom не превращается в проверку подлинности.
- https://docs.phantom.com/solana/establishing-a-connection — подключение и
  accountChanged/connect/disconnect события.
- https://docs.phantom.com/solana/errors — значение4001 и прочие коды.

Исторический config источник:
https://drive.google.com/file/d/1PNsn_Kjy-TryQf5l1pTwg5VNktIsrdYW/view

Исходный журнал (статусы не повышены):
https://docs.google.com/spreadsheets/d/194mFEzCiCcqPX3sT9_t_EUcV8DpG2pas6ECoRNAJZzc/edit


## Дополнение v90: что закрыла локальная протокольная репетиция

Пять mainnet-read ELF выполнили synthetic full liquidity lifecycle в LiteSVM:
93 program tx,76 success/17 expected failure;7 offline checks отдельно. Это
проверка протокольного пути, ownership, quote/delta и rollback, без реального
config доступа/кошелька/production acceptance. Карточка выше остаётся NOT_RUN/null.
Реестр verified-build status не подтверждает Meteora; независимая сборка не сделана.
Подробнее: research/lower-squads-offline/README.md и lifecycle-result.json.
