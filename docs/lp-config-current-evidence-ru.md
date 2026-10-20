# LP-03/09: текущие публичные данные конфигурации LOWER

20.10.2026, Asia/Dushanbe. Исследование только для чтения; MAINNET_GO=NO.

## Результат

Вместо переноса исторического v41 получен новый finalized mainnet-срез от
`https://api.mainnet-beta.solana.com`. Genesis проверен до и после чтения.
Данные относятся к разным слотам и не образуют атомарный снимок.

| Чтение | Finalized slot | Результат |
|---|---:|---|
| Config328 / discriminator Config | 459073875 | 764 аккаунта: 672 public static, 20 private static, 72 dynamic |
| Operator72 / discriminator Operator | 459073918 | 2 аккаунта, оба с CreateConfigKey |
| Pool1112, PLOV в token A | 459073959 | 0 аккаунтов |
| Pool1112, PLOV в token B | 459073995 | 0 аккаунтов |
| Программа, ProgramData, mint, cpool, два multisig | 459074032 | identity read успешен; cpool отсутствует |

Все 764 Config прошли SDK1.5.1 decode, PDA/index check и независимые fixed-offset
проверки. Повторная Python-декодировка существенных полей и SHA256 также прошла
для всех764. Оба Operator прошли decode/PDA/manual bitmask check. Ноль результатов
pool scan означает только отсутствие в этих известных layout/discriminator/слотах,
а не обещание отсутствия любых рынков во всех DEX или в будущем.

## Почему публичный config не решает LOWER

Все672 public static используют одну из двух пар границ:

- `0 : 340282366920938463463374607431768211455` (compounding full range);
- `4295048016 : 79226673521066979257578248091` (полный допустимый диапазон).

Узкой нижней полосы с нашей границей P0 среди них нет. Точного совпадения всего
fee-профиля текущего кандидата также нет: base numerator2500004/1e9, OnlyB,
protocol20%, dynamic0, compounding0, activation timestamp, permission0,
vault_config_key default. Это проверка текущего профиля, не выбор бюджета.
Public dynamic —0; исходник запрещает default pool_creator_authority для dynamic.

Для UPPER возможен customizable-путь без отдельного config. Однако customizable
PDA получается из `cpool` и отсортированной пары mint: повторная перестановка
PLOV/SOL даёт тот же адрес, а не второй независимый LOWER. Публичный full-range
static или другая quote-пара меняли бы модель и здесь не приняты.

## Проверенные полномочия

Проверены восемь явно перечисленных адресов: два vault index0 текущих Treasury
и LP Operations, их пять уникальных участников, а также исторический кандидат
`CeAF9ZHmaNrvjh31jKcdcPjtyoNYhhU9sJb2j8pjSZwD` без нового утверждения о владении.
Ни config, связанный с этими authority, ни Operator для этих signer в срезе не
найден. Список не покрывает неизвестные кошельки владельца.

Текущие два Operator разрешают CreateConfigKey, но их whitelisted signer не
входят в проверенный список. Публичный адрес не устанавливает личность человека,
канал связи, стоимость услуги или согласие помочь; переводить им средства
на основании этого исследования нельзя.

Актуальный публичный исходник Meteora остаётся на commit
`5398b5c7c534de014091132da37c6478cce671a8` (Release0.2.5). В `lib.rs`
create_config/create_dynamic_config защищены `is_valid_operator_role` с
CreateConfigKey; проверяются связанный signer и бит разрешения. Dynamic pool
требует подпись pool_creator_authority, совпадающего с config. Открытый SDK
строит инструкцию, но не выдаёт это разрешение обычному кошельку.

Следующее внешнее условие: подходящий config, выпущенный уполномоченным Operator
для согласованного authority проекта. Параметры: LOWER-only dynamic, permission0;
финальный authority требует отдельного согласования. Index/address не назначены
и не зарезервированы. Ранее подготовленный запрос остаётся черновиком и не
отправлялся; цена, сроки, operator agreement и финансирование неизвестны.
Изменение custody, геометрии или использование чужого config не одобрено.

## Программа и manifest

Program `cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG` и ProgramData
`AUh8bm2XsMfex3KjYGcM3G4uBqUNSDw6HEhWaWMYnyPH` имеют ожидаемый loader/layout.
Deployment slot457080014; ELF2174352bytes:
`967ff9fb161eec2e62f66d2c899100739fb747c445f697b8625c86b31b9a2022`.
SHA256 полного ProgramData:
`69d693fb7554fbfb21c50d7bb6327b284563347391a4f94056e029363863f810`.
ELF совпал с историческим снимком v15; воспроизводимая source/build parity этим
не доказана. Mint decimals9/supply13013003000 совпадают с текущим каноном.

Customizable PDA `64CgrpfD1mirgn7jea22wT8sJgnHwqTPTzZksYUC6ZsR` отсутствует
на459074032. Из фактов чтения нельзя получить готовый утверждённый manifest двух
пулов: реальные UPPER/LOWER параметры и согласование остаются открытыми.
Синтетический manifest тестов запрещён как production ввод.

## Проверяемость и границы

Один RPC-сервер, известные Config328/Operator72/Pool1112 layout и discriminators;
нет криптографического доказательства полноты сервера. minContextSlot не позволял
регрессировать между последовательными finalized чтениями. Publicnode вернул403;
второго независимого RPC-подтверждения нет. Не делались simulations, подписи,
отправки, funding, authority changes, внешние сообщения, merge или deploy.
Runtime/dependencies/lock/routes/launch flag не меняются в этом блоке. Новый build
и runtime suite не запускались; PASS v84 остаётся историческим.

Бюджет и возврат60PLOV по-прежнему перед запуском. v67 закрыт, не повторять/не
финансировать. LP-03, LP-09 и LP-15 остаются открытыми.

## Источники и байты

- [Meteora instructions](https://docs.meteora.ag/developer-guides/damm-v2/program/instructions)
- [Meteora accounts/PDA](https://docs.meteora.ag/developer-guides/damm-v2/program/accounts)
- [Pinned program source](https://github.com/MeteoraAg/damm-v2/tree/5398b5c7c534de014091132da37c6478cce671a8/programs/cp-amm/src)
- [Срез, декодировка, независимая проверка](https://drive.google.com/drive/folders/1kwiqh6WraRynTCbGhHH7v5Ya9N-fbDs0)

SHA256 `live-snapshot.json`:
`4987bfef551f16c6dc087e78da3d9cbe911932e2a05cfe7a4fd69a5380c45ed7`.
SHA256 `configs-decoded.json`:
`f41f661e97dea2ee424731f8a59c080bd8633eb010d521c85969eeba771b94e8`.
Raw snapshot содержит все request bodies, endpoint/commitment/floors, слоты и
публичные байты ответов. Код проекта хранится отдельно в Git.
