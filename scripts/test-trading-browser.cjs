'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),zlib=require('node:zlib'),{webcrypto}=require('node:crypto');
const esbuild=require('esbuild');
// An unresolved async fixture must not let Node exit with status 0 before PASS.
const watchdog=setTimeout(()=>{console.error('Browser fixture did not complete within 30 seconds');process.exitCode=1;},30000);
(async()=>{
 const result=await esbuild.build({entryPoints:['lib/trading/engine/index.mjs'],platform:'browser',format:'iife',globalName:'PLOVTradeEngine',bundle:true,minify:true,write:false,metafile:true,alias:{'@coral-xyz/anchor/dist/cjs/utils/bytes':'./lib/trading/engine/anchor-browser-bytes.mjs'},target:'es2022',inject:['scripts/browser-buffer.mjs'],define:{'process.env.NODE_ENV':'"production"'}});
 const code=result.outputFiles[0].text;let requests=0;
 const sandbox={console,structuredClone,TextEncoder,TextDecoder,URL,URLSearchParams,Uint8Array,ArrayBuffer,DataView,crypto:webcrypto,setTimeout,clearTimeout,atob,btoa,fetch:()=>{requests++;throw Error('Network forbidden in browser fixture');}};
 sandbox.window=sandbox;sandbox.self=sandbox;vm.createContext(sandbox);vm.runInContext(code,sandbox,{timeout:20000});
 assert.equal(sandbox.require,undefined);assert.equal(sandbox.process,undefined);assert.equal(sandbox.Buffer,undefined);
 const engine=sandbox.PLOVTradeEngine;assert.equal(typeof engine.planBuy,'function');assert.equal(typeof engine.buildNativeSwapTransaction,'function');
 // Actual fixture math + Anchor instruction assembly in a browser-like VM.
 const output=await vm.runInContext(`(async()=>{
  const {BN,Keypair,PublicKey,CpAmm,planBuy,planSell,buildNativeSwapTransaction,assertNativeBalance,prepareWalletTransaction,finalizeWalletReview,signPreparedSwap}=PLOVTradeEngine;
  const pk=n=>Keypair.fromSeed(Uint8Array.from({length:32},()=>n)).publicKey;
  const user=pk(1),temporary=pk(2),mint=new PublicKey('B4LhtMwbKh8D1nfj7dE6FefKpg7U2qkbYC371DBcJq9x'),wsol=new PublicKey('So11111111111111111111111111111111111111112');
  const fee=Array(32).fill(0);fee.splice(0,4,164,37,38,0);
  const common={tokenAMint:mint,tokenBMint:wsol,collectFeeMode:1,feeVersion:1,activationPoint:new BN(0),poolFees:{baseFee:{baseFeeInfo:{data:fee}},dynamicFee:{initialized:0},protocolFeePercent:20,referralFeePercent:0,compoundingFeeBps:0,initSqrtPrice:new BN('22175155567711880')}};
  const pools=[{label:'UPPER',address:pk(3),state:{...common,sqrtMinPrice:new BN('22175155567711880'),sqrtMaxPrice:new BN('57256005475537860'),sqrtPrice:new BN('22175155567711880'),liquidity:new BN('25334693496858577532945958291691091'),tokenAVault:pk(5),tokenBVault:pk(6)}},{label:'LOWER',address:pk(4),state:{...common,sqrtMinPrice:new BN('21529388600461957'),sqrtMaxPrice:new BN('22175155567711880'),sqrtPrice:new BN('22175155567711880'),liquidity:new BN('175293585884881868050038216027680000'),tokenAVault:pk(7),tokenBVault:pk(8)}}];
  const buy=planBuy({pools,amountIn:new BN('1000000000'),currentPoint:new BN(1),slippageBps:50});
  const sell=planSell({pools,amountIn:new BN('10000000000000'),currentPoint:new BN(1),slippageBps:50});
  const program=new CpAmm({rpcEndpoint:'https://example.invalid'})._program;
  const env=await buildNativeSwapTransaction({plan:buy,pools,program,user,plovMint:mint,temporaryWsolAccount:temporary,plovAtaExists:false,recentBlockhash:pk(9).toBase58(),tokenAccountRentLamports:2039280n,computeUnitLimit:200000,computeUnitPriceMicroLamports:0n});
  const funds=assertNativeBalance({envelope:env,walletBalanceLamports:2000000000n,messageFeeLamports:10000n,extraReserveLamports:0n});
  const args={plan:buy,pools,program,user,plovMint:mint,plovAtaExists:false,recentBlockhash:pk(9).toBase58(),tokenAccountRentLamports:2039280n,computeUnitLimit:200000,computeUnitPriceMicroLamports:0n};
  const prepared=await prepareWalletTransaction(args);
  const review=await finalizeWalletReview(prepared,{messageFeeLamports:10000n,extraReserveLamports:0n,walletBalanceLamports:2000000000n,expiresAtMs:2000});
  const context=()=>({launchEnabled:true,accountChecksPassed:true,wallet:user.toBase58(),network:'mainnet-beta',nowMs:1000,currentBlockHeight:10,lastValidBlockHeight:20,nativeBalance:2000000000n,plovBalance:0n,simulation:{reviewId:review.id,message:prepared.message,succeeded:true},message:prepared.message});
  let prompts=0;const wallet={signTransaction:async tx=>{prompts++;tx.partialSign(Keypair.fromSeed(Uint8Array.from({length:32},()=>1)));return tx;}};
  let closed=false;try{await signPreparedSwap({prepared,review,wallet,readContext:()=>({...context(),launchEnabled:false})});}catch(e){closed=true;}if(!closed||prompts!==0)throw Error('closed gate prompted wallet');
  let detached=false;try{await signPreparedSwap({prepared,review:{...review},wallet,readContext:context});}catch(e){detached=true;}if(!detached||prompts!==0)throw Error('detached review accepted');
  const signed=await signPreparedSwap({prepared,review,wallet,readContext:context});if(!signed.verifySignatures(true)||prompts!==1)throw Error('signature verification failed');
  let removed=false;try{await signPreparedSwap({prepared,review,readContext:context,wallet:{signTransaction:async tx=>{tx.sign(Keypair.fromSeed(Uint8Array.from({length:32},()=>1)));return tx;}}});}catch(e){removed=true;}if(!removed)throw Error('missing temporary signature accepted');
  return {walletBinding:'PASS_SYNTHETIC_TWO_SIGNATURES',closedGateNoPrompt:true,detachedReviewRejected:true,droppedTemporarySignatureRejected:true,buy:buy.quotedOut.toString(),buyMin:buy.minOut.toString(),sell:sell.quotedOut.toString(),packet:env.packetBytes,signatures:env.transaction.compileMessage().header.numRequiredSignatures,required:funds.requiredLamports.toString(),instructions:env.transaction.instructions.length};
 })()`,sandbox,{timeout:20000});
 assert.equal(output.buy,'689853198201662');assert.equal(output.signatures,2);assert(output.packet<=1232);assert.equal(output.required,'1004088560');assert.equal(requests,0);
 const imports=Object.values(result.metafile.outputs).flatMap(x=>x.imports);assert.equal(imports.length,0);
 console.log(JSON.stringify({status:'PASS',platform:'browser',vm:'no require/process/global Buffer; WebCrypto supplied',...output,networkRequests:requests,bytes:Buffer.byteLength(code),gzipBytes:zlib.gzipSync(code).length,externalImports:imports.length}));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>clearTimeout(watchdog));
