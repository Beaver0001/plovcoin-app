# Независимая сборка Meteora: пакет запуска v110

21 октября 2026, Душанбе. **Пакет подготовлен; Docker-сборки NOT_RUN. MAINNET_GO=NO.**

Подготовлен `research/lower-squads-offline/build-compare-v110.py`.
Это Linux-инструмент сборки и сравнения локальных файлов. Он не подключает кошелёк,
не читает ключи, не вызывает RPC, не отправляет транзакции и не публикует verification PDA.
Используется только подкоманда `solana-verify build`; `verify-from-repo` и remote
submit-job не вызываются. Полное соответствие source↔ELF пока не подтверждено.

## Что закреплено

- Meteora source commit: 5398b5c7c534de014091132da37c6478cce671a8.
- Библиотека cp_amm, кандидат arch v0, дополнительные Cargo features не добавляются.
  Тестовый `local` не включается; Cargo.lock и15 source/build файлов проверяются
  в каждой чистой копии по сохранённым Git blob/SHA256.
- CLI solana-verify0.5.2, source commit f8cfe2f834f4334aad9c60a29284de0ba396f829.
  [Официальный релиз](https://github.com/solana-foundation/solana-verifiable-build/releases/tag/v0.5.2).
- Linux CLI SHA256:
  b9d5ccce9634dc14269cab3e7a58649bc141b3306e7735a94478c936341f211f.
  Скачанный бинарник проверен по checksum из релиза и фактически запущен.
- Upstream image map для Solana3.1.10 задаёт образ
  solanafoundation/solana-verifiable-build@sha256:f71be5ca7620b7e40933b7f1294fa44e01d08c1fc5ba1f375a2478f5a01580d3.
  Digest и Dockerfile получены из закреплённого source CLI. Сам образ здесь не скачивался.

Это независимо выбранный воспроизводимый кандидат, а не заявление о точной исторической
команде разработчика Meteora. Совпадение его результата с байтами программы проверяется
фактически; при несовпадении нельзя объявлять контракт уязвимым или подбирать результат
за счёт изменения исходников/lockfile.

## Как работает запуск

`--plan` показывает закреплённый план без сборки.
`--check-runner --cli /absolute/path/to/solana-verify` сверяет SHA/version CLI,
наличие Git и работающего Docker server linux/amd64.
`--build --cli /absolute/path/to/solana-verify --out /absolute/new/output` создаёт
только новый каталог, получает две чистые копии одного source commit, проверяет
источники и выполняет две сборки с тем же pinned image. Изменение исходников или
lockfile прекращает проверку. В output сохраняются clone/build logs и build-review.json;
успешный прогон записывает Docker version, image digests и версии инструментов контейнера.
Это две чистые директории на одном runner, не два независимых компьютера.

`--compare FIRST_ELF SECOND_ELF` позволяет отдельно проверить готовые артефакты.
Одного совпадения двух файлов недостаточно: оба должны совпасть с normalized ELF hash
снимка v109. Нужны также полные одинаковые байты двух артефактов; разные padding bytes
не считаются подтверждением побайтовой воспроизводимости.
Нормализация удаляет только конечные zero bytes — алгоритм сверён с кодом CLI и его
фактическим `get-executable-hash` на сохранённом ELF.

Даже положительное локальное сравнение явно оставляет source provenance неподтверждённой
самой операцией сравнения. Историю сборки подтверждают отдельные source checks/logs
реального прогона. Снимок v109 не объявляется свежей сетью: перед приёмкой требуется
новое чтение программы и сопоставление с тем же результатом. ProductionAccepted=false
и MAINNET_GO=NO не меняются утилитой.

## Проверено здесь

11 локальных проверок PASS: одинаковые копии ELF без повышения статуса до source proof;
отличающийся zero padding; изменение байта; два одинаковых неправильных ELF;
алиасы одного файла; не-ELF; отсутствующий файл; неправильный CLI checksum;
реальный CLI capability check; остановка build до создания output без Docker;
согласие официального CLI hash с независимым Python hash и v109.
Сами Docker build/subprocess ветки успешной компиляции не исполнялись и не имитировались.

Официальный CLI фактически вернул для сохранённого Meteora ELF:
0712ca6d350757b9a71a0ea40da8fe9d5b48fca044f2deae0b65a33320e6a59b.

Текущий capability check: CLI работает, Git доступен, Docker отсутствует.
Пробы mount/user namespaces в текущем sandbox вернули Operation not permitted;
для запуска контейнеров нужен runner за пределами этих ограничений.
Для фактического прогона теперь нужен **Linux amd64 runner с доступным Docker daemon**.
Подключение другого Work полезно, если оно даёт именно такой runner; ещё один чат
сам по себе не добавляет Docker. Phantom, SOL, seed phrase и приватные ключи не нужны.
Скачивание исходников/контейнера и Cargo dependencies требует обычного сетевого доступа.

## Сохранённые файлы

- build-plan-v110.json — закреплённый план.
- build-tool-provenance-v110.json — upstream source/digest/hash algorithm.
- build-cli-download-v110.json — URL/size/hash скачанных CLI/checksum.
- build-runner-capability-v110.json — фактическая доступность инструментов.
- build-tool-checks-v110.json —11 локальных проверок, Docker builds0.
- check-build-tool-v110.py — повторяемые проверки на двух временных копиях ELF.
- build-sandbox-capability-v110.json — результаты проб mount/user namespaces.

Все перечисленные файлы находятся в research/lower-squads-offline.
v109 review и снимок сети сохранены без изменений. Ответ Meteora не является
условием дальнейшей работы; actual config, бюджет, geometry/T0/60PLOV и запуск
не принимаются этим пакетом.
