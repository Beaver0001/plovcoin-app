import * as cp from '@meteora-ag/cp-amm-sdk';
import BN from 'bn.js';
import { Buffer } from 'buffer';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

function planSwap({pools,amountIn,currentPoint,slippageBps,direction}){
 if(direction!==0&&direction!==1)throw Error("explicit direction 0 SELL or 1 BUY required");
 if(!Number.isInteger(slippageBps)||slippageBps<0||slippageBps>1000)throw Error('slippageBps must be explicitly supplied in [0,1000]');
 if(!BN.isBN(amountIn)||amountIn.lten(0)||amountIn.gt(cp.U64_MAX))throw Error('amountIn must be positive u64 BN');
 if(!BN.isBN(currentPoint))throw Error('currentPoint BN required');
 if(pools.length!==2||pools[0].label!=='UPPER'||pools[1].label!=='LOWER')throw Error('ordered UPPER/LOWER required');
 const a=pools[0].state,b=pools[1].state;
 if(!a.tokenAMint.equals(b.tokenAMint)||!a.tokenBMint.equals(b.tokenBMint)||!a.sqrtMinPrice.eq(b.sqrtMaxPrice))throw Error('mint orientation and touching boundary must match');
 const feeBytes=Buffer.from(cp.getBaseFeeParams({baseFeeMode:0,feeTimeSchedulerParam:{startingFeeBps:25.00004,endingFeeBps:25.00004,numberOfPeriod:0,totalDuration:0}}).data);const expectedFee=Buffer.alloc(32);feeBytes.copy(expectedFee);
 for(const p of pools){const s=p.state;if(s.collectFeeMode!==1||s.poolFees.dynamicFee.initialized!==0||s.poolFees.compoundingFeeBps!==0||!Buffer.from(s.poolFees.baseFee.baseFeeInfo.data).equals(expectedFee)||s.poolFees.protocolFeePercent!==20)throw Error('unsupported fee mode');if(s.sqrtPrice.lt(s.sqrtMinPrice)||s.sqrtPrice.gt(s.sqrtMaxPrice))throw Error('price outside band');}
 // The bands stay price-disjoint even when both contain both tokens.
 // Equal fee profiles imply UPPER's SELL price >= LOWER's; BUY uses LOWER first.
 // Use exact-in on each leg: success consumes the fixed total or reverts.
 const mode=cp.getFeeMode(1,direction,false),zero=new BN(0);
 const quote=(p,n)=>n.isZero()?null:cp.getSwapResultFromExactInput(p.state,n,mode,direction,currentPoint);
 function maxExact(p,limit){
  if(p.state.sqrtPrice.eq(direction===0?p.state.sqrtMinPrice:p.state.sqrtMaxPrice))return zero.clone();
  try{quote(p,limit);return limit.clone();}catch(e){if(!String(e).includes('PriceRangeViolation'))throw e;}
  let lo=zero.clone(),hi=limit.clone();
  while(hi.sub(lo).gtn(1)){const mid=lo.add(hi).divn(2);try{quote(p,mid);lo=mid;}catch(e){if(!String(e).includes('PriceRangeViolation'))throw e;hi=mid;}}
  return lo;
 }
 const order=direction===0?[0,1]:[1,0];
 const first=maxExact(pools[order[0]],amountIn),second=amountIn.sub(first);
 let totalOut=zero.clone();const legs=[];
 for(const [i,n] of [[order[0],first],[order[1],second]]){
  if(n.isZero())continue;
  const q=quote(pools[i],n);if(q.outputAmount.isZero())throw Error('zero output leg');
  if(!q.includedFeeInputAmount.eq(n)||!q.amountLeft.isZero())throw Error('incomplete exact input');
  legs.push({label:pools[i].label,offered:n.clone(),swapMode:0,quote:q,minOut:zero.clone()});totalOut=totalOut.add(q.outputAmount);
 }
 if(legs.length===0)throw Error('route capacity exhausted');
 const minOut=totalOut.muln(10000-slippageBps).divn(10000);if(minOut.isZero())throw Error('minimum output rounded to zero');
 let allocated=new BN(0);
 for(let i=0;i<legs.length;i++){const l=legs[i];l.minOut=i===legs.length-1?minOut.sub(allocated):l.quote.outputAmount.muln(10000-slippageBps).divn(10000);allocated=allocated.add(l.minOut);}
 if(!allocated.eq(minOut)||legs.some(l=>l.minOut.gt(l.quote.outputAmount)))throw Error('invalid minimum allocation');
 return {direction,amountIn:amountIn.clone(),quotedOut:totalOut,minOut,slippageBps,legs,scope:'OFFLINE_QUOTE; disjoint touching bands with identical fee profile only. All legs ExactIn: successful native execution consumes full requested input; stale states may reject or produce a nonoptimal allocation. Global optimum including atomic rounding not certified. Caller must validate live addresses, owners, pool status, activation and simulate before user signature'};
}
const planSell=args=>planSwap({...args,direction:0});
const planBuy=args=>planSwap({...args,direction:1});
async function buildSwapInstructions({plan,pools,program,user,inputTokenAccount,outputTokenAccount,expectedMintA,expectedMintB}){

 if(!program.programId.equals(cp.CP_AMM_PROGRAM_ID))throw Error('wrong AMM program');
 if(plan.direction!==0&&plan.direction!==1)throw Error('invalid direction');
 if(!Array.isArray(plan.legs)||plan.legs.length<1||plan.legs.length>2||new Set(plan.legs.map(l=>l.label)).size!==plan.legs.length)throw Error('invalid legs');
 if(!expectedMintA||!expectedMintB||expectedMintA.equals(expectedMintB))throw Error('explicit expected mints required');
 if(inputTokenAccount.equals(outputTokenAccount))throw Error('input and output accounts must differ');
 if(!BN.isBN(plan.amountIn)||plan.amountIn.lten(0)||plan.amountIn.gt(cp.U64_MAX)||!BN.isBN(plan.minOut)||plan.minOut.lten(0)||plan.minOut.gt(cp.U64_MAX))throw Error('invalid route totals');
 const inSum=plan.legs.reduce((s,l)=>s.add(l.offered),new BN(0)),minSum=plan.legs.reduce((s,l)=>s.add(l.minOut),new BN(0));
 if(!inSum.eq(plan.amountIn)||!minSum.eq(plan.minOut))throw Error('route total mismatch');
 const instructions=[],addresses=new Set();
 const eventAuthority=PublicKey.findProgramAddressSync([Buffer.from('__event_authority')],cp.CP_AMM_PROGRAM_ID)[0];
 for(const l of plan.legs){
  const p=pools.find(x=>x.label===l.label);if(!p||!p.address||addresses.has(p.address.toBase58()))throw Error('missing or duplicate pool address');addresses.add(p.address.toBase58());
  if(l.swapMode!==0||!BN.isBN(l.offered)||l.offered.lten(0)||l.offered.gt(cp.U64_MAX)||!BN.isBN(l.minOut)||l.minOut.isNeg()||l.minOut.gt(cp.U64_MAX))throw Error('invalid exact-in amounts');
  const s=p.state;if(!s.tokenAMint.equals(expectedMintA)||!s.tokenBMint.equals(expectedMintB))throw Error('unexpected pool mints');
  instructions.push(await program.methods.swap2({amount0:l.offered,amount1:l.minOut,swapMode:0}).accountsStrict({poolAuthority:cp.derivePoolAuthority(),pool:p.address,payer:user,inputTokenAccount,outputTokenAccount,tokenAVault:s.tokenAVault,tokenBVault:s.tokenBVault,tokenAMint:expectedMintA,tokenBMint:expectedMintB,tokenAProgram:TOKEN_PROGRAM_ID,tokenBProgram:TOKEN_PROGRAM_ID,referralTokenAccount:null,eventAuthority,program:cp.CP_AMM_PROGRAM_ID}).instruction());
 }
 return instructions;
}
export {planSell,planBuy,buildSwapInstructions};
