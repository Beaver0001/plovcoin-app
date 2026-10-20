'use strict';
// Runs only inside the synthetic local VM supplied by runtime.cjs.
const assert=require('node:assert/strict');
const {PublicKey,TransactionMessage}=require('@solana/web3.js');
const spl=require('@solana/spl-token'),sq=require('@sqds/multisig'),m=require('@meteora-ag/cp-amm-sdk'),BN=require('bn.js');
module.exports=async function(ctx){
 const {svm,account,send,amm,connection,multisig,vault,built,nft,nftAccount,members,mint,payerAta,wsolAta,hash,cases}=ctx;
 const begin=cases.length,checks=[],balances=[];
 const readPool=()=>amm._program.coder.accounts.decode('pool',Buffer.from(account(built.pool).data));
 const readPosition=()=>amm._program.coder.accounts.decode('position',Buffer.from(account(built.position).data));
 const amount=p=>account(p)?spl.AccountLayout.decode(Buffer.from(account(p).data)).amount:0n;
 const poolArgs=()=>{const p=readPool();return {pool:built.pool,tokenAMint:p.tokenAMint,tokenBMint:p.tokenBMint,tokenAVault:p.tokenAVault,tokenBVault:p.tokenBVault,tokenAProgram:spl.TOKEN_PROGRAM_ID,tokenBProgram:spl.TOKEN_PROGRAM_ID};};
 const lpArgs=()=>({...poolArgs(),owner:vault,position:built.position,positionNftAccount:nftAccount});
 const monitor=[vault,payerAta,wsolAta,built.pool,built.position,nft,nftAccount,readPool().tokenAVault,readPool().tokenBVault];
 const snap=extra=>[...monitor,...extra].map(p=>{const a=account(p);return a?{address:p.toBase58(),data:hash(a.data),lamports:String(a.lamports),owner:a.programAddress}:{address:p.toBase58(),exists:false};});
 function checkNft(){assert(spl.AccountLayout.decode(Buffer.from(account(nftAccount).data)).owner.equals(vault));assert.equal(amount(nftAccount),1n);}
 async function proposal(label,tx,failPattern=null,ephemeralSigners=0){
  const ms=sq.accounts.Multisig.fromAccountInfo({data:Buffer.from(account(multisig).data)})[0],index=BigInt(ms.transactionIndex.toString())+1n;
  send(label+' proposal tx',[sq.instructions.vaultTransactionCreate({multisigPda:multisig,transactionIndex:index,creator:members[0].publicKey,vaultIndex:0,ephemeralSigners,transactionMessage:new TransactionMessage({payerKey:vault,recentBlockhash:svm.latestBlockhash(),instructions:tx.instructions})})]);
  send(label+' proposal',[sq.instructions.proposalCreate({multisigPda:multisig,creator:members[0].publicKey,transactionIndex:index,isDraft:false})]);
  for(const k of members.slice(0,2))send(label+' vote',[sq.instructions.proposalApprove({multisigPda:multisig,transactionIndex:index,member:k.publicKey})],[k]);
  const clock=svm.getClock();clock.unixTimestamp+=43201n;svm.setClock(clock);
  const ix=(await sq.instructions.vaultTransactionExecute({connection,multisigPda:multisig,transactionIndex:index,member:members[0].publicKey})).instruction;
  const extra=[sq.getProposalPda({multisigPda:multisig,transactionIndex:index})[0],sq.getTransactionPda({multisigPda:multisig,index})[0]],before=snap(extra);
  const r=send(label+' execute',[ix],[members[0]],!failPattern);
  if(failPattern){assert.match(r.logs.join('\n')+' '+r.error,failPattern);assert.deepEqual(snap(extra),before);r.rollback='LP_STATE_AND_PROPOSAL_UNCHANGED_FEE_PAYER_EXCLUDED';}
  return r;
 }
 const p=readPool();const deposit=amm.getDepositQuote({inAmount:new BN(100000000),isTokenA:true,minSqrtPrice:p.sqrtMinPrice,maxSqrtPrice:p.sqrtMaxPrice,sqrtPrice:p.sqrtPrice,collectFeeMode:p.collectFeeMode,tokenAAmount:p.tokenAAmount,tokenBAmount:p.tokenBAmount,liquidity:p.liquidity});
 const addParams={...lpArgs(),liquidityDelta:deposit.liquidityDelta,maxAmountTokenA:deposit.consumedInputAmount,maxAmountTokenB:deposit.outputAmount,tokenAAmountThreshold:deposit.consumedInputAmount,tokenBAmountThreshold:deposit.outputAmount};
 await proposal('reject add token threshold',await amm.addLiquidity({...addParams,tokenAAmountThreshold:new BN(0)}),/ExceededSlippage/);
 const beforeAdd=readPosition().unlockedLiquidity;
 await proposal('add liquidity',await amm.addLiquidity(addParams));
 assert(readPosition().unlockedLiquidity.eq(beforeAdd.add(deposit.liquidityDelta)));checkNft();checks.push('Squads add liquidity increases position; NFT retained');
 const trader=members[2],traderAta=spl.getAssociatedTokenAddressSync(mint.publicKey,trader.publicKey),traderWsol=spl.getAssociatedTokenAddressSync(spl.NATIVE_MINT,trader.publicKey);
 send('fund local trader token inventory',[spl.createAssociatedTokenAccountIdempotentInstruction(members[0].publicKey,traderAta,trader.publicKey,mint.publicKey),spl.createMintToInstruction(mint.publicKey,traderAta,members[0].publicKey,100000000000n)]);
 function quote(input,mode,amountBn){return amm.getQuote2({inputTokenMint:input,slippage:0,currentPoint:new BN(svm.getClock().unixTimestamp.toString()),poolState:readPool(),tokenADecimal:9,tokenBDecimal:9,hasReferral:false,swapMode:mode,...(mode===m.SwapMode.ExactOut?{amountOut:amountBn}:{amountIn:amountBn})});}
 async function swap(label,input,mode,n,fail=false){
  const q=quote(input,mode,new BN(n));const output=input.equals(mint.publicKey)?spl.NATIVE_MINT:mint.publicKey;
  const tx=await amm.swap2({...poolArgs(),payer:trader.publicKey,inputTokenMint:input,outputTokenMint:output,poolState:readPool(),referralTokenAccount:null,swapMode:mode,...(mode===m.SwapMode.ExactOut?{amountOut:new BN(n),maximumAmountIn:q.includedFeeInputAmount}:{amountIn:new BN(n),minimumAmountOut:fail?new BN('1000000000000000000'):q.outputAmount})});
  const before=snap([traderAta,traderWsol]),beforeTokens=amount(traderAta),beforeTraderSol=account(trader.publicKey).lamports,beforeReserveA=amount(readPool().tokenAVault),beforeReserveB=amount(readPool().tokenBVault);
  const r=send(label,tx.instructions,[trader],!fail);
  if(fail){assert.match(r.logs.join('\n'),/ExceededSlippage/);assert.deepEqual(snap([traderAta,traderWsol]),before);r.rollback='POOL_LP_AND_TRADER_TOKEN_STATE_UNCHANGED_FEE_PAYER_EXCLUDED';return;}
  const delta=amount(traderAta)-beforeTokens;
  if(input.equals(mint.publicKey))assert.equal(-delta,BigInt(q.includedFeeInputAmount.toString()));else assert.equal(delta,BigInt(q.outputAmount.toString()));
  const reserveADelta=amount(readPool().tokenAVault)-beforeReserveA,reserveBDelta=amount(readPool().tokenBVault)-beforeReserveB,traderSolDelta=account(trader.publicKey).lamports-beforeTraderSol;
  assert.equal(reserveADelta,-delta);assert.equal(traderSolDelta+reserveBDelta,-5000n);
  if(input.equals(mint.publicKey))assert.equal(-reserveBDelta,BigInt(q.outputAmount.toString()));else assert.equal(reserveBDelta,BigInt(q.includedFeeInputAmount.toString()));
  assert.equal(account(traderWsol),null);checkNft();balances.push({label,quotedInput:q.includedFeeInputAmount.toString(),quotedOutput:q.outputAmount.toString(),tokenDelta:String(delta),reserveADelta:String(reserveADelta),reserveBDelta:String(reserveBDelta),traderSolDelta:String(traderSolDelta),localBaseFeeLamports:5000,claimingFee:q.claimingFee.toString(),protocolFee:q.protocolFee.toString()});
 }
 await swap('sell exact in',mint.publicKey,m.SwapMode.ExactIn,10000000);
 await swap('buy exact in',spl.NATIVE_MINT,m.SwapMode.ExactIn,10000000);
 await swap('sell exact out',mint.publicKey,m.SwapMode.ExactOut,1000000);
 await swap('buy exact out',spl.NATIVE_MINT,m.SwapMode.ExactOut,1000000);
 await swap('reject impossible min output',mint.publicKey,m.SwapMode.ExactIn,1000000,true);
 checks.push('ExactIn/ExactOut swaps both directions match quote token deltas; impossible min output rolls back');
 const beforeFeeLamports=account(vault).lamports,beforeFeeTokens=amount(payerAta),beforePoolFeeB=amount(readPool().tokenBVault);
 await proposal('claim fees',await amm.claimPositionFee(lpArgs()));
 const claimedB=beforePoolFeeB-amount(readPool().tokenBVault),quotedLpFees=balances.reduce((s,b)=>s+BigInt(b.claimingFee),0n),quotedProtocolFees=balances.reduce((s,b)=>s+BigInt(b.protocolFee),0n);assert.equal(quotedLpFees-claimedB,1n);assert.equal(BigInt(readPool().protocolBFee.toString()),quotedProtocolFees);assert(readPool().protocolAFee.isZero());assert.equal(amount(payerAta),beforeFeeTokens);assert.equal(account(vault).lamports-beforeFeeLamports,claimedB);assert.equal(account(wsolAta),null);checkNft();checks.push('OnlyB LP fees received as SOL by vault through Squads; no A fees');
 const current=readPosition();
 const removeAmount=current.unlockedLiquidity.divn(10);
 const poolNow=readPool();const wd=amm.getWithdrawQuote({liquidityDelta:removeAmount,minSqrtPrice:poolNow.sqrtMinPrice,maxSqrtPrice:poolNow.sqrtMaxPrice,sqrtPrice:poolNow.sqrtPrice,collectFeeMode:poolNow.collectFeeMode,tokenAAmount:poolNow.tokenAAmount,tokenBAmount:poolNow.tokenBAmount,liquidity:poolNow.liquidity});
 const removeParams={...lpArgs(),liquidityDelta:removeAmount,tokenAAmountThreshold:wd.outAmountA,tokenBAmountThreshold:wd.outAmountB,vestings:[],currentPoint:new BN(svm.getClock().unixTimestamp.toString())};
 await proposal('reject remove minimum output',await amm.removeLiquidity({...removeParams,tokenAAmountThreshold:new BN('1000000000000000000')}),/ExceededSlippage/);
 await proposal('reject close nonempty position',await amm.closePosition({owner:vault,pool:built.pool,position:built.position,positionNftMint:nft,positionNftAccount:nftAccount}),/PositionIsNotEmpty/);
 const beforeRemoveTokens=amount(payerAta),beforeRemoveSol=account(vault).lamports;
 await proposal('remove partial liquidity',await amm.removeLiquidity(removeParams));
 assert(readPosition().unlockedLiquidity.eq(current.unlockedLiquidity.sub(removeAmount)));assert.equal(amount(payerAta)-beforeRemoveTokens,BigInt(wd.outAmountA.toString()));assert.equal(account(vault).lamports-beforeRemoveSol,BigInt(wd.outAmountB.toString()));checkNft();checks.push('Partial removal via Squads matches liquidity/token/SOL quote deltas');
 const recipient=members[2],recipientNft=spl.getAssociatedTokenAddressSync(nft,recipient.publicKey,false,spl.TOKEN_2022_PROGRAM_ID);
 send('prepare recipient NFT account',[spl.createAssociatedTokenAccountIdempotentInstruction(members[0].publicKey,recipientNft,recipient.publicKey,nft,spl.TOKEN_2022_PROGRAM_ID)]);monitor.push(recipientNft);
 const {Transaction}=require('@solana/web3.js');
 await proposal('transfer position NFT to local recipient',new Transaction().add(spl.createTransferCheckedInstruction(nftAccount,nft,recipientNft,vault,1n,0,[],spl.TOKEN_2022_PROGRAM_ID)));
 assert.equal(amount(nftAccount),0n);assert.equal(amount(recipientNft),1n);
 await proposal('reject vault claim after NFT transfer',await amm.claimPositionFee({...lpArgs(),positionNftAccount:recipientNft}),/InvalidAuthority.*6053/);
 send('recipient controls position fee claim',(await amm.claimPositionFee({...lpArgs(),owner:recipient.publicKey,positionNftAccount:recipientNft})).instructions,[recipient]);
 send('return NFT to original vault account',[spl.createTransferCheckedInstruction(recipientNft,nft,nftAccount,recipient.publicKey,1n,0,[],spl.TOKEN_2022_PROGRAM_ID)],[recipient]);checkNft();checks.push('Position rights follow actual NFT ownership; old vault rejected until NFT returned');
 const nextIndex=()=>BigInt(sq.accounts.Multisig.fromAccountInfo({data:Buffer.from(account(multisig).data)})[0].transactionIndex.toString())+1n;
 async function customForIndex(index){
  const txPda=sq.getTransactionPda({multisigPda:multisig,index})[0],positionNft=sq.getEphemeralSignerPda({transactionPda:txPda,ephemeralSignerIndex:0})[0];
  const low=new BN(2).pow(new BN(63)),high=new BN(2).pow(new BN(65));
  const geom=amm.preparePoolCreationParams({tokenAAmount:new BN(100000000),tokenBAmount:new BN(100000000),minSqrtPrice:low,maxSqrtPrice:high,collectFeeMode:1});
  const custom=await amm.createCustomPool({payer:vault,creator:vault,positionNft,tokenAMint:mint.publicKey,tokenBMint:spl.NATIVE_MINT,tokenAProgram:spl.TOKEN_PROGRAM_ID,tokenBProgram:spl.TOKEN_PROGRAM_ID,tokenAAmount:new BN(100000000),tokenBAmount:new BN(100000000),sqrtMinPrice:low,sqrtMaxPrice:high,...geom,poolFees:{baseFee:{data:Array.from(m.encodeFeeTimeSchedulerParams(new BN(2500004),0,new BN(0),new BN(0),0))},compoundingFeeBps:0,padding:0,dynamicFee:null},hasAlphaVault:false,activationType:1,collectFeeMode:1,activationPoint:null,isLockLiquidity:false});
  return {...custom,nft:positionNft,nftAccount:m.derivePositionNftAccount(positionNft)};
 }
 assert(readPool().liquidity.gtn(0));
 const companion=await customForIndex(nextIndex());assert(!companion.pool.equals(built.pool));const lowerBeforeCompanion=hash(account(built.pool).data);
 await proposal('create customizable companion pool',companion.tx,null,1);
 assert.equal(hash(account(built.pool).data),lowerBeforeCompanion);assert(amm._program.coder.accounts.decode('pool',Buffer.from(account(companion.pool).data)).liquidity.gtn(0));assert.equal(amount(companion.nftAccount),1n);assert(spl.AccountLayout.decode(Buffer.from(account(companion.nftAccount).data)).owner.equals(vault));
 monitor.push(companion.pool,companion.position,companion.nft,companion.nftAccount,m.deriveTokenVaultAddress(mint.publicKey,companion.pool),m.deriveTokenVaultAddress(spl.NATIVE_MINT,companion.pool));
 const duplicate=await customForIndex(nextIndex());assert(duplicate.pool.equals(companion.pool));monitor.push(duplicate.position,duplicate.nft,duplicate.nftAccount);
 await proposal('reject second customizable same pair',duplicate.tx,/already in use|already initialized/i,1);
 assert.equal(account(duplicate.position),null);assert.equal(account(duplicate.nft),null);assert.equal(account(duplicate.nftAccount),null);assert.equal(hash(account(built.pool).data),lowerBeforeCompanion);
 checks.push('Two funded same-pair pools coexist at distinct PDAs; companion unchanged by LOWER exit; duplicate customizable creation rejected with rollback. Synthetic geometry only.');
 const companionBeforeLowerExit=hash(account(companion.pool).data);
 const beforeAll=readPool(),remaining=readPosition().unlockedLiquidity;
 const allQuote=amm.getWithdrawQuote({liquidityDelta:remaining,minSqrtPrice:beforeAll.sqrtMinPrice,maxSqrtPrice:beforeAll.sqrtMaxPrice,sqrtPrice:beforeAll.sqrtPrice,collectFeeMode:beforeAll.collectFeeMode,tokenAAmount:beforeAll.tokenAAmount,tokenBAmount:beforeAll.tokenBAmount,liquidity:beforeAll.liquidity});
 const beforeAllTokens=amount(payerAta),beforeAllSol=account(vault).lamports,beforeAllReserveA=amount(readPool().tokenAVault),beforeAllReserveB=amount(readPool().tokenBVault),beforeAllWsolLamports=account(wsolAta)?.lamports||0n;
 await proposal('remove all remaining liquidity',await amm.removeAllLiquidity({...lpArgs(),tokenAAmountThreshold:allQuote.outAmountA,tokenBAmountThreshold:allQuote.outAmountB,vestings:[],currentPoint:new BN(svm.getClock().unixTimestamp.toString())}));
 assert(readPosition().unlockedLiquidity.isZero());assert.equal(amount(payerAta)-beforeAllTokens,BigInt(allQuote.outAmountA.toString()));assert.equal(account(vault).lamports-beforeAllSol,BigInt(allQuote.outAmountB.toString())+beforeAllWsolLamports);checkNft();
 await proposal('claim residual LP fees before close',await amm.claimPositionFee(lpArgs()));
 const residualA=amount(readPool().tokenAVault),residualB=amount(readPool().tokenBVault);assert.equal(residualA,beforeAllReserveA-BigInt(allQuote.outAmountA.toString()));assert.equal(residualB,beforeAllReserveB-BigInt(allQuote.outAmountB.toString()));
 const closeRent=account(built.position).lamports+account(nftAccount).lamports+account(nft).lamports,beforeClose=account(vault).lamports;
 await proposal('close empty position and NFT',await amm.closePosition({owner:vault,pool:built.pool,position:built.position,positionNftMint:nft,positionNftAccount:nftAccount}));
 assert.equal(account(built.position),null);assert.equal(account(nft),null);assert.equal(account(nftAccount),null);assert.equal(account(vault).lamports-beforeClose,closeRent);assert(account(built.pool));assert(readPool().liquidity.isZero());assert.equal(amount(readPool().tokenAVault),residualA);assert.equal(amount(readPool().tokenBVault),residualB);checks.push('Full removal then empty-position close burns/closes NFT and refunds exact rent to vault; pool remains');
 assert.equal(hash(account(companion.pool).data),companionBeforeLowerExit);
 return {checks,swaps:balances,claimedFeeB:String(claimedB),quotedLpFees:String(quotedLpFees),protocolFeeB:String(quotedProtocolFees),lpFeeRoundingDustB:1,residualAfterPositionClosed:{tokenA:String(residualA),tokenB:String(residualB),protocolB:String(quotedProtocolFees),nonProtocolResidualB:String(residualB-quotedProtocolFees)},closeRentRefund:String(closeRent),existingWsolAccountLamportsRefundedDuringFinalRemove:String(beforeAllWsolLamports),companionPool:companion.pool.toBase58(),companionGeometry:'SYNTHETIC_IDENTITY_CHECK_NOT_PRODUCTION_UPPER',transactions:cases.length-begin,notes:'All states synthetic; no production price, budget, config, wallet or network action.'};
};
