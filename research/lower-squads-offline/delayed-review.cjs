'use strict';
// Synthetic local VM only. No RPC, production keys or network sends.
const assert=require('node:assert/strict');
const {TransactionMessage}=require('@solana/web3.js');
const spl=require('@solana/spl-token'),sq=require('@sqds/multisig'),m=require('@meteora-ag/cp-amm-sdk'),BN=require('bn.js');
module.exports=async function(ctx){
 const {svm,account,send,amm,connection,multisig,vault,built,nft,nftAccount,members,mint,payerAta,wsolAta,hash,cases}=ctx;
 const begin=cases.length,checks=[];
 const pool=()=>amm._program.coder.accounts.decode('pool',Buffer.from(account(built.pool).data));
 const position=()=>amm._program.coder.accounts.decode('position',Buffer.from(account(built.position).data));
 const args=()=>{const p=pool();return {pool:built.pool,tokenAMint:p.tokenAMint,tokenBMint:p.tokenBMint,tokenAVault:p.tokenAVault,tokenBVault:p.tokenBVault,tokenAProgram:spl.TOKEN_PROGRAM_ID,tokenBProgram:spl.TOKEN_PROGRAM_ID};};
 const lp=()=>({...args(),owner:vault,position:built.position,positionNftAccount:nftAccount});
 const trader=members[2],traderAta=spl.getAssociatedTokenAddressSync(mint.publicKey,trader.publicKey),traderWsol=spl.getAssociatedTokenAddressSync(spl.NATIVE_MINT,trader.publicKey);
 const monitor=[vault,payerAta,wsolAta,built.pool,built.position,nft,nftAccount,pool().tokenAVault,pool().tokenBVault,trader.publicKey,traderAta,traderWsol,multisig];
 const snap=extra=>[...monitor,...extra].map(p=>{const a=account(p);return a?{address:p.toBase58(),data:hash(a.data),lamports:String(a.lamports),owner:a.programAddress}:{address:p.toBase58(),exists:false};});
 const status=index=>sq.accounts.Proposal.fromAccountInfo({data:Buffer.from(account(sq.getProposalPda({multisigPda:multisig,transactionIndex:index})[0]).data)})[0].status.__kind;
 async function approve(label,tx){
  const index=BigInt(sq.accounts.Multisig.fromAccountInfo({data:Buffer.from(account(multisig).data)})[0].transactionIndex.toString())+1n;
  send(label+' transaction',[sq.instructions.vaultTransactionCreate({multisigPda:multisig,transactionIndex:index,creator:members[0].publicKey,vaultIndex:0,ephemeralSigners:0,transactionMessage:new TransactionMessage({payerKey:vault,recentBlockhash:svm.latestBlockhash(),instructions:tx.instructions})})]);
  send(label+' proposal',[sq.instructions.proposalCreate({multisigPda:multisig,creator:members[0].publicKey,transactionIndex:index,isDraft:false})]);
  for(const k of members.slice(0,2))send(label+' vote',[sq.instructions.proposalApprove({multisigPda:multisig,transactionIndex:index,member:k.publicKey})],[k]);
  assert.equal(status(index),'Approved');return index;
 }
 async function execute(label,index,fail=false){
  const extra=[sq.getProposalPda({multisigPda:multisig,transactionIndex:index})[0],sq.getTransactionPda({multisigPda:multisig,index})[0]],before=snap(extra);
  const ix=(await sq.instructions.vaultTransactionExecute({connection,multisigPda:multisig,transactionIndex:index,member:members[0].publicKey})).instruction;
  const r=send(label,[ix],[members[0]],!fail);
  if(fail){assert.match(r.logs.join('\n'),/ExceededSlippage/);assert.deepEqual(snap(extra),before);assert.equal(status(index),'Approved');r.rollback='LP_VAULT_TRADER_GOVERNANCE_AND_APPROVED_MESSAGE_UNCHANGED_EXTERNAL_FEE_PAYER_EXCLUDED';}
  else assert.equal(status(index),'Executed');
 }
 function wait(){const c=svm.getClock();c.unixTimestamp+=43201n;svm.setClock(c);}
 async function move(label,input){
  const p=pool(),n=new BN(100000000),q=amm.getQuote2({inputTokenMint:input,slippage:0,currentPoint:new BN(svm.getClock().unixTimestamp.toString()),poolState:p,tokenADecimal:9,tokenBDecimal:9,hasReferral:false,swapMode:m.SwapMode.ExactIn,amountIn:n});
  const tx=await amm.swap2({...args(),payer:trader.publicKey,inputTokenMint:input,outputTokenMint:input.equals(mint.publicKey)?spl.NATIVE_MINT:mint.publicKey,poolState:p,referralTokenAccount:null,swapMode:m.SwapMode.ExactIn,amountIn:n,minimumAmountOut:q.outputAmount});
  send(label,tx.instructions,[trader]);assert(!pool().sqrtPrice.eq(p.sqrtPrice));
 }
 async function add(){const p=pool(),q=amm.getDepositQuote({inAmount:new BN(100000000),isTokenA:true,minSqrtPrice:p.sqrtMinPrice,maxSqrtPrice:p.sqrtMaxPrice,sqrtPrice:p.sqrtPrice,collectFeeMode:p.collectFeeMode,tokenAAmount:p.tokenAAmount,tokenBAmount:p.tokenBAmount,liquidity:p.liquidity});return {delta:q.liquidityDelta,tx:await amm.addLiquidity({...lp(),liquidityDelta:q.liquidityDelta,maxAmountTokenA:q.consumedInputAmount,maxAmountTokenB:q.outputAmount,tokenAAmountThreshold:q.consumedInputAmount,tokenBAmountThreshold:q.outputAmount})};}
 async function remove(){const p=pool(),delta=position().unlockedLiquidity.divn(10),q=amm.getWithdrawQuote({liquidityDelta:delta,minSqrtPrice:p.sqrtMinPrice,maxSqrtPrice:p.sqrtMaxPrice,sqrtPrice:p.sqrtPrice,collectFeeMode:p.collectFeeMode,tokenAAmount:p.tokenAAmount,tokenBAmount:p.tokenBAmount,liquidity:p.liquidity});return {delta,tx:await amm.removeLiquidity({...lp(),liquidityDelta:delta,tokenAAmountThreshold:q.outAmountA,tokenBAmountThreshold:q.outAmountB,vestings:[],currentPoint:new BN(svm.getClock().unixTimestamp.toString())})};}
 send('fund synthetic intervening trader',[spl.createAssociatedTokenAccountIdempotentInstruction(members[0].publicKey,traderAta,trader.publicKey,mint.publicKey),spl.createMintToInstruction(mint.publicKey,traderAta,members[0].publicKey,100000000000n)]);
 for(const [label,build,input,direction] of [['add',add,spl.NATIVE_MINT,1],['remove',remove,mint.publicKey,-1]]){
  const old=await build(),index=await approve('stale '+label,old.tx),beforePrice=pool().sqrtPrice.toString();
  await move('market moves during '+label+' timelock',input);wait();
  const afterPrice=pool().sqrtPrice.toString();
  await execute('reject stale '+label,index,true);await execute('reject repeated stale '+label,index,true);
  for(const k of members.slice(0,2))send('cancel stale '+label,[sq.instructions.proposalCancelV2({multisigPda:multisig,transactionIndex:index,member:k.publicKey})],[k]);
  assert.equal(status(index),'Cancelled');
  const cancelledAccounts=[sq.getProposalPda({multisigPda:multisig,transactionIndex:index})[0],sq.getTransactionPda({multisigPda:multisig,index})[0]],cancelledBefore=snap(cancelledAccounts);
  const cancelledIx=(await sq.instructions.vaultTransactionExecute({connection,multisigPda:multisig,transactionIndex:index,member:members[0].publicKey})).instruction;
  const cancelled=send('reject cancelled '+label,[cancelledIx],[members[0]],false);assert.match(cancelled.logs.join('\n'),/InvalidProposalStatus/);assert.deepEqual(snap(cancelledAccounts),cancelledBefore);
  const fresh=await build(),next=await approve('fresh '+label,fresh.tx);assert(next>index);wait();
  const before=position().unlockedLiquidity;await execute('execute fresh '+label,next);
  assert(position().unlockedLiquidity.eq(direction===1?before.add(fresh.delta):before.sub(fresh.delta)));
  assert.equal(status(index),'Cancelled');
  checks.push({operation:label,oldProposal:index.toString(),newProposal:next.toString(),beforePrice,afterPrice,oldStatusAfterSlippage:'Approved',oldFinalStatus:'Cancelled',cancelVotes:2,cancelledExecuteRejected:true,newStatus:'Executed',freshLiquidityDelta:fresh.delta.toString(),staleAttempts:2});
 }
 assert.equal(spl.AccountLayout.decode(Buffer.from(account(nftAccount).data)).amount,1n);
 return {checks,transactions:cases.length-begin,scope:'Synthetic pinned SBF runtime; tight limits, one market move per operation. Not exhaustive market/expiry protection.',warning:'Slippage rejection alone leaves proposal Approved. Recovery tested here explicitly cancels stale proposal with governance votes, verifies execute rejection, then re-quotes and obtains new approvals and timelock. No automatic expiry is proved.'};
};
