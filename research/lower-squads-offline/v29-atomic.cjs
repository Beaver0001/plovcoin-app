'use strict';
// Atomic exact v29 initialization; historical v102 setup, new v104 execution.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {LiteSVM,FailedTransactionMetadata,Clock}=require('litesvm');
const {getTransactionDecoder}=require('@solana/kit');
const {PublicKey,Keypair,Connection,TransactionMessage,VersionedTransaction,SystemProgram,ComputeBudgetProgram,AddressLookupTableAccount,AddressLookupTableProgram}=require('@solana/web3.js');
const spl=require('@solana/spl-token'),m=require('@meteora-ag/cp-amm-sdk'),sq=require('@sqds/multisig'),BN=require('bn.js');
if(!process.argv[2])throw Error('Provide retained v90 fixture directory; no downloads');
const root=__dirname,dir=path.resolve(process.argv[2]),pins=JSON.parse(fs.readFileSync(path.join(dir,'..','program-pins.json'))),expected=JSON.parse(fs.readFileSync(path.join(root,'program-pins-v90.json')));
const hash=x=>createHash('sha256').update(x).digest('hex'),bn=x=>new BN(x.toString()),bi=x=>BigInt(x.toString());
const storedMessageBytes=msg=>sq.types.transactionMessageBeet.serialize({...msg,instructions:msg.instructions.map(ix=>({...ix,accountIndexes:Array.from(ix.accountIndexes),data:Array.from(ix.data)})),addressTableLookups:msg.addressTableLookups.map(t=>({...t,writableIndexes:Array.from(t.writableIndexes),readonlyIndexes:Array.from(t.readonlyIndexes)}))})[0];
assert.deepEqual(pins.programs,expected.programs);assert.equal(pins.programs.length,5);
const elf=pins.programs.map(p=>{const bytes=fs.readFileSync(path.join(dir,p.name+'.so'));assert.equal(hash(bytes),p.elfSha256);return{...p,bytes};});
const geometry=JSON.parse(fs.readFileSync(path.join(root,'v29-geometry-result.json')));
const out={version:104,status:'RUNNING',programPins:pins,geometryResultSHA256:hash(fs.readFileSync(path.join(root,'v29-geometry-result.json'))),cases:[],localTransactions:0,localFundingAirdrops:0,networkRequests:0,networkSends:0,realWalletPrompts:0,Wave1Inputs:null,MAINNET_GO:'NO',scope:'Atomic dual exact v29 initialization with native local ALT and Squads2/3+12h; no production approval'};
async function run(g){
 const key=n=>Keypair.fromSeed(createHash('sha256').update('PLOV_V104_SYNTHETIC:'+g.id+':'+n).digest());
 const members=[key('a'),key('b'),key('c')],operatorKey=key('operator'),createKey=key('createKey'),mint=key('mint'),treasury=key('treasury').publicKey;
 const svm=new LiteSVM();for(const e of elf)svm.addProgramWithLoader(e.program,e.bytes,e.loader);svm.setClock(new Clock(svm.getClock().slot,0n,0n,0n,1800000000n));
 const acct=p=>{const a=svm.getAccount(p.toBase58());return a.exists?a:null;};
 const set=(p,data,owner,lamports=100000000n)=>svm.setAccount({address:p.toBase58(),data:new Uint8Array(data),programAddress:owner.toBase58(),lamports,executable:false,space:BigInt(data.length)});
 const amount=p=>acct(p)?spl.AccountLayout.decode(Buffer.from(acct(p).data)).amount:0n;
 const connection={getAccountInfo:async p=>{const a=acct(p);return a?{data:Buffer.from(a.data),owner:new PublicKey(a.programAddress),lamports:Number(a.lamports),executable:a.executable,rentEpoch:0}:null;}};
 const amm=new m.CpAmm(new Connection('http://127.0.0.1:1',{fetch:async()=>{throw Error('Network prohibited');}}));
 const transactions=[];const legs=[],activationProbes=[];const activationAt=1800000000n+(g.mode==='after-T0'?100n:43201n+300n);
 function send(label,ixs,signers=[members[0]],success=true,tables=[],units=1400000){
  svm.expireBlockhash();const tx=new VersionedTransaction(new TransactionMessage({payerKey:signers[0].publicKey,recentBlockhash:svm.latestBlockhash(),instructions:[ComputeBudgetProgram.setComputeUnitLimit({units}),...ixs]}).compileToV0Message(tables));assert(tx.serialize().length<=1232);tx.sign(signers);
  const r=svm.sendTransaction(getTransactionDecoder().decode(tx.serialize())),failed=r instanceof FailedTransactionMetadata,meta=failed?r.meta():r;
  const t={label,success:!failed,error:failed?r.err().toString():null,logs:meta.logs(),computeUnits:String(meta.computeUnitsConsumed()),bytes:tx.serialize().length};transactions.push(t);out.localTransactions++;
  if(failed===success)throw Object.assign(Error(label+' unexpected outcome '+t.error),{native:t});return t;
 }
 for(const k of[...members,operatorKey]){const r=svm.airdrop(k.publicKey.toBase58(),100000000000000n);assert(!(r instanceof FailedTransactionMetadata));out.localFundingAirdrops++;}
 set(sq.getProgramConfigPda({})[0],sq.accounts.ProgramConfig.fromArgs({authority:operatorKey.publicKey,treasury,multisigCreationFee:0n,reserved:Array(64).fill(0)}).serialize()[0],sq.PROGRAM_ID);
 const multisig=sq.getMultisigPda({createKey:createKey.publicKey})[0],vault=sq.getVaultPda({multisigPda:multisig,index:0})[0];
 send('create synthetic2/3+12h multisig',[sq.instructions.multisigCreateV2({treasury,creator:members[0].publicKey,multisigPda:multisig,configAuthority:null,threshold:2,members:members.map(k=>({key:k.publicKey,permissions:sq.types.Permissions.all()})),timeLock:43200,createKey:createKey.publicKey,rentCollector:null})],[members[0],createKey]);
 const funding=svm.airdrop(vault.toBase58(),100000000000000n);assert(!(funding instanceof FailedTransactionMetadata));out.localFundingAirdrops++;
 const operator=m.deriveOperatorAddress(operatorKey.publicKey);set(operator,await amm._program.coder.accounts.encode('operator',{whitelistedAddress:operatorKey.publicKey,permission:bn(1),padding:[bn(0),bn(0)]}),amm._program.programId);
 const config=m.deriveConfigAddress(bn(104));send('issue SYNTHETIC config bound to vault',[await amm._program.methods.createDynamicConfig(bn(104),{poolCreatorAuthority:vault,permission:bn(0)}).accountsPartial({config,operator,signer:operatorKey.publicKey,payer:operatorKey.publicKey,systemProgram:SystemProgram.programId}).instruction()],[operatorKey]);
 const configState=amm._program.coder.accounts.decode('config',Buffer.from(acct(config).data));assert(configState.poolCreatorAuthority.equals(vault));assert.equal(configState.configType,1);
 const native=Buffer.alloc(spl.MINT_SIZE);spl.MintLayout.encode({mintAuthorityOption:0,mintAuthority:PublicKey.default,supply:0n,decimals:9,isInitialized:true,freezeAuthorityOption:0,freezeAuthority:PublicKey.default},native);set(spl.NATIVE_MINT,native,spl.TOKEN_PROGRAM_ID,1461600n);
 const payerAta=spl.getAssociatedTokenAddressSync(mint.publicKey,vault,true),wsolAta=spl.getAssociatedTokenAddressSync(spl.NATIVE_MINT,vault,true);
 send('prepare synthetic mint and700M inventory',[SystemProgram.createAccount({fromPubkey:members[0].publicKey,newAccountPubkey:mint.publicKey,space:spl.MINT_SIZE,lamports:1461600,programId:spl.TOKEN_PROGRAM_ID}),spl.createInitializeMint2Instruction(mint.publicKey,9,members[0].publicKey,null),spl.createAssociatedTokenAccountIdempotentInstruction(members[0].publicKey,payerAta,vault,mint.publicKey),spl.createMintToInstruction(mint.publicKey,payerAta,members[0].publicKey,700000000n*1000000000n)],[members[0],mint]);
 const fees={baseFee:{data:Array.from(m.encodeFeeTimeSchedulerParams(bn(2500004),0,bn(0),bn(0),0))},compoundingFeeBps:0,padding:0,dynamicFee:null};
 async function inactiveProbe(leg,sell){
  const poolKey=new PublicKey(leg.pool),state=amm._program.coder.accounts.decode('pool',Buffer.from(acct(poolKey).data)),trader=members[2],a=spl.getAssociatedTokenAddressSync(mint.publicKey,trader.publicKey),b=spl.getAssociatedTokenAddressSync(spl.NATIVE_MINT,trader.publicKey);
  const keys=[vault,poolKey,new PublicKey(leg.position),state.tokenAVault,state.tokenBVault,a,b],snapshot=()=>keys.map(p=>{const v=acct(p);return v?{key:p.toBase58(),hash:hash(v.data),lamports:String(v.lamports),owner:v.programAddress}:{key:p.toBase58(),exists:false};}),before=snapshot(),beforeFee=acct(trader.publicKey).lamports;
  const now=svm.getClock().unixTimestamp;assert(now<activationAt);assert.equal(bi(state.activationPoint),activationAt);
  const tx=await amm.swap2({pool:poolKey,tokenAMint:mint.publicKey,tokenBMint:spl.NATIVE_MINT,tokenAVault:state.tokenAVault,tokenBVault:state.tokenBVault,tokenAProgram:spl.TOKEN_PROGRAM_ID,tokenBProgram:spl.TOKEN_PROGRAM_ID,payer:trader.publicKey,inputTokenMint:sell?mint.publicKey:spl.NATIVE_MINT,outputTokenMint:sell?spl.NATIVE_MINT:mint.publicKey,poolState:state,referralTokenAccount:null,swapMode:m.SwapMode.ExactIn,amountIn:bn(sell?70000000n*1000000000n:1000000000n),minimumAmountOut:bn(0)});
  const t=send('reject inactive '+leg.name+' public swap',tx.instructions,[trader],false);assert.match(t.logs.join('\n'),/PoolDisabled|SwapDisabled/);assert.deepEqual(snapshot(),before);assert.equal(acct(trader.publicKey).lamports,beforeFee-5000n);t.rollbackBeforeSHA256=hash(Buffer.from(JSON.stringify(before)));t.rollbackAfterSHA256=hash(Buffer.from(JSON.stringify(snapshot())));t.rollback='INACTIVE_POOL_AND_VAULT_UNCHANGED_EXTERNAL_FEE_PAYER_EXCLUDED';activationProbes.push({pool:leg.name,at:String(now),activationAt:String(activationAt),rejected:true,reason:'PoolDisabled'});
 }

 const index=1n,transaction=sq.getTransactionPda({multisigPda:multisig,index})[0],proposal=sq.getProposalPda({multisigPda:multisig,transactionIndex:index})[0];
 const built=[];
 for(let j=0;j<2;j++){
  const leg=g.legs[j],nft=sq.getEphemeralSignerPda({transactionPda:transaction,ephemeralSignerIndex:j})[0];
  const params={payer:vault,creator:vault,positionNft:nft,tokenAMint:mint.publicKey,tokenBMint:spl.NATIVE_MINT,tokenAProgram:spl.TOKEN_PROGRAM_ID,tokenBProgram:spl.TOKEN_PROGRAM_ID,tokenAAmount:bn(leg.budgetA),tokenBAmount:bn(leg.budgetB),sqrtMinPrice:bn(leg.sqrtMin),sqrtMaxPrice:bn(leg.sqrtMax),initSqrtPrice:bn(leg.sqrtInitial),liquidityDelta:bn(leg.liquidityU128),poolFees:fees,hasAlphaVault:false,activationType:1,collectFeeMode:1,activationPoint:bn(activationAt),isLockLiquidity:false};
  const b=j===0?await amm.createCustomPool(params):await amm.createCustomPoolWithDynamicConfig({...params,config,poolCreatorAuthority:vault});
  built.push({...b,nft,nftAccount:m.derivePositionNftAccount(nft),aVault:m.deriveTokenVaultAddress(mint.publicKey,b.pool),bVault:m.deriveTokenVaultAddress(spl.NATIVE_MINT,b.pool)});
 }
 assert(!built[0].pool.equals(built[1].pool));assert(!built[0].nft.equals(built[1].nft));
 const instructions=built.flatMap(b=>b.tx.instructions),message=new TransactionMessage({payerKey:vault,recentBlockhash:svm.latestBlockhash(),instructions});
 const uncompressed=sq.utils.transactionMessageToMultisigTransactionMessageBytes({message,vaultPda:vault});
 const addresses=[...new Map(instructions.flatMap(ix=>[ix.programId,...ix.keys.map(k=>k.pubkey)]).map(p=>[p.toBase58(),p])).values()];
 const recentSlot=svm.getSlotHashes()[0].slot;
 const [createTable,tableKey]=AddressLookupTableProgram.createLookupTable({authority:members[0].publicKey,payer:members[0].publicKey,recentSlot});
 send('ALT create via bundled local native program',[createTable]);
 for(let offset=0;offset<addresses.length;offset+=15)send('ALT extend '+offset,[AddressLookupTableProgram.extendLookupTable({lookupTable:tableKey,authority:members[0].publicKey,payer:members[0].publicKey,addresses:addresses.slice(offset,offset+15)})]);
 send('ALT freeze native',[AddressLookupTableProgram.freezeLookupTable({lookupTable:tableKey,authority:members[0].publicKey})]);
 const alt=()=>new AddressLookupTableAccount({key:tableKey,state:AddressLookupTableAccount.deserialize(Buffer.from(acct(tableKey).data))});
 assert.equal(alt().state.authority,undefined);assert.deepEqual(alt().state.addresses.map(p=>p.toBase58()),addresses.map(p=>p.toBase58()));
 const frozenHash=hash(acct(tableKey).data),freezePayerBefore=acct(members[0].publicKey).lamports;
 const freezeReject=send('reject extension of frozen ALT',[AddressLookupTableProgram.extendLookupTable({lookupTable:tableKey,authority:members[0].publicKey,payer:members[0].publicKey,addresses:[treasury]})],[members[0]],false);
 assert.match(freezeReject.logs.join('\n'),/immutable/i);assert.equal(hash(acct(tableKey).data),frozenHash);assert.equal(acct(members[0].publicKey).lamports,freezePayerBefore-5000n);
 freezeReject.rollbackBeforeSHA256=frozenHash;freezeReject.rollbackAfterSHA256=hash(acct(tableKey).data);
 const warm=svm.getClock();warm.slot=BigInt(alt().state.lastExtendedSlot)+1n;svm.setClock(warm);
 connection.getAddressLookupTable=async key=>({value:key.equals(tableKey)?alt():null});
 const compact=sq.utils.transactionMessageToMultisigTransactionMessageBytes({message,vaultPda:vault,addressLookupTableAccounts:[alt()]});
 const [decoded]=sq.types.transactionMessageBeet.deserialize(Buffer.from(compact));
 const innerSigners=decoded.accountKeys.slice(0,decoded.numSigners).map(p=>p.toBase58()).sort();assert.deepEqual(innerSigners,[vault.toBase58(),...built.map(b=>b.nft.toBase58())].sort());
 assert.equal(decoded.addressTableLookups.length,1);
 const wire=ix=>{try{return{bytes:new VersionedTransaction(new TransactionMessage({payerKey:members[0].publicKey,recentBlockhash:svm.latestBlockhash(),instructions:[ComputeBudgetProgram.setComputeUnitLimit({units:1400000}),ix]}).compileToV0Message()).serialize().length,error:null};}catch(e){return{bytes:null,error:e.message};}};
 const createPlain=sq.instructions.vaultTransactionCreate({multisigPda:multisig,transactionIndex:index,creator:members[0].publicKey,vaultIndex:0,ephemeralSigners:2,transactionMessage:message});
 const plainCreate=wire(createPlain);
 const storeTx=send('store both pools in one ALT message',[sq.instructions.vaultTransactionCreate({multisigPda:multisig,transactionIndex:index,creator:members[0].publicKey,vaultIndex:0,ephemeralSigners:2,transactionMessage:message,addressLookupTableAccounts:[alt()]})]);
 const nativeStored=sq.accounts.VaultTransaction.fromAccountInfo({data:Buffer.from(acct(transaction).data)})[0];
 assert.equal(hash(storedMessageBytes(nativeStored.message)),hash(compact));assert.equal(nativeStored.ephemeralSignerBumps.length,2);
 send('create one dual-pool proposal',[sq.instructions.proposalCreate({multisigPda:multisig,creator:members[0].publicKey,transactionIndex:index,isDraft:false})]);
 const ex=await sq.instructions.vaultTransactionExecute({connection,multisigPda:multisig,transactionIndex:index,member:members[0].publicKey});
 assert.equal(ex.lookupTableAccounts.length,1);const execute=ex.instruction,plainExecute=wire(execute);
 const track=[vault,payerAta,wsolAta,config,transaction,proposal,tableKey,...built.flatMap(b=>[b.pool,b.position,b.nft,b.nftAccount,b.aVault,b.bVault])];
 const snap=()=>track.map(p=>{const a=acct(p);return a?{key:p.toBase58(),sha256:hash(a.data),lamports:String(a.lamports),owner:a.programAddress}:{key:p.toBase58(),exists:false};});
 const status=()=>sq.accounts.Proposal.fromAccountInfo({data:Buffer.from(acct(proposal).data)})[0].status;
 const absent=()=>built.every(b=>[b.pool,b.position,b.nft,b.nftAccount,b.aVault,b.bVault].every(p=>acct(p)===null));
 const failureProbes=[];
 function reject(label,pattern,afterUpper=false,units=1400000){
  const before=snap(),payerBefore=acct(members[0].publicKey).lamports;
  const t=send(label,[execute],[members[0]],false,[alt()],units);assert.match(t.logs.join('\n')+' '+t.error,pattern);
  assert.deepEqual(snap(),before);assert.equal(acct(members[0].publicKey).lamports,payerBefore-5000n);assert(absent());
  const upperSucceeded=t.logs.includes('Program '+amm._program.programId.toBase58()+' success');
  if(afterUpper)assert(upperSucceeded);
  t.rollbackBeforeSHA256=hash(Buffer.from(JSON.stringify(before)));t.rollbackAfterSHA256=hash(Buffer.from(JSON.stringify(snap())));
  failureProbes.push({label,upperCPISucceeded:upperSucceeded,bothPoolsAbsent:true,proposalStatus:status().__kind,trackedAccounts:track.length});
 }
 send('approve one',[sq.instructions.proposalApprove({multisigPda:multisig,transactionIndex:index,member:members[0].publicKey})]);reject('reject quorum1',/InvalidProposalStatus/);
 send('approve two',[sq.instructions.proposalApprove({multisigPda:multisig,transactionIndex:index,member:members[1].publicKey})],[members[1]]);
 const approvedAt=bi(status().timestamp);reject('reject before12h',/TimeLockNotReleased/);
 if(g.mode==='after-T0'){const c=svm.getClock();c.unixTimestamp=activationAt+1n;svm.setClock(c);reject('reject afterT0 but before12h',/TimeLockNotReleased/);}
 const clock=svm.getClock();clock.unixTimestamp=g.mode==='at-T0'?activationAt:approvedAt+43201n;svm.setClock(clock);assert(absent());
 if(g.mode==='cancelled'){
  for(const k of members.slice(0,2))send('cancel whole dual-pool proposal',[sq.instructions.proposalCancelV2({multisigPda:multisig,transactionIndex:index,member:k.publicKey})],[k]);
  reject('reject fully cancelled dual proposal',/InvalidProposalStatus/);assert.equal(status().__kind,'Cancelled');
 }else if(g.mode==='after-T0'){
  reject('reject expired activation point keeps both absent',/InvalidActivationPoint/);assert.equal(status().__kind,'Approved');
 }else{
  const savedConfig=acct(config);
  set(config,await amm._program.coder.accounts.encode('config',{...configState,poolCreatorAuthority:members[2].publicKey}),amm._program.programId,savedConfig.lamports);
  reject('LOWER wrong authority rolls back successful UPPER',/ConstraintHasOne/,true);svm.setAccount(savedConfig);
  set(config,await amm._program.coder.accounts.encode('config',{...configState,configType:0}),amm._program.programId,savedConfig.lamports);
  reject('LOWER wrong type rolls back successful UPPER',/InvalidConfigType/,true);svm.setAccount(savedConfig);
  const savedVault=acct(vault);svm.setAccount({...savedVault,lamports:100000000n});
  reject('LOWER missing seed SOL rolls back successful UPPER',/insufficient lamports|insufficient funds|InsufficientFunds/i,true);svm.setAccount(savedVault);
  const savedTx=acct(transaction),decodedTx=sq.accounts.VaultTransaction.fromAccountInfo({data:Buffer.from(savedTx.data)})[0],missingSecond=sq.accounts.VaultTransaction.fromArgs({...decodedTx,ephemeralSignerBumps:new Uint8Array([decodedTx.ephemeralSignerBumps[0]])}).serialize()[0];
  set(transaction,Buffer.concat([missingSecond,Buffer.alloc(savedTx.data.length-missingSecond.length)]),sq.PROGRAM_ID,savedTx.lamports);
  reject('reject missing second ephemeral signer',/InvalidAccount/);svm.setAccount(savedTx);
  reject('LOWER compute exhaustion rolls back successful UPPER',/ComputationalBudgetExceeded|exceeded CUs|compute units|ProgramFailedToComplete/i,true,240000);
 }
 let execution=null;
 if(g.mode==='before-T0'||g.mode==='at-T0'){
  const beforeBase=amount(payerAta),beforeSOL=acct(vault).lamports,empty=snap();
  const t=send('execute BOTH pools atomically',[execute],[members[0]],true,[alt()]);
  assert.equal(status().__kind,'Executed');assert(!absent());
  for(let j=0;j<2;j++){
   const b=built[j],leg=g.legs[j],state=amm._program.coder.accounts.decode('pool',Buffer.from(acct(b.pool).data)),position=amm._program.coder.accounts.decode('position',Buffer.from(acct(b.position).data)),nftState=spl.AccountLayout.decode(Buffer.from(acct(b.nftAccount).data));
   assert(state.sqrtMinPrice.eq(bn(leg.sqrtMin))&&state.sqrtMaxPrice.eq(bn(leg.sqrtMax))&&state.sqrtPrice.eq(bn(leg.sqrtInitial))&&state.liquidity.eq(bn(leg.liquidityU128)));
   assert.equal(bi(state.tokenAAmount),BigInt(leg.amountAUp));assert.equal(bi(state.tokenBAmount),BigInt(leg.amountBUp));assert.equal(bi(state.activationPoint),activationAt);
   assert(nftState.owner.equals(vault)&&position.nftMint.equals(b.nft));assert.equal(nftState.amount,1n);assert(state.creator.equals(vault));
   assert.equal(acct(b.nftAccount).programAddress,spl.TOKEN_2022_PROGRAM_ID.toBase58());
   const fee=Buffer.from(state.poolFees.baseFee.baseFeeInfo.data);assert.equal(fee.readBigUInt64LE(0),2500004n);assert.equal(state.poolFees.protocolFeePercent,20);assert.equal(state.collectFeeMode,1);assert.equal(state.activationType,1);assert.equal(state.poolFees.dynamicFee.initialized,0);assert.equal(state.poolFees.compoundingFeeBps,0);
   legs.push({name:leg.name,pool:b.pool.toBase58(),position:b.position.toBase58(),positionNft:b.nft.toBase58(),owner:nftState.owner.toBase58(),sqrtMin:state.sqrtMinPrice.toString(),sqrtMax:state.sqrtMaxPrice.toString(),sqrtInitial:state.sqrtPrice.toString(),liquidity:state.liquidity.toString(),principalA:state.tokenAAmount.toString(),principalB:state.tokenBAmount.toString(),vaultA:String(amount(b.aVault)),vaultB:String(amount(b.bVault)),activationAt:state.activationPoint.toString(),executedAt:status().timestamp.toString()});
  }
  assert.equal(beforeBase-amount(payerAta),g.legs.reduce((s,l)=>s+BigInt(l.amountAUp),0n));assert.equal(amount(wsolAta),0n);
  const created=track.filter((p,i)=>empty[i].exists===false).map(p=>({key:p.toBase58(),lamports:String(acct(p).lamports),owner:acct(p).programAddress}));
  const debit=beforeSOL-acct(vault).lamports;assert.equal(debit,created.reduce((s,a)=>s+BigInt(a.lamports),0n));
  execution={bytes:t.bytes,computeUnits:t.computeUnits,payerBaseDebit:String(beforeBase-amount(payerAta)),vaultLamportDebit:String(debit),createdAccounts:created,executedAt:status().timestamp.toString(),bothSameOuterTransaction:true};
  const replayBefore=snap(),replayPayerBefore=acct(members[0].publicKey).lamports,replay=send('reject dual creation replay',[execute],[members[0]],false,[alt()]);
  assert.match(replay.logs.join('\n'),/InvalidProposalStatus/);assert.deepEqual(snap(),replayBefore);assert.equal(acct(members[0].publicKey).lamports,replayPayerBefore-5000n);
  replay.rollbackBeforeSHA256=hash(Buffer.from(JSON.stringify(replayBefore)));replay.rollbackAfterSHA256=hash(Buffer.from(JSON.stringify(snap())));execution.replayRejected=true;
  if(g.mode==='before-T0'){const c=svm.getClock();c.unixTimestamp=activationAt-1n;svm.setClock(c);for(const l of legs)await inactiveProbe(l,l.name==='LOWER');c.unixTimestamp=activationAt;svm.setClock(c);}
 }
 return{id:g.id,mode:g.mode,vault:vault.toBase58(),threshold:2,members:3,timeLockSeconds:43200,approvedAt:String(approvedAt),activationAt:String(activationAt),proposalStatus:status().__kind,compactMessageBytes:compact.length,uncompressedMessageBytes:uncompressed.length,plainCreate,plainExecute,storeBytes:storeTx.bytes,storedMessageSHA256:hash(compact),nativeStoredMessageSHA256:hash(storedMessageBytes(nativeStored.message)),ephemeralSigners:2,innerSigners,ALT:{address:tableKey.toBase58(),addresses:addresses.map(p=>p.toBase58()),frozen:alt().state.authority===undefined,lastExtendedSlot:String(alt().state.lastExtendedSlot),executionSlot:String(svm.getClock().slot),dataSHA256:hash(acct(tableKey).data),nativeCreation:true,runtime:'LiteSVM bundled Address Lookup Table program; not a separately captured mainnet ELF'},failureProbes,activationProbes,legs,execution,transactions};
}
(async()=>{try{for(const g of geometry.rows)for(const mode of ['before-T0','at-T0','after-T0','cancelled']){const c=await run({...g,id:g.id+'_'+mode,mode});out.cases.push(c);console.log('ATOMIC V29 PASS',c.id,c.transactions.length);}}catch(e){out.status='FAILED';out.error={message:e.message,native:e.native||null,stack:e.stack};fs.writeFileSync(path.join(root,'v29-atomic-result.json'),JSON.stringify(out,null,2)+'\n');throw e;}out.status='LOCAL_ATOMIC_DUAL_INITIALIZATION_PASS_REAL_CONFIG_OPEN';fs.writeFileSync(path.join(root,'v29-atomic-result.json'),JSON.stringify(out,null,2)+'\n');console.log(out.status,out.cases.length,out.localTransactions);})().catch(e=>{console.error(e);process.exitCode=1;});
