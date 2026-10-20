'use strict';
// Pinned SDK offline mapping. No Connection, wallet, RPC, signatures or transactions.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const m=require('@meteora-ag/cp-amm-sdk'),BN=require('bn.js');
const {PublicKey}=require('@solana/web3.js');
const root=__dirname,inputBytes=fs.readFileSync(path.join(root,'v29-geometry-input.json')),input=JSON.parse(inputBytes);
const sha=b=>createHash('sha256').update(b).digest('hex');
const bn=v=>new BN(v.toString());
function fraction(v){const [a,b='1']=v.split('/');return [BigInt(a),BigInt(b)];}
function atomsFloor(v){const[a,b]=fraction(v);return a*1000000000n/b;}
let checks=0;function ck(v){assert(v);checks++;}
const fees={baseFee:{data:Array.from(m.encodeFeeTimeSchedulerParams(new BN(2500004),0,new BN(0),new BN(0),0))},compoundingFeeBps:0,padding:0,dynamicFee:null};
const tokenA=new PublicKey(input.mint),tokenB=new PublicKey('So11111111111111111111111111111111111111112');
const U128=(1n<<128n)-1n;const rows=[];
ck(require('@meteora-ag/cp-amm-sdk/package.json').version==='1.5.1');ck(input.cases.length===12);
for(const c of input.cases){
 const s=Object.fromEntries(Object.entries(c.pricesSOLperPLOV).map(([k,v])=>[k,m.getSqrtPriceFromPrice(v.decimal,9,9)]));
 ck(s.lower.lt(s.start)&&s.start.lt(s.upper));
 const amountA=bn(BigInt(input.baseSeedPLOV)*1000000000n),amountB=bn(atomsFloor(c.seed_SOL));
 const legs=[{name:'UPPER',min:s.start,max:s.upper,init:s.start,a:amountA,b:bn(0),L:m.getLiquidityDeltaFromAmountAForConcentratedLiquidity(amountA,s.start,s.upper)},{name:'LOWER',min:s.lower,max:s.start,init:s.start,a:bn(0),b:amountB,L:m.getLiquidityDeltaFromAmountBForConcentratedLiquidity(amountB,s.lower,s.start)}];
 const out={id:c.id,scenario:c.scenario,retentionPercent:c.retentionPercent,FX_USD_per_SOL:c.FX_USD_per_SOL,sqrtQ64:Object.fromEntries(Object.entries(s).map(([k,v])=>[k,v.toString()])),seedSOLAtomsBudgetFloor:amountB.toString(),legs:[]};
 for(const l of legs){
  m.validateCustomizablePoolParams({collectFeeMode:1,activationType:1,sqrtMinPrice:l.min,sqrtMaxPrice:l.max,initSqrtPrice:l.init,liquidityDelta:l.L,tokenAAmount:l.a,tokenBAmount:l.b,tokenAMint:tokenA,tokenBMint:tokenB,poolFees:fees});checks++;
  ck(BigInt(l.L.toString())>0n&&BigInt(l.L.toString())<=U128);
  const aUp=m.getAmountAFromLiquidityDeltaForConcentratedLiquidity(l.init,l.max,l.L,0),aDown=m.getAmountAFromLiquidityDeltaForConcentratedLiquidity(l.init,l.max,l.L,1);
  const bUp=m.getAmountBFromLiquidityDeltaForConcentratedLiquidity(l.min,l.init,l.L,0),bDown=m.getAmountBFromLiquidityDeltaForConcentratedLiquidity(l.min,l.init,l.L,1);
  ck(aUp.lte(l.a)&&bUp.lte(l.b));ck(aUp.sub(aDown).lte(bn(1))&&bUp.sub(bDown).lte(bn(1)));
  ck(l.name==='UPPER'?bUp.isZero()&&aUp.eq(amountA):aUp.isZero()&&bUp.eq(amountB));
  const initial=m.getInitialPoolInformation(1,l.min,l.max,l.init,l.L);
  ck(initial.initialLiquidity.eq(l.L));
  assert.throws(()=>m.validatePriceRange(1,l.max,l.min));checks++;
  assert.throws(()=>m.validateInitialSqrtPrice(1,l.max.addn(1),l.min,l.max));checks++;
  out.legs.push({name:l.name,sqrtMin:l.min.toString(),sqrtMax:l.max.toString(),sqrtInitial:l.init.toString(),liquidityU128:l.L.toString(),amountAUp:aUp.toString(),amountADown:aDown.toString(),amountBUp:bUp.toString(),amountBDown:bDown.toString(),budgetA:l.a.toString(),budgetB:l.b.toString(),unspentA:l.a.sub(aUp).toString(),unspentB:l.b.sub(bUp).toString(),parameterValidation:'PASS',nativeExecution:'NOT_RUN'});
 }
 rows.push(out);
}
const out={version:100,status:'PINNED_SDK_OFFLINE_GEOMETRY_PASS',sdk:'@meteora-ag/cp-amm-sdk@1.5.1',sdkEntrySHA256:sha(fs.readFileSync(require.resolve('@meteora-ag/cp-amm-sdk'))),lockSHA256:sha(fs.readFileSync(path.join(root,'package-lock.json'))),inputSHA256:sha(inputBytes),checks,candidateCases:rows.length,legs:rows.length*2,primaryFXCases:rows.filter(r=>r.FX_USD_per_SOL==='519/5').length,roundingPolicy:'SDK sqrt floor; seed SOL atom budget floor; liquidity floor; initialization debit ceil; withdrawal floor',rows,limitations:['Not deployed-program execution or maximum-liquidity proof beyond u128 representation.','Not a real config, authority, pool address, operational budget or production geometry approval.','Does not replay D0/D14/D45/D90 swaps or reconfirm v29 thresholds after all atomic fees.'],RPCRequests:0,walletPrompts:0,signatures:0,transactionBuilds:0,networkSends:0,Wave1Inputs:null,MAINNET_GO:'NO'};
fs.writeFileSync(path.join(root,'v29-geometry-result.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({status:out.status,checks,cases:rows.length,legs:rows.length*2}));
