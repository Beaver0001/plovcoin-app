'use strict';
// Synthetic local execution of pinned Meteora/SPL binaries. No network client.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {LiteSVM,FailedTransactionMetadata,Clock}=require('litesvm');
const {getTransactionDecoder}=require('@solana/kit');
const {PublicKey,Keypair,Connection,TransactionMessage,VersionedTransaction,SystemProgram,ComputeBudgetProgram}=require('@solana/web3.js');
const spl=require('@solana/spl-token'),m=require('@meteora-ag/cp-amm-sdk'),BN=require('bn.js');
const dir=process.argv[2];if(!dir)throw Error('Provide existing pinned local fixture directory; no automatic download');
const root=__dirname,fixture=path.resolve(dir),pins=JSON.parse(fs.readFileSync(path.join(fixture,'..','program-pins.json'))),expectedPins=JSON.parse(fs.readFileSync(path.join(root,'program-pins-v90.json')));
const hash=b=>createHash('sha256').update(b).digest('hex'),bn=x=>new BN(x.toString()),bi=x=>BigInt(x.toString());
const paths=JSON.parse(fs.readFileSync(path.join(root,'v29-path-input.json'))),geom=JSON.parse(fs.readFileSync(path.join(root,'v29-geometry-result.json'))),input=JSON.parse(fs.readFileSync(path.join(root,'v29-geometry-input.json')));
assert.deepEqual(pins.programs,expectedPins.programs);assert.equal(pins.programs.length,5);
const programs=pins.programs.map(p=>{const bytes=fs.readFileSync(path.join(fixture,p.name+'.so'));assert.equal(hash(bytes),p.elfSha256);return{...p,bytes};});
function frac(s){const[a,b='1']=s.split('/');return[BigInt(a),BigInt(b)];}
function floorAtoms(s){const[a,b]=frac(s);return a*1000000000n/b;}
const result={version:101,status:'RUNNING',programPins:pins,sourcePathsSHA256:hash(fs.readFileSync(path.join(root,'v29-path-input.json'))),geometryResultSHA256:hash(fs.readFileSync(path.join(root,'v29-geometry-result.json'))),cases:[],localTransactions:0,localFundingAirdrops:0,networkRequests:0,networkSends:0,realWalletPrompts:0,Wave1Inputs:null,MAINNET_GO:'NO',limitations:['All keys, accounts, Operator permission, mint and funding are synthetic; direct local signers, not a new Squads integration test.','Meteora/SPL ELF are retained v90 reads, not new chain snapshots or independent source/build parity.','Local VM clock/features/fees do not establish mainnet execution, real config or launch readiness.']};
async function run(c){
 const g=geom.rows.find(r=>r.id===c.geometryId),inp=input.cases.find(r=>r.id===c.geometryId);assert(g&&inp);
 const key=n=>Keypair.fromSeed(createHash('sha256').update('PLOV_V101_LOCAL_ONLY:'+c.geometryId+':'+n).digest());
 const payer=key('payer'),trader=key('trader'),mint=key('mint'),operator=key('operator');
 const svm=new LiteSVM();for(const p of programs)svm.addProgramWithLoader(p.program,p.bytes,p.loader);
 const baseTime=1800000000n;svm.setClock(new Clock(1000n,0n,0n,0n,baseTime));
 const amm=new m.CpAmm(new Connection('http://127.0.0.1:1',{fetch:async()=>{throw Error('Network forbidden');}}));
 const acct=p=>{const a=svm.getAccount(p.toBase58());return a.exists?a:null;};
 const set=(p,data,owner,lamports=100000000n)=>svm.setAccount({address:p.toBase58(),data:new Uint8Array(data),programAddress:owner.toBase58(),lamports,executable:false,space:BigInt(data.length)});
 const amount=p=>acct(p)?spl.AccountLayout.decode(Buffer.from(acct(p).data)).amount:0n;
 const transactions=[],swaps=[],events=[],initializations=[];
 function send(label,ixs,signers=[payer],expect=true){
  svm.expireBlockhash();const tx=new VersionedTransaction(new TransactionMessage({payerKey:signers[0].publicKey,recentBlockhash:svm.latestBlockhash(),instructions:[ComputeBudgetProgram.setComputeUnitLimit({units:1400000}),...ixs]}).compileToV0Message());tx.sign(signers);
  const res=svm.sendTransaction(getTransactionDecoder().decode(tx.serialize())),failed=res instanceof FailedTransactionMetadata,meta=failed?res.meta():res;
  const row={label,success:!failed,error:failed?res.err().toString():null,logs:meta.logs(),computeUnits:String(meta.computeUnitsConsumed()),bytes:tx.serialize().length};transactions.push(row);result.localTransactions++;
  if(failed===expect)throw Object.assign(Error(label+' unexpected native result '+row.error),{native:row});
  return row;
 }
 for(const k of[payer,trader,operator]){const funded=svm.airdrop(k.publicKey.toBase58(),100000000000000n);assert(!(funded instanceof FailedTransactionMetadata),'Local synthetic funding must succeed');assert.equal(acct(k.publicKey).lamports,100000000000000n);result.localFundingAirdrops++;}
 const native=Buffer.alloc(spl.MINT_SIZE);spl.MintLayout.encode({mintAuthorityOption:0,mintAuthority:PublicKey.default,supply:0n,decimals:9,isInitialized:true,freezeAuthorityOption:0,freezeAuthority:PublicKey.default},native);set(spl.NATIVE_MINT,native,spl.TOKEN_PROGRAM_ID,1461600n);
 const opPda=m.deriveOperatorAddress(operator.publicKey);set(opPda,await amm._program.coder.accounts.encode('operator',{whitelistedAddress:operator.publicKey,permission:bn(1),padding:[bn(0),bn(0)]}),amm._program.programId);
 const config=m.deriveConfigAddress(bn(101));
 send('issue SYNTHETIC dynamic config',[await amm._program.methods.createDynamicConfig(bn(101),{poolCreatorAuthority:payer.publicKey,permission:bn(0)}).accountsPartial({config,operator:opPda,signer:operator.publicKey,payer:operator.publicKey,systemProgram:SystemProgram.programId}).instruction()],[operator]);
 const payerAta=spl.getAssociatedTokenAddressSync(mint.publicKey,payer.publicKey),traderAta=spl.getAssociatedTokenAddressSync(mint.publicKey,trader.publicKey);
 send('prepare SYNTHETIC mint/base/claims',[SystemProgram.createAccount({fromPubkey:payer.publicKey,newAccountPubkey:mint.publicKey,space:spl.MINT_SIZE,lamports:1461600,programId:spl.TOKEN_PROGRAM_ID}),spl.createInitializeMint2Instruction(mint.publicKey,9,payer.publicKey,null),spl.createAssociatedTokenAccountIdempotentInstruction(payer.publicKey,payerAta,payer.publicKey,mint.publicKey),spl.createAssociatedTokenAccountIdempotentInstruction(payer.publicKey,traderAta,trader.publicKey,mint.publicKey),spl.createMintToInstruction(mint.publicKey,payerAta,payer.publicKey,700000000n*1000000000n),spl.createMintToInstruction(mint.publicKey,traderAta,payer.publicKey,floorAtoms(paths.totalClaimsPLOV))],[payer,mint]);
 const fees={baseFee:{data:Array.from(m.encodeFeeTimeSchedulerParams(bn(2500004),0,bn(0),bn(0),0))},compoundingFeeBps:0,padding:0,dynamicFee:null};
 const pools=[];
 for(const leg of g.legs){
  const nft=key(leg.name+'-nft'),params={payer:payer.publicKey,creator:payer.publicKey,positionNft:nft.publicKey,tokenAMint:mint.publicKey,tokenBMint:spl.NATIVE_MINT,tokenAProgram:spl.TOKEN_PROGRAM_ID,tokenBProgram:spl.TOKEN_PROGRAM_ID,tokenAAmount:bn(leg.budgetA),tokenBAmount:bn(leg.budgetB),sqrtMinPrice:bn(leg.sqrtMin),sqrtMaxPrice:bn(leg.sqrtMax),initSqrtPrice:bn(leg.sqrtInitial),liquidityDelta:bn(leg.liquidityU128),poolFees:fees,hasAlphaVault:false,activationType:1,collectFeeMode:1,activationPoint:null,isLockLiquidity:false};
  const built=leg.name==='UPPER'?await amm.createCustomPool(params):await amm.createCustomPoolWithDynamicConfig({...params,config,poolCreatorAuthority:payer.publicKey});
  send('initialize '+leg.name,built.tx.instructions,[payer,nft]);
  const p={name:leg.name,...built,principalB:BigInt(leg.amountBUp),lpFees:0n,protocol:0n};
  p.read=()=>amm._program.coder.accounts.decode('pool',Buffer.from(acct(p.pool).data));
  const state=p.read();assert(state.sqrtPrice.eq(bn(leg.sqrtInitial)));assert(state.liquidity.eq(bn(leg.liquidityU128)));
  const vaultB=amount(state.tokenBVault);p.vaultBSurplus=vaultB-p.principalB;
  assert.equal(amount(state.tokenAVault),BigInt(leg.amountAUp));assert.equal(bi(state.tokenBAmount),p.principalB);assert.equal(p.vaultBSurplus,leg.name==='UPPER'?1n:0n);
  const wsolState=spl.AccountLayout.decode(Buffer.from(acct(state.tokenBVault).data));assert.equal(acct(state.tokenBVault).lamports-wsolState.isNative,vaultB);
  initializations.push({leg:leg.name,principalA:state.tokenAAmount.toString(),principalB:state.tokenBAmount.toString(),vaultA:String(amount(state.tokenAVault)),vaultB:String(vaultB),vaultBSurplusExcludedFromPrincipal:String(p.vaultBSurplus),vaultBLamports:String(acct(state.tokenBVault).lamports),nativeRentReserve:String(wsolState.isNative),payerWSOLAfter:String(amount(spl.getAssociatedTokenAddressSync(spl.NATIVE_MINT,payer.publicKey)))});pools.push(p);
 }
 assert(!pools[0].pool.equals(pools[1].pool));
 const upper=pools[0],lower=pools[1],seed=BigInt(g.seedSOLAtomsBudgetFloor),A0=700000000n*1000000000n;
 let demand=0n,cash=0n,pending=0n,negativeDone=false;
 function snapshot(){
  let A=0n,B=0n,fee=0n,protocol=0n;const legs=[];
  for(const p of pools){const s=p.read();const va=amount(s.tokenAVault),vb=amount(s.tokenBVault);assert.equal(vb,p.principalB+p.lpFees+p.protocol+p.vaultBSurplus);assert.equal(bi(s.protocolBFee),p.protocol);assert.equal(bi(s.tokenBAmount),p.principalB);assert.equal(bi(s.tokenAAmount),va);assert(s.protocolAFee.isZero());
   const curveA=bi(m.getAmountAFromLiquidityDeltaForConcentratedLiquidity(s.sqrtPrice,s.sqrtMaxPrice,s.liquidity,1)),curveB=bi(m.getAmountBFromLiquidityDeltaForConcentratedLiquidity(s.sqrtMinPrice,s.sqrtPrice,s.liquidity,1));
   const position=amm._program.coder.accounts.decode('position',Buffer.from(acct(p.position).data)),claimable=m.getUnClaimLpFee(s,position);assert(claimable.feeTokenA.isZero());assert(bi(claimable.feeTokenB)<=p.lpFees);
   A+=va;B+=p.principalB;fee+=p.lpFees;protocol+=p.protocol;legs.push({name:p.name,sqrtPrice:s.sqrtPrice.toString(),sqrtMin:s.sqrtMinPrice.toString(),sqrtMax:s.sqrtMaxPrice.toString(),liquidity:s.liquidity.toString(),vaultA:String(va),vaultB:String(vb),principalB:String(p.principalB),lpFees:String(p.lpFees),claimableLPFeeB:claimable.feeTokenB.toString(),protocol:String(p.protocol),vaultBSurplusExcluded:String(p.vaultBSurplus),curveA:String(curveA),curveB:String(curveB)});
  }
  assert.equal(seed+demand,B+fee+protocol+cash);
  const active=upper.read().sqrtPrice.gt(bn(g.sqrtQ64.start))?upper:lower;
  return{poolAAtoms:String(A),principalBLamports:String(B),lpFeeLamports:String(fee),protocolLamports:String(protocol),demandLamports:String(demand),cashLamports:String(cash),activeSqrtPrice:active.read().sqrtPrice.toString(),pricePool:active.name,legs};
 }
 async function swap(label,p,sell,mode,requested){
  const s=p.read(),inputMint=sell?mint.publicKey:spl.NATIVE_MINT,outputMint=sell?spl.NATIVE_MINT:mint.publicKey;
  const quoteArgs={inputTokenMint:inputMint,slippage:0,currentPoint:bn(svm.getClock().unixTimestamp),poolState:s,tokenADecimal:9,tokenBDecimal:9,hasReferral:false,swapMode:mode,...(mode===m.SwapMode.ExactOut?{amountOut:bn(requested)}:{amountIn:bn(requested)})};
  const q=amm.getQuote2(quoteArgs);assert(q.outputAmount.gtn(0));
  const buildParams={pool:p.pool,tokenAMint:s.tokenAMint,tokenBMint:s.tokenBMint,tokenAVault:s.tokenAVault,tokenBVault:s.tokenBVault,tokenAProgram:spl.TOKEN_PROGRAM_ID,tokenBProgram:spl.TOKEN_PROGRAM_ID,payer:trader.publicKey,inputTokenMint:inputMint,outputTokenMint:outputMint,poolState:s,referralTokenAccount:null,swapMode:mode,...(mode===m.SwapMode.ExactOut?{amountOut:bn(requested),maximumAmountIn:q.includedFeeInputAmount}:{amountIn:bn(requested),minimumAmountOut:q.outputAmount})};
  const tx=await amm.swap2(buildParams);
  if(sell&&!negativeDone){
   const monitored=[...pools.flatMap(x=>{const st=x.read();return[x.pool,x.position,st.tokenAVault,st.tokenBVault];}),traderAta,spl.getAssociatedTokenAddressSync(spl.NATIVE_MINT,trader.publicKey)];
   const snap=()=>monitored.map(key=>{const a=acct(key);return a?{key:key.toBase58(),hash:hash(a.data),lamports:String(a.lamports),owner:a.programAddress}:{key:key.toBase58(),exists:false};});
   const before=snap(),beforeFee=acct(trader.publicKey).lamports,bad=await amm.swap2({...buildParams,minimumAmountOut:q.outputAmount.addn(1)});
   const failed=send('reject minOut above exact quote',bad.instructions,[trader],false);assert.match(failed.logs.join('\n'),/ExceededSlippage/);assert.deepEqual(snap(),before);assert.equal(acct(trader.publicKey).lamports,beforeFee-5000n);
   failed.rollback='TEN_MONITORED_ACCOUNTS_UNCHANGED_FEE_PAYER_EXCLUDED';failed.rollbackBeforeSHA256=hash(Buffer.from(JSON.stringify(before)));failed.rollbackAfterSHA256=hash(Buffer.from(JSON.stringify(snap())));negativeDone=true;
  }
  const beforeA=amount(traderAta),beforeSol=acct(trader.publicKey).lamports,beforeVA=amount(s.tokenAVault),beforeVB=amount(s.tokenBVault);
  const nativeResult=send(label+' '+p.name,tx.instructions,[trader]);
  const input=bi(q.includedFeeInputAmount),output=bi(q.outputAmount),lp=bi(q.claimingFee),protocol=bi(q.protocolFee);
  const deltaA=amount(traderAta)-beforeA,deltaVA=amount(s.tokenAVault)-beforeVA,deltaVB=amount(s.tokenBVault)-beforeVB,deltaSOL=acct(trader.publicKey).lamports-beforeSol;
  assert.equal(deltaA,sell?-input:output);assert.equal(deltaVA,-deltaA);assert.equal(deltaVB,sell?-output:input);assert.equal(deltaSOL+deltaVB,-5000n);
  assert.equal(acct(spl.getAssociatedTokenAddressSync(spl.NATIVE_MINT,trader.publicKey)),null);
  assert(p.read().sqrtPrice.eq(q.nextSqrtPrice));
  p.lpFees+=lp;p.protocol+=protocol;
  if(sell){p.principalB-=output+lp+protocol;cash+=output;}else{p.principalB+=input-lp-protocol;demand+=input;}
  assert(p.principalB>=0n);
  swaps.push({label,pool:p.name,sell,mode,requested:String(requested),input:String(input),output:String(output),lpFee:String(lp),protocolFee:String(protocol),excludedFeeInput:q.excludedFeeInputAmount.toString(),sqrtBefore:s.sqrtPrice.toString(),sqrtMin:s.sqrtMinPrice.toString(),sqrtMax:s.sqrtMaxPrice.toString(),liquidity:s.liquidity.toString(),nextSqrtPrice:q.nextSqrtPrice.toString(),deltaTraderA:String(deltaA),deltaVaultA:String(deltaVA),deltaVaultB:String(deltaVB),deltaTraderSOL:String(deltaSOL),baseFeeLamports:'5000',computeUnits:nativeResult.computeUnits});
  return{input,output};
 }
 async function buy(label,amountOut){
  let left=amountOut;if(left===0n)return;
  const l=lower.read();
  if(l.sqrtPrice.lt(l.sqrtMaxPrice)){
   const cap=bi(m.getAmountAFromLiquidityDeltaForConcentratedLiquidity(l.sqrtPrice,l.sqrtMaxPrice,l.liquidity,1));
   if(left<=cap){const r=await swap(label,lower,false,m.SwapMode.ExactOut,left);left-=r.output;}
   else{
    const net=m.getAmountBFromLiquidityDeltaForConcentratedLiquidity(l.sqrtPrice,l.sqrtMaxPrice,l.liquidity,0),max=m.getIncludedFeeAmount(bn(2500004),net).includedFeeAmount;
    const r=await swap(label+' boundary',lower,false,m.SwapMode.PartialFill,bi(max));left-=r.output;assert(lower.read().sqrtPrice.eq(l.sqrtMaxPrice));
   }
  }
  if(left>0n){const r=await swap(label,upper,false,m.SwapMode.ExactOut,left);left-=r.output;}
  assert.equal(left,0n);
 }
 async function sell(label,amountIn){
  let left=amountIn;if(left===0n)return;
  const u=upper.read();
  if(u.sqrtPrice.gt(u.sqrtMinPrice)){const r=await swap(label,upper,true,m.SwapMode.PartialFill,left);left-=r.input;}
  if(left>0n){const r=await swap(label,lower,true,m.SwapMode.ExactIn,left);left-=r.input;}
  assert.equal(left,0n);
 }
 const[knum,kden]=frac(c.k),C0=floorAtoms(paths.claim0PLOV),C=frac(paths.laterClaimPLOV),totalW=floorAtoms(paths.totalClaimsPLOV);let distributed=C0,totalBuys=0n,totalReturns=0n;
 for(let i=0;i<5;i++){
  const day=[0,14,45,90,91][i],clock=svm.getClock();clock.unixTimestamp=baseTime+BigInt(day)*86400n;svm.setClock(clock);
  const b=i<4?floorAtoms(c.buy_tokens[i]):0n;
  await buy('BUY'+i,b);totalBuys+=b;
  const pre=snapshot();let claim=0n;
  if(i===0)claim=C0;else if(i<4){const cumulative=C0+BigInt(i)*C[0]*1000000000n/C[1];claim=cumulative-distributed;distributed=cumulative;}
  const returned=pending;await sell('SELL'+i,claim+returned);totalReturns+=returned;
  const post=snapshot();pending=(kden-knum)*b/kden;
  events.push({event:['D0','D14','D45','D90','TERMINAL'][i],day,buyAtoms:String(b),claimAtoms:String(claim),returnAtoms:String(returned),preSale:pre,postSale:post});
 }
 assert.equal(distributed,totalW);assert.equal(pending,0n);
 const end=snapshot();assert.equal(BigInt(end.poolAAtoms),A0+totalW+totalReturns-totalBuys);
 const finalFeeClaims=[];
 for(const p of pools){
  const state=p.read(),position=amm._program.coder.accounts.decode('position',Buffer.from(acct(p.position).data)),claim=m.getUnClaimLpFee(state,position),nftAccount=m.derivePositionNftAccount(position.nftMint);
  const beforeVault=amount(state.tokenBVault),beforeOwner=acct(payer.publicKey).lamports,wsol=spl.getAssociatedTokenAddressSync(spl.NATIVE_MINT,payer.publicKey),priorWsolLamports=acct(wsol)?.lamports||0n;
  const tx=await amm.claimPositionFee({pool:p.pool,tokenAMint:mint.publicKey,tokenBMint:spl.NATIVE_MINT,tokenAVault:state.tokenAVault,tokenBVault:state.tokenBVault,tokenAProgram:spl.TOKEN_PROGRAM_ID,tokenBProgram:spl.TOKEN_PROGRAM_ID,owner:payer.publicKey,position:p.position,positionNftAccount:nftAccount});
  send('claim final actual LP fee '+p.name,tx.instructions,[payer]);
  const claimed=beforeVault-amount(state.tokenBVault);assert.equal(claimed,bi(claim.feeTokenB));assert.equal(acct(payer.publicKey).lamports-beforeOwner,claimed+priorWsolLamports-5000n);assert(p.read().sqrtPrice.eq(state.sqrtPrice));assert.equal(bi(p.read().tokenBAmount),p.principalB);assert.equal(acct(wsol),null);
  finalFeeClaims.push({pool:p.name,claimableBefore:claim.feeTokenB.toString(),actualClaimedB:String(claimed),priorWsolLamportsRefunded:String(priorWsolLamports),ownerLamportDelta:String(acct(payer.publicKey).lamports-beforeOwner),baseFeeLamports:'5000',principalUnchanged:true,priceUnchanged:true});
 }
 return{id:c.geometryId,controlId:c.controlId,FX_USD_per_SOL:inp.FX_USD_per_SOL,seedLamports:String(seed),totalBuyAtoms:String(totalBuys),totalReturnAtoms:String(totalReturns),distributedClaimAtoms:String(distributed),demandLamports:String(demand),cashLamports:String(cash),initializations,events,swaps,finalFeeClaims,transactions,initialization:'NATIVE_PASS',pathExecution:'NATIVE_COMPLETED_THRESHOLDS_PENDING_INDEPENDENT_REVIEW'};
}
(async()=>{
 try{for(const c of paths.cases){const row=await run(c);result.cases.push(row);console.log('NATIVE PATH COMPLETE',row.id,row.swaps.length,'swaps');}}
 catch(e){result.status='NATIVE_REPLAY_FAILED';result.error={message:e.message,native:e.native||null,stack:e.stack};fs.writeFileSync(path.join(root,'v29-native-result.json'),JSON.stringify(result,null,2)+'\n');throw e;}
 result.status='ALL_NATIVE_PATHS_COMPLETED_PENDING_THRESHOLD_REVIEW';fs.writeFileSync(path.join(root,'v29-native-result.json'),JSON.stringify(result,null,2)+'\n');console.log(result.status,result.cases.length,result.localTransactions);
})().catch(e=>{console.error(e);process.exitCode=1;});
