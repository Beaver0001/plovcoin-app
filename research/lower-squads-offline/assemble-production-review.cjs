'use strict';
// Review-packet assembly only. No RPC, transaction builders, keys or signatures.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {PublicKey,AddressLookupTableProgram}=require('@solana/web3.js'),spl=require('@solana/spl-token'),m=require('@meteora-ag/cp-amm-sdk'),sq=require('@sqds/multisig');
const reviewGovernance=require('./review-lp-governance.cjs');
const R=path.resolve(__dirname,'../..'),hash=b=>crypto.createHash('sha256').update(b).digest('hex'),read=n=>JSON.parse(fs.readFileSync(path.join(R,n)));
assert.equal(process.cwd(),__dirname,'Run from research/lower-squads-offline.');
assert.equal(process.argv[2],'--write','Explicit --write required; review packet only.');
const inquiry=read('docs/lower-config-inquiry.json'),gates=read('docs/trading-release-gates.json'),intake=read('docs/lp-v29-request-intake.json');
assert.equal(gates.MAINNET_GO,'NO');for(const k of ['readyForWalletTest','readyForNetworkSend','publicTradingEnabled'])assert.equal(gates[k],false);
assert.equal(gates.acceptanceRecord.status,'NOT_RUN');assert.equal(intake.actualLaunchBudgetOrGeometryApproved,false);
assert.equal(inquiry.issuanceCandidate.authorityApproved,false);assert.equal(inquiry.issuanceCandidate.finalPoolCreatorAuthority,null);
assert.equal(inquiry.acceptanceRecord.status,'NOT_RUN');assert.equal(inquiry.officialContact.sent,false);
const paths=['research/lower-squads-offline/governance-snapshot-v94.json','research/lower-squads-offline/governance-review-v94.json','research/lower-squads-offline/treasury-snapshot-v95.json','research/lower-squads-offline/treasury-review-v95.json','research/lower-squads-offline/program-pins-v90.json','docs/lower-config-inquiry.json','research/lower-squads-offline/v29-geometry-result.json','research/lower-squads-offline/v29-native-review.json','research/lower-squads-offline/v29-squads-review.json','research/lower-squads-offline/v29-activation-review.json','research/lower-squads-offline/v29-atomic-review.json','research/lower-squads-offline/v29-funding-review.json','lib/trading/live-accounts.mjs','research/lower-squads-offline/config-account-check.cjs'];
const evidence=paths.map(file=>({path:file,sha256:hash(fs.readFileSync(path.join(R,file)))})),lp=read(paths[0]),treasury=read(paths[2]);
evidence.push({path:'research/lower-squads-offline/package-lock.json',sha256:hash(fs.readFileSync(path.join(R,'research/lower-squads-offline/package-lock.json')))});
for(const [snapshot,reviewPath]of [[lp,paths[1]],[treasury,paths[3]]])assert.deepEqual(reviewGovernance(snapshot),read(reviewPath));
assert.equal(lp.threshold,2);assert.equal(lp.timeLockSeconds,43200);assert.equal(treasury.threshold,3);assert.equal(treasury.timeLockSeconds,172800);
const shared=lp.members.filter(a=>treasury.members.some(b=>b.key===a.key)).map(a=>a.key);assert.equal(shared.length,3);
assert.equal(inquiry.issuanceCandidate.authorityCandidate,lp.vault);assert.notEqual(lp.multisig,lp.vault);
const appPins=Object.entries(gates.sourceSha256).map(([file,sha256])=>{assert.equal(hash(fs.readFileSync(path.join(R,file))),sha256);return{path:file,sha256};});assert.equal(appPins.length,13);
const pk=s=>new PublicKey(s),mint=pk(inquiry.mintA.address),quote=pk(inquiry.mintB.address),upper=m.deriveCustomizablePoolAddress(mint,quote),poolAuthority=m.derivePoolAuthority();
const ata=(owner,mint)=>spl.getAssociatedTokenAddressSync(mint,pk(owner),true,spl.TOKEN_PROGRAM_ID).toBase58();
const addresses={mintA:mint.toBase58(),mintB:quote.toBase58(),tokenProgram:spl.TOKEN_PROGRAM_ID.toBase58(),positionNFTProgram:spl.TOKEN_2022_PROGRAM_ID.toBase58(),associatedTokenProgram:spl.ASSOCIATED_TOKEN_PROGRAM_ID.toBase58(),meteoraProgram:m.CP_AMM_PROGRAM_ID.toBase58(),squadsProgram:sq.PROGRAM_ID.toBase58(),LPmultisig:lp.multisig,LPvault:lp.vault,TreasuryMultisig:treasury.multisig,TreasuryVault:treasury.vault,LPplovATA:ata(lp.vault,mint),LPwsolATA:ata(lp.vault,quote),TreasuryPlovATA:ata(treasury.vault,mint),derivedUpperPool:upper.toBase58(),derivedUpperVaultA:m.deriveTokenVaultAddress(mint,upper).toBase58(),derivedUpperVaultB:m.deriveTokenVaultAddress(quote,upper).toBase58(),meteoraPoolAuthority:poolAuthority.toBase58()};
assert.equal(sq.getVaultPda({multisigPda:pk(lp.multisig),index:0})[0].toBase58(),lp.vault);assert.equal(sq.getVaultPda({multisigPda:pk(treasury.multisig),index:0})[0].toBase58(),treasury.vault);
addresses.addressLookupTableProgram=AddressLookupTableProgram.programId.toBase58();
const requirements=[
 ['A01','OWNER_DECISION','Утвердить poolCreatorAuthority','Кандидат — LP vault; требуются owner approval reference и approved authority.'],
 ['A02','PRODUCTION_ADOPTION_OPEN','Принять атомарную схему','Один VaultTransaction с обеими инициализациями и двумя ephemeral NFT PDA; раздельные batch execute не заменяют атомарность.'],
 ['A03','EXTERNAL_ISSUANCE_OPEN','Получить и принять LOWER config','config/index/PDA/type1/permission0/authority; finalized issuance transaction и историческая Operator authorization. Офлайн v91 checker сверяет лишь ожидаемые поля.'],
 ['A04','LIVE_EVIDENCE_OPEN','Обновить chain evidence','Genesis до/после, finalized context/floors/time, mint/program/governance/config/UPPER existence/балансы. Снимки20.10 не объявлять текущими.'],
 ['A05','OWNER_DEFERRED','Бюджет, геометрия и T0','Выбрать production candidate/капитал/границы/объёмы/operating budget/T0 перед запуском; research MIN/IDEAL и frozen FX не подставлять автоматически.'],
 ['A06','SIGNER_ACCESS_OPEN','Подтвердить подписантов','Treasury3/5, LP2/3; public membership не доказывает контроль ключа или доступность человека.'],
 ['A07','PAYER_POLICY_OPEN','Назначить плательщиков','Отдельно governance/ALT/ATA rent, init rent/seed, transaction/priority fees, услуга config и operating reserve.890880lamports fixture не operating budget.'],
 ['A08','MESSAGE_IDENTITY_OPEN','Зафиксировать два сообщения','Treasury SOL→LP vault и checked PLOV→LP ATA; LP обе инициализации; свежие transaction indexes, exact bytes/hash, signer/writable metas, CU/bytes.'],
 ['A09','ALT_ACCEPTANCE_OPEN','Принять frozen ALT','Реальные address/owner/program/contents/index mapping/authority absent/activation slot/readback; builtin LiteSVM не mainnet ELF acceptance.'],
 ['A10','SOURCE_PARITY_OPEN','Привязать актуальные программы и аудит','Deployment/ProgramData/ELF и source/build review; cached v90 и application hashes не доказывают binary parity.'],
 ['A11','SIGN_ONLY_NOT_RUN','Installed Phantom sign-only','Согласованные wallet/origin/RPC/build/manifest/message; temporary signature preservation; retired v67 не использовать.'],
 ['A12','NETWORK_ACCEPTANCE_OPEN','Отдельно разрешить real send','Sign-only не разрешает send; finalized actual governance/config/funding/pools/NFT/readback после действий.'],
 ['A13','RELEASE_GO_OPEN','Отдельный release GO','Approved runtime manifest и live routing/storage/browser acceptance; MAINNET_GO остаётсяNO.'],
 ['A14','OWNER_DEFERRED','Вернуть60PLOV до POOL_CREATE','Решение/действие владельца перед запуском; проверить распределение и чужой customizable pool перед созданием, переводов в пакете нет.']
].map(([id,status,title,requiredEvidence])=>({id,status,title,requiredEvidence}));
const packet={schema:1,version:106,kind:'REVIEW_PACKET_NOT_RUNTIME_MANIFEST_OR_TRANSACTION',status:'PACKET_ASSEMBLED_PRODUCTION_BLOCKED',dateDushanbe:'2026-10-21',sourceBaselineCommit:'e27601798a0a06031669da592808923544c6f3eb',MAINNET_GO:'NO',readyForIssuance:false,readyForWalletTest:false,readyForNetworkSend:false,externalMessagesSent:0,networkRequests:0,networkSends:0,realWalletPrompts:0,
 identity:{network:'mainnet-beta',expectedGenesis:inquiry.expectedGenesis,addresses,addressEvidence:'Multisigs/vaults are retained v94/v95 observations; ATA/UPPER/vault addresses are offline PDA derivations, not existence/control/readiness evidence.',currentOnchainExistenceVerified:false},
 retainedProgramPins:read(paths[4]),
 candidatePoolProfile:{status:'RESEARCH_CANDIDATE_NOT_PRODUCTION_APPROVAL',baseFeeNumerator:'2500004',feeDenominator:'1000000000',collectFeeMode:1,protocolFeePercent:20,dynamicFee:0,compoundingFeeBps:0,activationType:1,alphaVault:false},
 retainedGovernance:{LP:{capturedAt:lp.capturedAt,firstSlot:lp.firstSlot,lastSlot:lp.lastSlot,threshold:lp.threshold,timeLockSeconds:lp.timeLockSeconds,members:lp.members,transactionIndexObserved:lp.transactionIndex},Treasury:{capturedAt:treasury.capturedAt,firstSlot:treasury.firstSlot,lastSlot:treasury.lastSlot,threshold:treasury.threshold,timeLockSeconds:treasury.timeLockSeconds,members:treasury.members,transactionIndexObserved:treasury.transactionIndex},sharedMemberAddresses:shared,signerAvailability:'NOT_CONFIRMED',humanIdentities:'UNKNOWN',freshlyRequeried:false},
 proposedRoles:{configAuthority:{candidate:lp.vault,candidateMultisig:lp.multisig,approvedAuthority:null,approvalReference:null,status:'OWNER_DECISION_REQUIRED',scope:'Dynamic config pool-creator authority, not mint/update authority or Meteora Operator.'},positionNFTCustody:{candidate:lp.vault,approvedOwner:null,approvalReference:null},poolCreator:{candidate:lp.vault,approvedCreator:null,approvalReference:null},mintAuthorityChange:false,freezeAuthorityChange:false,operatorRoleRequested:false,productionAtomicDesignApproved:false},
 actualConfig:{authority:null,index:null,address:null,issuer:null,issuanceTransaction:null,historicalOperatorProof:null,finalizedSlot:null,rawAccountSHA256:null,expectedConfigType:1,expectedPermissionU128:'0',status:'NOT_ISSUED_OR_ACCEPTED_IN_RETAINED_PROJECT_RECORD',pairRestrictionClaimed:false},
 productionInputs:{candidateId:null,budget:null,geometry:null,T0:null,LPTransactionIndex:null,TreasuryTransactionIndex:null,ephemeralNFTAddresses:null,LOWERPoolAddress:null,ALTAddress:null,ALTContentsSHA256:null,approvedProgramPins:null,approvedManifestSHA256:null,signerAssignments:null,payerAssignments:null,operatingReserve:null,networkSendApprovalReference:null,releaseGOReference:null},
 payerCategories:['Config service quote versus on-chain issuer payer','Treasury/LP proposal account rent and member transaction fees','Frozen ALT creation/extension rent and payer','LP/Treasury ATA creation payer','LP seed and initialization account rent','Operating reserve and priority-fee policy after creation'],
 bindingOrder:['Owner authority selection; no issuance/payment/send permission','Project-specific issuance availability/terms with approved identity','Accept issued config evidence separately','Owner-deferred geometry/budget/T0 plus payer/signer policy','Fresh governance indexes, ephemeral NFT PDAs and LOWER PDA','Verify frozen ALT and exact funding+dual-init message hashes','Quorums/timelocks/live preflight and separate real-send permission','Finalized actual readback/runtime manifest; separate launch GO'],
 runtimeManifestRequiredBindings:['Approved current ProgramData address/hash/deployment slot','UPPER address/creator/sqrtMinPrice/sqrtMaxPrice/liquidity/poolType/activationType/activationPoint','LOWER same fields plus config.address/config.authority/config.index','Shared approved integer P0 and activationPoint; separately accepted fee profile','Post-create existence/ownership/NFT custody/current live route checks; packet has no root pools array'],
 nativeEvidence:{v100:read(paths[6]).status,v101:read(paths[7]).status,v102:read(paths[8]).status,v103:read(paths[9]).status,v104:read(paths[10]).status,v105:read(paths[11]).status,realAcceptanceGranted:false},sourceEvidence:evidence,applicationPins:appPins,assemblerSHA256:hash(fs.readFileSync(__filename)),requirements};
