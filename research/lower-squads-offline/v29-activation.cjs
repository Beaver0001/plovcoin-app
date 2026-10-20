'use strict';
// Missing-LOWER activation boundaries; setup adapted from the historical v102 runner.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {LiteSVM,FailedTransactionMetadata,Clock}=require('litesvm');
const {getTransactionDecoder}=require('@solana/kit');
const {PublicKey,Keypair,Connection,TransactionMessage,VersionedTransaction,SystemProgram,ComputeBudgetProgram}=require('@solana/web3.js');
const spl=require('@solana/spl-token'),m=require('@meteora-ag/cp-amm-sdk'),sq=require('@sqds/multisig'),BN=require('bn.js');
if(!process.argv[2])throw Error('Provide retained v90 fixture directory; no downloads');
const root=__dirname,dir=path.resolve(process.argv[2]),pins=JSON.parse(fs.readFileSync(path.join(dir,'..','program-pins.json'))),expected=JSON.parse(fs.readFileSync(path.join(root,'program-pins-v90.json')));
const hash=x=>createHash('sha256').update(x).digest('hex'),bn=x=>new BN(x.toString()),bi=x=>BigInt(x.toString());
const storedMessageBytes=msg=>sq.types.transactionMessageBeet.serialize({...msg,instructions:msg.instructions.map(ix=>({...ix,accountIndexes:Array.from(ix.accountIndexes),data:Array.from(ix.data)}))})[0];
assert.deepEqual(pins.programs,expected.programs);assert.equal(pins.programs.length,5);
const elf=pins.programs.map(p=>{const bytes=fs.readFileSync(path.join(dir,p.name+'.so'));assert.equal(hash(bytes),p.elfSha256);return{...p,bytes};});
const geometry=JSON.parse(fs.readFileSync(path.join(root,'v29-geometry-result.json')));
const out={version:103,status:'RUNNING',programPins:pins,geometryResultSHA256:hash(fs.readFileSync(path.join(root,'v29-geometry-result.json'))),cases:[],localTransactions:0,localFundingAirdrops:0,networkRequests:0,networkSends:0,realWalletPrompts:0,Wave1Inputs:null,MAINNET_GO:'NO',scope:'Missing-LOWER activation boundary; four current-FX candidates, three deterministic orderings; not a launch procedure acceptance'};
async function run(g){
 const key=n=>Keypair.fromSeed(createHash('sha256').update('PLOV_V103_SYNTHETIC:'+g.id+':'+n).digest());
 const members=[key('a'),key('b'),key('c')],operatorKey=key('operator'),createKey=key('createKey'),mint=key('mint'),treasury=key('treasury').publicKey;
 const svm=new LiteSVM();for(const e of elf)svm.addProgramWithLoader(e.program,e.bytes,e.loader);svm.setClock(new Clock(1000n,0n,0n,0n,1800000000n));
 const acct=p=>{const a=svm.getAccount(p.toBase58());return a.exists?a:null;};
 const set=(p,data,owner,lamports=100000000n)=>svm.setAccount({address:p.toBase58(),data:new Uint8Array(data),programAddress:owner.toBase58(),lamports,executable:false,space:BigInt(data.length)});
 const amount=p=>acct(p)?spl.AccountLayout.decode(Buffer.from(acct(p).data)).amount:0n;
 const connection={getAccountInfo:async p=>{const a=acct(p);return a?{data:Buffer.from(a.data),owner:new PublicKey(a.programAddress),lamports:Number(a.lamports),executable:a.executable,rentEpoch:0}:null;}};
 const amm=new m.CpAmm(new Connection('http://127.0.0.1:1',{fetch:async()=>{throw Error('Network prohibited');}}));
 const transactions=[];const legs=[],activationProbes=[];const activationAt=1800000000n+(g.mode==='on-time'?2n*43201n:43201n)+300n;
 function send(label,ixs,signers=[members[0]],success=true){
  svm.expireBlockhash();const tx=new VersionedTransaction(new TransactionMessage({payerKey:signers[0].publicKey,recentBlockhash:svm.latestBlockhash(),instructions:[ComputeBudgetProgram.setComputeUnitLimit({units:1400000}),...ixs]}).compileToV0Message());tx.sign(signers);
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
 const config=m.deriveConfigAddress(bn(102));send('issue SYNTHETIC config bound to vault',[await amm._program.methods.createDynamicConfig(bn(102),{poolCreatorAuthority:vault,permission:bn(0)}).accountsPartial({config,operator,signer:operatorKey.publicKey,payer:operatorKey.publicKey,systemProgram:SystemProgram.programId}).instruction()],[operatorKey]);
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
 for(let j=0;j<1;j++){
  const leg=g.legs[j],index=BigInt(j+1),transaction=sq.getTransactionPda({multisigPda:multisig,index})[0],proposal=sq.getProposalPda({multisigPda:multisig,transactionIndex:index})[0],nft=sq.getEphemeralSignerPda({transactionPda:transaction,ephemeralSignerIndex:0})[0];
  const params={payer:vault,creator:vault,positionNft:nft,tokenAMint:mint.publicKey,tokenBMint:spl.NATIVE_MINT,tokenAProgram:spl.TOKEN_PROGRAM_ID,tokenBProgram:spl.TOKEN_PROGRAM_ID,tokenAAmount:bn(leg.budgetA),tokenBAmount:bn(leg.budgetB),sqrtMinPrice:bn(leg.sqrtMin),sqrtMaxPrice:bn(leg.sqrtMax),initSqrtPrice:bn(leg.sqrtInitial),liquidityDelta:bn(leg.liquidityU128),poolFees:fees,hasAlphaVault:false,activationType:1,collectFeeMode:1,activationPoint:bn(activationAt),isLockLiquidity:false};
  const built=j===0?await amm.createCustomPool(params):await amm.createCustomPoolWithDynamicConfig({...params,config,poolCreatorAuthority:vault});
  const message=new TransactionMessage({payerKey:vault,recentBlockhash:svm.latestBlockhash(),instructions:built.tx.instructions});
  const stored=sq.utils.transactionMessageToMultisigTransactionMessageBytes({message,vaultPda:vault});
  const [decodedMessage]=sq.types.transactionMessageBeet.deserialize(Buffer.from(stored)),innerSigners=decodedMessage.accountKeys.slice(0,decodedMessage.numSigners).map(p=>p.toBase58()).sort();assert.deepEqual(innerSigners,[vault.toBase58(),nft.toBase58()].sort());
  const nftAccount=m.derivePositionNftAccount(nft),aVault=m.deriveTokenVaultAddress(mint.publicKey,built.pool),bVault=m.deriveTokenVaultAddress(spl.NATIVE_MINT,built.pool);
  const tracked=[vault,payerAta,wsolAta,config,proposal,transaction,built.pool,built.position,nft,nftAccount,aVault,bVault,...legs.flatMap(l=>[new PublicKey(l.pool),new PublicKey(l.position)])];
  const snap=()=>tracked.map(p=>{const a=acct(p);return a?{key:p.toBase58(),lamports:String(a.lamports),owner:a.programAddress,sha256:hash(a.data)}:{key:p.toBase58(),exists:false};});
  send(leg.name+' store exact message',[sq.instructions.vaultTransactionCreate({multisigPda:multisig,transactionIndex:index,creator:members[0].publicKey,vaultIndex:0,ephemeralSigners:1,transactionMessage:message})]);
  const nativeStored=sq.accounts.VaultTransaction.fromAccountInfo({data:Buffer.from(acct(transaction).data)})[0],nativeMessage=storedMessageBytes(nativeStored.message);assert.equal(hash(nativeMessage),hash(stored));assert.equal(nativeStored.ephemeralSignerBumps.length,1);
  send(leg.name+' create proposal',[sq.instructions.proposalCreate({multisigPda:multisig,creator:members[0].publicKey,transactionIndex:index,isDraft:false})]);
  const execute=(await sq.instructions.vaultTransactionExecute({connection,multisigPda:multisig,transactionIndex:index,member:members[0].publicKey})).instruction;
  function reject(label,pattern){const before=snap(),feeBefore=acct(members[0].publicKey).lamports;const t=send(leg.name+' '+label,[execute],[members[0]],false);assert.match(t.logs.join('\n')+' '+t.error,pattern);assert.deepEqual(snap(),before);assert.equal(acct(members[0].publicKey).lamports,feeBefore-5000n);t.rollbackBeforeSHA256=hash(Buffer.from(JSON.stringify(before)));t.rollbackAfterSHA256=hash(Buffer.from(JSON.stringify(snap())));t.trackedAccounts=tracked.length;t.rollback='ALL_TRACKED_ACCOUNTS_UNCHANGED_FEE_PAYER_EXCLUDED';}
  send(leg.name+' approve1',[sq.instructions.proposalApprove({multisigPda:multisig,transactionIndex:index,member:members[0].publicKey})]);
  reject('reject one approval',/InvalidProposalStatus/);
  send(leg.name+' approve2',[sq.instructions.proposalApprove({multisigPda:multisig,transactionIndex:index,member:members[1].publicKey})],[members[1]]);
  reject('reject before12h',/TimeLockNotReleased/);
  const approvedAt=bi(sq.accounts.Proposal.fromAccountInfo({data:Buffer.from(acct(proposal).data)})[0].status.timestamp);
  const clock=svm.getClock();clock.unixTimestamp+=43201n;svm.setClock(clock);
  if(j===0){
   const saved=acct(payerAta),empty=Buffer.from(saved.data);empty.writeBigUInt64LE(0n,64);svm.setAccount({...saved,data:new Uint8Array(empty)});reject('reject missing700M inventory',/insufficient funds/i);svm.setAccount(saved);
  }else{
   const saved=acct(config);
   set(config,await amm._program.coder.accounts.encode('config',{...configState,poolCreatorAuthority:members[2].publicKey}),amm._program.programId,saved.lamports);reject('reject wrong config authority',/ConstraintHasOne/);svm.setAccount(saved);
   set(config,await amm._program.coder.accounts.encode('config',{...configState,configType:0}),amm._program.programId,saved.lamports);reject('reject static config type',/InvalidConfigType/);svm.setAccount(saved);
   const savedTransaction=acct(transaction),decoded=sq.accounts.VaultTransaction.fromAccountInfo({data:Buffer.from(savedTransaction.data)})[0],noEphemeral=sq.accounts.VaultTransaction.fromArgs({...decoded,ephemeralSignerBumps:new Uint8Array()}).serialize()[0];
   set(transaction,Buffer.concat([noEphemeral,Buffer.alloc(savedTransaction.data.length-noEphemeral.length)]),sq.PROGRAM_ID,savedTransaction.lamports);reject('reject missing ephemeral NFT signer',/InvalidAccount/);svm.setAccount(savedTransaction);
   const savedVault=acct(vault);svm.setAccount({...savedVault,lamports:1000000n});reject('reject insufficient vault SOL',/insufficient lamports|insufficient funds|InsufficientFunds/i);svm.setAccount(savedVault);
  }
  const before=snap(),beforeBase=amount(payerAta),beforeLamports=acct(vault).lamports,companionHash=j?hash(acct(new PublicKey(legs[0].pool)).data):null;
  const execution=send(leg.name+' execute Squads->Meteora',[execute]);
  assert.equal(sq.accounts.Proposal.fromAccountInfo({data:Buffer.from(acct(proposal).data)})[0].status.__kind,'Executed');
  const state=amm._program.coder.accounts.decode('pool',Buffer.from(acct(built.pool).data)),position=amm._program.coder.accounts.decode('position',Buffer.from(acct(built.position).data)),nftState=spl.AccountLayout.decode(Buffer.from(acct(nftAccount).data));
  assert(state.sqrtMinPrice.eq(bn(leg.sqrtMin))&&state.sqrtMaxPrice.eq(bn(leg.sqrtMax))&&state.sqrtPrice.eq(bn(leg.sqrtInitial))&&state.liquidity.eq(bn(leg.liquidityU128)));
  assert(nftState.owner.equals(vault));assert.equal(nftState.amount,1n);assert.equal(acct(nftAccount).programAddress,spl.TOKEN_2022_PROGRAM_ID.toBase58());assert(position.nftMint.equals(nft));assert(state.creator.equals(vault));
  assert.equal(bi(state.tokenAAmount),BigInt(leg.amountAUp));assert.equal(bi(state.tokenBAmount),BigInt(leg.amountBUp));assert.equal(beforeBase-amount(payerAta),BigInt(leg.amountAUp));assert.equal(amount(wsolAta),0n);
  const newlyCreated=tracked.filter((p,i)=>before[i].exists===false).map(p=>{const a=acct(p);assert(a);return{key:p.toBase58(),lamports:String(a.lamports),bytes:a.data.length,owner:a.programAddress};});
  const debit=beforeLamports-acct(vault).lamports;assert.equal(debit,newlyCreated.reduce((v,a)=>v+BigInt(a.lamports),0n));
  if(j)assert.equal(hash(acct(new PublicKey(legs[0].pool)).data),companionHash);
  const feeData=Buffer.from(state.poolFees.baseFee.baseFeeInfo.data);assert.equal(feeData.readBigUInt64LE(0),2500004n);assert.equal(feeData.subarray(8).some(x=>x!==0),false);assert.equal(state.poolFees.protocolFeePercent,20);assert.equal(state.poolFees.compoundingFeeBps,0);assert.equal(state.poolFees.dynamicFee.initialized,0);assert.equal(state.collectFeeMode,1);assert.equal(state.activationType,1);assert(state.whitelistedVault.equals(PublicKey.default));
  const nftMint=spl.MintLayout.decode(Buffer.from(acct(nft).data));assert.equal(nftMint.supply,1n);assert.equal(nftMint.decimals,0);
  legs.push({name:leg.name,index:String(index),pool:built.pool.toBase58(),position:built.position.toBase58(),positionNft:nft.toBase58(),nftOwner:nftState.owner.toBase58(),proposal:proposal.toBase58(),proposalStatus:'Executed',ephemeralSigners:1,innerSigners,storedMessageSHA256:hash(stored),poolCreator:state.creator.toBase58(),sqrtMin:state.sqrtMinPrice.toString(),sqrtMax:state.sqrtMaxPrice.toString(),sqrtInitial:state.sqrtPrice.toString(),liquidity:state.liquidity.toString(),principalA:state.tokenAAmount.toString(),principalB:state.tokenBAmount.toString(),vaultA:String(amount(aVault)),vaultB:String(amount(bVault)),vaultLamportDebit:String(debit),createdAccounts:newlyCreated,payerBaseDebit:String(beforeBase-amount(payerAta)),WSOLResidual:String(amount(wsolAta)),executionCU:execution.computeUnits,executionBytes:execution.bytes,companionUnchanged:j?true:null,feeNumerator:'2500004',protocolPercent:20,collectFeeMode:1,dynamicFee:0,compoundingFeeBps:0});
  reject('reject executed replay',/InvalidProposalStatus/);
  const executedAt=bi(sq.accounts.Proposal.fromAccountInfo({data:Buffer.from(acct(proposal).data)})[0].status.timestamp);assert.equal(executedAt-approvedAt,43201n);
  Object.assign(legs[legs.length-1],{nativeStoredMessageSHA256:hash(nativeMessage),approvedAt:String(approvedAt),executedAt:String(executedAt),timelockElapsedSeconds:String(executedAt-approvedAt)});
  assert.equal(bi(state.activationPoint),activationAt);assert(executedAt<activationAt);legs[legs.length-1].activationAt=state.activationPoint.toString();
  if(j===0)await inactiveProbe(legs[0],false);
 }

 const upper=legs[0],poolKey=new PublicKey(upper.pool),positionKey=new PublicKey(upper.position),nftAccount=m.derivePositionNftAccount(new PublicKey(upper.positionNft));
 const readPool=()=>amm._program.coder.accounts.decode('pool',Buffer.from(acct(poolKey).data)),readPosition=()=>amm._program.coder.accounts.decode('position',Buffer.from(acct(positionKey).data));
 const initial=readPool(),ip=readPosition(),now=svm.getClock().unixTimestamp;
 const floorA=m.getAmountAFromLiquidityDelta(initial.sqrtPrice,initial.sqrtMaxPrice,ip.unlockedLiquidity,m.Rounding.Down,initial.collectFeeMode);
 assert(floorA.gtn(0));assert.equal(bi(initial.tokenBAmount),0n);
 const idlInstructions=amm._program.idl.instructions.map(i=>i.name);assert(!idlInstructions.some(n=>/activation/i.test(n)));
 const statusIx=await amm._program.methods.setPoolStatus(1).accountsPartial({pool:poolKey,operator:m.deriveOperatorAddress(vault),signer:vault}).instruction();
 assert.equal(acct(m.deriveOperatorAddress(vault)),null);
 let seq=1n;
 async function propose(label,ixs,ephemeralSigners=0){
  const index=++seq,transaction=sq.getTransactionPda({multisigPda:multisig,index})[0],proposal=sq.getProposalPda({multisigPda:multisig,transactionIndex:index})[0];
  const message=new TransactionMessage({payerKey:vault,recentBlockhash:svm.latestBlockhash(),instructions:ixs}),expected=sq.utils.transactionMessageToMultisigTransactionMessageBytes({message,vaultPda:vault});
  send(label+' store',[sq.instructions.vaultTransactionCreate({multisigPda:multisig,transactionIndex:index,creator:members[0].publicKey,vaultIndex:0,ephemeralSigners,transactionMessage:message})]);
  const stored=sq.accounts.VaultTransaction.fromAccountInfo({data:Buffer.from(acct(transaction).data)})[0];assert.equal(hash(storedMessageBytes(stored.message)),hash(expected));
  send(label+' proposal',[sq.instructions.proposalCreate({multisigPda:multisig,creator:members[0].publicKey,transactionIndex:index,isDraft:false})]);
  for(const k of members.slice(0,2))send(label+' approve '+k.publicKey.toBase58(),[sq.instructions.proposalApprove({multisigPda:multisig,transactionIndex:index,member:k.publicKey})],[k]);
  const status=()=>sq.accounts.Proposal.fromAccountInfo({data:Buffer.from(acct(proposal).data)})[0].status;
  const approvedAt=bi(status().timestamp),execute=(await sq.instructions.vaultTransactionExecute({connection,multisigPda:multisig,transactionIndex:index,member:members[0].publicKey})).instruction;
  return{index,proposal,status,approvedAt,execute,messageSHA256:hash(expected),storedMessageSHA256:hash(storedMessageBytes(stored.message))};
 }
 const lowerLeg=g.legs[1],lowerNft=sq.getEphemeralSignerPda({transactionPda:sq.getTransactionPda({multisigPda:multisig,index:2n})[0],ephemeralSignerIndex:0})[0];
 const lb=await amm.createCustomPoolWithDynamicConfig({payer:vault,creator:vault,positionNft:lowerNft,tokenAMint:mint.publicKey,tokenBMint:spl.NATIVE_MINT,tokenAProgram:spl.TOKEN_PROGRAM_ID,tokenBProgram:spl.TOKEN_PROGRAM_ID,tokenAAmount:bn(lowerLeg.budgetA),tokenBAmount:bn(lowerLeg.budgetB),sqrtMinPrice:bn(lowerLeg.sqrtMin),sqrtMaxPrice:bn(lowerLeg.sqrtMax),initSqrtPrice:bn(lowerLeg.sqrtInitial),liquidityDelta:bn(lowerLeg.liquidityU128),poolFees:fees,hasAlphaVault:false,activationType:1,collectFeeMode:1,activationPoint:bn(activationAt),isLockLiquidity:false,config,poolCreatorAuthority:vault});
 const lower=await propose('LOWER pending',lb.tx.instructions,1),beforeCancel=hash(acct(poolKey).data);
 for(const k of members.slice(0,2))send('cancel pending LOWER',[sq.instructions.proposalCancelV2({multisigPda:multisig,transactionIndex:lower.index,member:k.publicKey})],[k]);
 assert.equal(lower.status().__kind,'Cancelled');assert.equal(acct(lb.pool),null);assert.equal(hash(acct(poolKey).data),beforeCancel);
 const args={owner:vault,pool:poolKey,position:positionKey,positionNftAccount:nftAccount,tokenAMint:mint.publicKey,tokenBMint:spl.NATIVE_MINT,tokenAVault:initial.tokenAVault,tokenBVault:initial.tokenBVault,tokenAProgram:spl.TOKEN_PROGRAM_ID,tokenBProgram:spl.TOKEN_PROGRAM_ID,vestings:[],currentPoint:bn(now),tokenAAmountThreshold:floorA,tokenBAmountThreshold:bn(0)};
 const abort=await propose('withdraw UPPER floor',(await amm.removeAllLiquidity(args)).instructions),stop=await propose('disable without operator',[statusIx]);
 const track=[vault,payerAta,wsolAta,poolKey,positionKey,nftAccount,initial.tokenAVault,initial.tokenBVault,abort.proposal,stop.proposal,lower.proposal];
 const snap=()=>track.map(p=>{const a=acct(p);return a?{key:p.toBase58(),sha256:hash(a.data),lamports:String(a.lamports),owner:a.programAddress}:{key:p.toBase58(),exists:false};});
 function rejected(label,ix,pattern){
  const before=snap(),payerBefore=acct(members[0].publicKey).lamports,t=send(label,[ix],[members[0]],false);
  assert.match(t.logs.join('\n')+' '+t.error,pattern);assert.deepEqual(snap(),before);assert.equal(acct(members[0].publicKey).lamports,payerBefore-5000n);
  t.rollbackBeforeSHA256=hash(Buffer.from(JSON.stringify(before)));t.rollbackAfterSHA256=hash(Buffer.from(JSON.stringify(snap())));
 }
 const readyAt=abort.approvedAt+43200n,setTime=t=>{const c=svm.getClock();c.unixTimestamp=t;svm.setClock(c);};
 rejected('abort before timelock',abort.execute,/TimeLockNotReleased/);
 setTime(g.mode==='on-time'?readyAt-1n:activationAt-1n);rejected('abort last second before available',abort.execute,/TimeLockNotReleased/);
 async function buy(label,success=true,min=0){
  const s=readPool(),k=members[2],tx=await amm.swap2({pool:poolKey,tokenAMint:mint.publicKey,tokenBMint:spl.NATIVE_MINT,tokenAVault:s.tokenAVault,tokenBVault:s.tokenBVault,tokenAProgram:spl.TOKEN_PROGRAM_ID,tokenBProgram:spl.TOKEN_PROGRAM_ID,payer:k.publicKey,inputTokenMint:spl.NATIVE_MINT,outputTokenMint:mint.publicKey,poolState:s,referralTokenAccount:null,swapMode:m.SwapMode.ExactIn,amountIn:bn(1000000000),minimumAmountOut:bn(min)});
  const before=snap(),payerBefore=acct(k.publicKey).lamports,t=send(label,tx.instructions,[k],success);
  if(!success){assert.deepEqual(snap(),before);assert.equal(acct(k.publicKey).lamports,payerBefore-5000n);t.rollbackBeforeSHA256=hash(Buffer.from(JSON.stringify(before)));t.rollbackAfterSHA256=hash(Buffer.from(JSON.stringify(snap())));}
  return t;
 }
 let exposedTrade=null;
 if(g.mode==='late-trade'){setTime(activationAt);const t=await buy('UPPER trades at T0 with LOWER absent');exposedTrade={success:true,at:String(activationAt),computeUnits:t.computeUnits};assert(readPool().sqrtPrice.gt(initial.sqrtPrice));}
 setTime(readyAt);rejected('creator cannot disable without operator',stop.execute,/AccountOwnedByWrongProgram/);assert.equal(stop.status().__kind,'Approved');
 let preActivationWithdrawalRejected=false;
 if(g.mode==='on-time'){rejected('mature abort rejected before T0',abort.execute,/PoolDisabled/);preActivationWithdrawalRejected=true;assert.equal(abort.status().__kind,'Approved');setTime(activationAt);}
 const balanceBefore=amount(payerAta),solBefore=acct(vault).lamports,priorWSOLRent=acct(wsolAta)?.lamports||0n;let withdrawal=null;
 if(g.mode==='late-trade'){
  rejected('stale abort floor after public buy',abort.execute,/ExceededSlippage/);
  assert.equal(abort.status().__kind,'Approved');assert(readPosition().unlockedLiquidity.eq(ip.unlockedLiquidity));
 }else{
  const t=send('execute full UPPER withdrawal via Squads',[abort.execute]);
  assert.equal(abort.status().__kind,'Executed');assert(readPosition().unlockedLiquidity.isZero());assert(readPool().liquidity.isZero());
  assert.equal(amount(payerAta)-balanceBefore,bi(floorA));assert.equal(acct(vault).lamports-solBefore,priorWSOLRent);assert.equal(bi(readPool().activationPoint),activationAt);
  assert(spl.AccountLayout.decode(Buffer.from(acct(nftAccount).data)).owner.equals(vault));
  withdrawal={at:String(svm.getClock().unixTimestamp),returnedA:String(amount(payerAta)-balanceBefore),returnedSOL:String(acct(vault).lamports-solBefore),priorWSOLRent:String(priorWSOLRent),poolLiquidity:readPool().liquidity.toString(),positionLiquidity:readPosition().unlockedLiquidity.toString(),computeUnits:t.computeUnits,bytes:t.bytes};
  setTime(activationAt>readyAt?activationAt:readyAt);const f=await buy('public buy rejected after withdrawal',false,1);withdrawal.postWithdrawalBuyError=f.error;
 }
 return{id:g.id,mode:g.mode,threshold:2,timeLockSeconds:43200,lowerAbsent:true,lowerProposalStatus:lower.status().__kind,cancellationDidNotChangeUpper:true,activationAt:String(activationAt),abortApprovedAt:String(abort.approvedAt),abortReadyAt:String(readyAt),secondsBetweenReadyAndT0:String(activationAt-readyAt),preActivationWithdrawalRejected,activationInstructionAbsent:true,idlInstructions,operatorAuthorizationAvailable:false,statusProposal:stop.status().__kind,abortProposal:abort.status().__kind,abortMessageSHA256:abort.messageSHA256,abortNativeMessageSHA256:abort.storedMessageSHA256,initialUpper:upper,initialPositionLiquidity:ip.unlockedLiquidity.toString(),initialPoolLiquidity:initial.liquidity.toString(),sqrtInitial:initial.sqrtPrice.toString(),sqrtMax:initial.sqrtMaxPrice.toString(),floorA:floorA.toString(),withdrawal,exposedTrade,transactions};
}
(async()=>{try{for(const g of geometry.rows.filter(x=>x.id.endsWith('_current'))){for(const mode of ['on-time','late-no-trade','late-trade']){const c=await run({...g,id:g.id+'_'+mode,mode});out.cases.push(c);console.log('ACTIVATION BOUNDARY PASS',c.id,c.transactions.length);}}}catch(e){out.status='FAILED';out.error={message:e.message,native:e.native||null,stack:e.stack};fs.writeFileSync(path.join(root,'v29-activation-result.json'),JSON.stringify(out,null,2)+'\n');throw e;}out.status='LOCAL_ACTIVATION_BOUNDARY_PASS_PRODUCTION_PROCEDURE_OPEN';fs.writeFileSync(path.join(root,'v29-activation-result.json'),JSON.stringify(out,null,2)+'\n');console.log(out.status,out.cases.length,out.localTransactions);})().catch(e=>{console.error(e);process.exitCode=1;});