assert.equal(packet.productionInputs.LOWERPoolAddress,null);assert.equal(packet.proposedRoles.configAuthority.approvedAuthority,null);assert.equal(packet.requirements.length,14);assert(!('pools'in packet));
const P='docs/lp-production-acceptance-v106.json',M='docs/lp-production-acceptance-v106-ru.md',bytes=JSON.stringify(packet,null,2)+'\n',packetHash=hash(Buffer.from(bytes));fs.writeFileSync(path.join(R,P),bytes);
const A=addresses,rows=[
 ['Mint PLOV',A.mintA,'Сохранённый проектный mint; decimals9 — ожидаемый профиль, live проверка впереди.'],
 ['WSOL mint',A.mintB,'Стандартный WSOL; decimals9 — ожидаемый профиль.'],
 ['LP multisig',A.LPmultisig,'Raw v94 от20.10;2/3+12ч.'],
 ['LP vault0',A.LPvault,'PDA совпал с raw v94. Кандидат authority/NFT custody.'],
 ['Treasury multisig',A.TreasuryMultisig,'Raw v95 от20.10;3/5+48ч.'],
 ['Treasury vault0',A.TreasuryVault,'PDA совпал с raw v95.'],
 ['LP PLOV ATA',A.LPplovATA,'Офлайн-вывод, нынешнее существование/баланс не проверены.'],
 ['LP WSOL ATA',A.LPwsolATA,'Офлайн-вывод.'],
 ['Treasury PLOV ATA',A.TreasuryPlovATA,'Офлайн-вывод.'],
 ['UPPER customizable PDA',A.derivedUpperPool,'Офлайн-вывод; не свидетельство создания/владения.'],
 ['Meteora pool authority',A.meteoraPoolAuthority,'Глобальный PDA владельца token vaults; не LP multisig и не config authority.']
];
const md=[
 '# PlovCoin: пакет приёмки ликвидности v106','',
 '**21.10.2026. Пакет собран; производство заблокировано. MAINNET_GO=NO.**','',
 'Локальные v100–v105 завершили перенос точной геометрии, native пути, Squads custody, атомарное создание и Treasury→LP handoff. Выдача реального config, доступ ключей и производственное финансирование этим не подтверждены. Повторять прогоны без изменения входов не требуется.','',
 '## 1. Известные адреса','',
 '| Назначение | Адрес | Основание |','|---|---|---|',
 ...rows.map(([label,address,note])=>'| '+label+' | '+address+' | '+note+' |'),'',
 'LOWER PDA нельзя зафиксировать без реального config. Свежий transaction index нужен для двух ephemeral NFT PDA; наблюдённые LP3/Treasury2 не резервируют следующие индексы. Реальная ALT не назначена.','',
 '## 2. Ближайшее решение владельца','',
 'Предложение: использовать **LP vault '+A.LPvault+'** как poolCreatorAuthority LOWER dynamic config. Account LP multisig '+A.LPmultisig+' не заменяет vault signer. Нативные Squads-прогоны проверили vault signer/CPI механизм.','',
 'Это назначение полномочий config. Поэтому authorityApproved=false, approvedAuthority=null, approvalReference=null сохраняются. Mint/update authority не меняется; Meteora Operator проекту не запрашивается.','',
 'Текст для отдельного согласования:','',
 '> Утверждаю LP vault '+A.LPvault+' как poolCreatorAuthority для запроса LOWER dynamic config типа1 с permission0. Утверждение касается выбора authority. Выдача config, платежи, подписи, реальные переводы и запуск требуют своих оснований и разрешений.','',
 'Бюджет, production geometry, T0 и возврат60PLOV остаются перед запуском. Производственное принятие атомарной схемы также ещё открыто. Предложение выше не заполняет эти поля.','',
 '## 3. Условия приёмки','',
 '| ID | Состояние | Условие закрытия |','|---|---|---|',
 ...requirements.map(q=>'| '+q.id+' | '+q.status+' | **'+q.title+'**. '+q.requiredEvidence+' |'),'',
 '## 4. Порядок действий','',
 '1. Сначала зафиксировать выбор authority и ссылку на решение. [Черновик обращения](lower-config-inquiry.json) остаётся DRAFT_NOT_SENT. У оператора нужны конкретная доступность выдачи, применимые условия/стоимость/плательщик/срок. Общий SDK/Squads механизм уже исследован.',
 '2. Принимать config по raw account и успешной finalized issuance transaction, включая историческое разрешение Operator. config-account-check.cjs сверяет поля с заданными ожиданиями; его PASS не равен одобрению или доказательству происхождения.',
 '3. После реального config и отложенных решений связать свежие indexes, NFT PDAs, LOWER PDA, frozen ALT, seed/rent/операционный бюджет и плательщиков с хешами двух сообщений. Первый public member key не становится автоматически плательщиком.',
 '4. Treasury SOL→LP vault + checked PLOV→LP ATA — одна транзакция. UPPER+LOWER — другая, внутри неё обе инициализации. Ошибка funding откатывает оба перевода; поздняя ошибка создания сохраняет уже переданные средства у LP.',
 '5. LP12ч могут перекрываться с Treasury48ч при заранее согласованном точном сообщении. Репетиция48ч вместо60ч не гарантирует календарного срока. Изменение T0/содержимого требует новой рассмотренной заявки с применимыми голосами/задержкой.',
 '6. Installed Phantom sign-only, real send и release GO принимаются отдельно. Retired v67 не использовать. Seed/private key, неизвестный Phantom account или произвольная дозаправка SOL не нужны для этого review.','',
 '## 5. Проверка и границы','',
 'Raw v94/v95 повторно декодированы и совпали с сохранёнными review, PDA, threshold, timelock и roster. Три LP member адреса входят в пять Treasury; личности/контроль/человеческая независимость неизвестны. Все13 application source pins совпали. Свежих RPC reads в этой сборке нет.','',
 'JSON фиксирует15 source evidence hashes,13 application hashes, хеш assembler, пять исторических program/ProgramData/ELF pins и исследовательский fee profile с alphaVault=false. ALT v104/v105 — builtin LiteSVM. Source/build parity и нынешнее deployment состояние не установлены. Готовых transaction bytes, подписей, назначенных плательщиков и send-разрешений нет.','',
 'Пакет не является runtime manifest: нет approved config/LOWER/geometry/T0/ALT и root pools array. Приложение продолжает требовать отдельно утверждённый manifest и фактические live accounts.','',
 'JSON: [lp-production-acceptance-v106.json](lp-production-acceptance-v106.json). SHA256: '+packetHash+'.','',
 'Воспроизведение из research/lower-squads-offline: node assemble-production-review.cjs --write.','',
 'В этой сборке RPC/transaction builds/signatures/wallet prompts/network sends/external messages0. Whitepaper/токеномика/authority/балансы/production flags не менялись.',''
].join('\n');
fs.writeFileSync(path.join(R,M),md);console.log(JSON.stringify({status:packet.status,requirements:requirements.length,sourceEvidence:evidence.length,applicationPins:appPins.length,addresses:Object.keys(addresses).length,rawGovernanceReview:'MATCH',authorityApproval:false,MAINNET_GO:'NO',JSONSHA256:packetHash,JSON:P,readme:M},null,2));
