'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict'),esbuild=require('esbuild');
const {PublicKey,Keypair,Transaction}=require('@solana/web3.js');
const {getAssociatedTokenAddressSync}=require('@solana/spl-token');
const BN=require('bn.js');
const GENESIS='5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
const fixture=JSON.parse(fs.readFileSync('scripts/fixtures/trading-accounts.json','utf8'));
const key=Keypair.fromSeed(Uint8Array.from({length:32},()=>91)); // Synthetic only.
let checks=0;
const watchdog=setTimeout(()=>{console.error('Signing fixture did not complete');process.exitCode=1;},30000);
function accounts(){
 const f=JSON.parse(JSON.stringify(fixture)),mint=new PublicKey('B4LhtMwbKh8D1nfj7dE6FefKpg7U2qkbYC371DBcJq9x');
 const oldAta=getAssociatedTokenAddressSync(mint,new PublicKey(f.wallet)).toBase58(),ata=getAssociatedTokenAddressSync(mint,key.publicKey).toBase58();
 f.accounts[key.publicKey.toBase58()]=f.accounts[f.wallet];delete f.accounts[f.wallet];
 f.accounts[ata]=f.accounts[oldAta];delete f.accounts[oldAta];
 const bytes=Buffer.from(f.accounts[ata].data,'base64');Buffer.from(key.publicKey.toBytes()).copy(bytes,32);bytes.writeBigUInt64LE(10000000000000000n,64);f.accounts[ata].data=bytes.toString('base64');
 f.wallet=key.publicKey.toBase58();return f;
}
function connection(f){
 const calls=[],hooks={};let sims=0;
 const c={rpcEndpoint:'https://fixture.invalid',calls,hooks,
  getGenesisHash:async()=>{calls.push('genesis');return hooks.genesis?hooks.genesis():GENESIS;},
  getMultipleAccountsInfoAndContext:async(keys,config)=>{calls.push('accounts');assert.equal(config.commitment,'finalized');assert(config.minContextSlot<=f.slot);if(hooks.accounts)await hooks.accounts();return {context:{slot:f.slot},value:keys.map(k=>{const a=f.accounts[k.toBase58()];return a?{...a,owner:new PublicKey(a.owner),data:Buffer.from(a.data,'base64')}:null;})};},
  getLatestBlockhashAndContext:async()=>{calls.push('blockhash');return {context:{slot:f.slot},value:{blockhash:f.wallet,lastValidBlockHeight:20}};},
  getMinimumBalanceForRentExemption:async()=>{calls.push('rent');return hooks.rent?hooks.rent():2039280;},
  getFeeForMessage:async m=>{calls.push('fee');c.feeMessage=Buffer.from(m.serialize());if(hooks.fee)return hooks.fee();return {context:{slot:f.slot},value:10000};},
  simulateTransaction:async(tx,config)=>{
   calls.push('simulate:'+config.sigVerify);sims++;assert.equal(config.replaceRecentBlockhash,false);assert(config.minContextSlot<=f.slot);assert(Buffer.from(tx.message.serialize()).equals(c.feeMessage));assert(tx.signatures[1].some(x=>x!==0));
   if(config.sigVerify)assert(tx.signatures[0].some(x=>x!==0));
   return hooks.simulate?hooks.simulate(tx,config,sims):{context:{slot:f.slot},value:{err:null}};
  },
  getBlockHeight:async()=>{calls.push('height');return hooks.height?hooks.height():10;}
 };return c;
}
(async()=>{
 const output=await esbuild.build({entryPoints:['lib/trading/engine/index.mjs'],bundle:true,platform:'node',packages:'external',format:'cjs',write:false});
 const m=new Module(path.resolve('scripts/signing-fixture-module.cjs'),module);m.filename=path.resolve('scripts/signing-fixture-module.cjs');m.paths=module.paths;m._compile(output.outputFiles[0].text,m.filename);
 const {loadVerifiedRoute,prepareVerifiedSwap,refreshVerifiedSwapContext,signPreparedSwap,finalizeWalletReview}=m.exports;
 async function setup(side='BUY'){
  const f=accounts(),c=connection(f),snapshot=await loadVerifiedRoute(c,f.manifest,f.wallet);
  const p=await prepareVerifiedSwap(c,snapshot,{side,amountIn:new BN(side==='BUY'?'1000000000':'1000000000000'),slippageBps:50,computeUnitLimit:200000,computeUnitPriceMicroLamports:0n,extraReserveLamports:0n,maxSnapshotAgeMs:60000,quoteLifetimeMs:15000});
  const state={launchEnabled:true,wallet:f.wallet,network:'mainnet-beta'},h={f,c,p,state,prompts:0};
  h.readContext=input=>refreshVerifiedSwapContext(c,p,{...input,readWalletState:()=>state});
  h.sign=(wallet={signTransaction:async tx=>{h.prompts++;tx.partialSign(key);return Transaction.from(tx.serialize());}})=>signPreparedSwap({prepared:p.prepared,review:p.review,wallet,readContext:h.readContext});
  return h;
 }
 const h=await setup(),original=Buffer.from(h.p.prepared.envelope.transaction.serializeMessage()),signed=await h.sign();
 assert(signed.verifySignatures(true));assert(Buffer.from(signed.serializeMessage()).equals(original));assert.equal(h.prompts,1);assert.equal(h.c.calls.filter(x=>x==='accounts').length,3);assert.equal(h.c.calls.filter(x=>x==='blockhash').length,1);assert.deepEqual(h.c.calls.filter(x=>x.startsWith('simulate:')),['simulate:false','simulate:false','simulate:true']);checks++;
 async function reject(name,mutate,pattern,prompts=0){const h=await setup();mutate(h);await assert.rejects(()=>h.sign(),pattern,name);assert.equal(h.prompts,prompts,name);checks++;}
 await reject('closed gate',h=>{h.state.launchEnabled=false;},/not open/);
 await reject('wallet switched',h=>{h.state.wallet='other';},/Wallet or network changed/);
 await reject('network switched',h=>{h.state.network='devnet';},/Wallet or network changed/);
 await reject('pool removed',h=>{delete h.f.accounts[h.f.manifest.pools[0].address];},/Missing account/);
 await reject('program changed',h=>{const a=h.f.accounts[h.f.manifest.programData],b=Buffer.from(a.data,'base64');b[44]^=1;a.data=b.toString('base64');},/Program bytes changed/);
 await reject('balance spent',h=>{h.f.accounts[h.f.wallet].lamports=0;},/Insufficient SOL/);
 await reject('fee changed',h=>{h.c.hooks.fee=()=>({context:{slot:100},value:11000});},/fee changed/);
 await reject('fee context stale',h=>{h.c.hooks.fee=()=>({context:{slot:99},value:10000});},/fee changed or is stale/);
 await reject('rent changed',h=>{h.c.hooks.rent=()=>2039281;},/rent changed/);
 await reject('simulation fails',h=>{h.c.hooks.simulate=()=>({context:{slot:100},value:{err:'fixture'}});},/Simulation failed/);
 await reject('simulation context stale',h=>{h.c.hooks.simulate=()=>({context:{slot:99},value:{err:null}});},/Simulation failed/);
 await reject('replacement blockhash',h=>{h.c.hooks.simulate=()=>({context:{slot:100},value:{err:null,replacementBlockhash:{}}});},/Simulation failed/);
 await reject('blockhash expired',h=>{h.c.hooks.height=()=>21;},/Blockhash expired/);
 await reject('wallet changed during RPC',h=>{h.c.hooks.fee=()=>{h.state.wallet='other';return {context:{slot:100},value:10000};};},/Wallet or network changed/);
 await reject('message changed during RPC',h=>{h.c.hooks.fee=()=>{h.p.prepared.envelope.transaction.recentBlockhash=PublicKey.default.toBase58();return {context:{slot:100},value:10000};};},/Transaction changed/);
 await reject('endpoint changed during refresh',h=>{h.c.hooks.accounts=()=>{h.c.rpcEndpoint='https://other.invalid';};},/RPC connection changed/);
 const after=await setup();await assert.rejects(()=>after.sign({signTransaction:async tx=>{after.prompts++;tx.partialSign(key);after.f.accounts[after.f.wallet].lamports=0;return tx;}}),/Insufficient SOL/);assert.equal(after.prompts,1);assert(after.c.calls.includes('simulate:true'));checks++;
 const afterSim=await setup();afterSim.c.hooks.simulate=(tx,config)=>({context:{slot:100},value:{err:config.sigVerify?'fixture post-sign error':null}});await assert.rejects(()=>afterSim.sign(),/Simulation failed/);assert.equal(afterSim.prompts,1);checks++;
 const afterWallet=await setup();await assert.rejects(()=>afterWallet.sign({signTransaction:async tx=>{afterWallet.prompts++;tx.partialSign(key);afterWallet.state.wallet='other';return tx;}}),/Wallet or network changed/);assert.equal(afterWallet.prompts,1);checks++;
 const missing=await setup();await assert.rejects(()=>missing.sign({signTransaction:async tx=>{missing.prompts++;tx.sign(key);return tx;}}),/signature/);assert.equal(missing.c.calls.filter(x=>x==='accounts').length,2);checks++;
 const rejected=await setup();await assert.rejects(()=>rejected.sign({signTransaction:async()=>{rejected.prompts++;throw Error('User rejected');}}),/User rejected/);assert.equal(rejected.c.calls.filter(x=>x==='accounts').length,2);checks++;
 const forged=await setup();await assert.rejects(()=>refreshVerifiedSwapContext(forged.c,{...forged.p},{phase:'before',transaction:forged.p.prepared.envelope.transaction,readWalletState:()=>forged.state}),/Unknown verified preflight/);checks++;
 const foreign=connection(accounts());await assert.rejects(()=>refreshVerifiedSwapContext(foreign,forged.p,{phase:'before',transaction:forged.p.prepared.envelope.transaction,readWalletState:()=>forged.state}),/RPC connection changed/);assert.equal(foreign.calls.length,0);checks++;
 const expired=await setup(),realNow=Date.now;try{Date.now=()=>realNow()+16000;await assert.rejects(()=>expired.sign(),/Quote expired/);assert.equal(expired.prompts,0);checks++;}finally{Date.now=realNow;}
 const progress=await setup();let snapshots=0;progress.c.hooks.accounts=()=>{progress.f.slot=++snapshots===1?101:100;const a=progress.f.accounts['SysvarC1ock11111111111111111111111111111111'],b=Buffer.from(a.data,'base64');b.writeBigUInt64LE(BigInt(progress.f.slot),0);a.data=b.toString('base64');};await assert.rejects(()=>progress.sign(),/Invalid account snapshot/);assert.equal(progress.prompts,1);checks++;
 await reject('ATA availability changed',h=>{const ata=getAssociatedTokenAddressSync(new PublicKey('B4LhtMwbKh8D1nfj7dE6FefKpg7U2qkbYC371DBcJq9x'),key.publicKey).toBase58();delete h.f.accounts[ata];},/ATA availability changed/);
 const sell=await setup('SELL');assert((await sell.sign()).verifySignatures(true));assert.equal(sell.p.review.side,'SELL');checks++;
 const spent=await setup('SELL');await assert.rejects(()=>spent.sign({signTransaction:async tx=>{spent.prompts++;tx.partialSign(key);const ata=getAssociatedTokenAddressSync(new PublicKey('B4LhtMwbKh8D1nfj7dE6FefKpg7U2qkbYC371DBcJq9x'),key.publicKey).toBase58(),a=spent.f.accounts[ata],b=Buffer.from(a.data,'base64');b.writeBigUInt64LE(0n,64);a.data=b.toString('base64');return tx;}}),/Insufficient PLOV/);assert.equal(spent.prompts,1);checks++;
 const concurrent=await setup();let release,entered;const blocked=new Promise(r=>{release=r;}),started=new Promise(r=>{entered=r;}),read=concurrent.readContext;concurrent.readContext=async input=>{if(input.phase==='before'){entered();await blocked;}return read(input);};const pending=concurrent.sign();await started;await assert.rejects(()=>concurrent.sign(),/already in progress/);assert.equal(concurrent.prompts,0);release();assert((await pending).verifySignatures(true));assert.equal(concurrent.prompts,1);checks++;
 const refinalize=h=>finalizeWalletReview(h.p.prepared,{messageFeeLamports:h.p.review.messageFee,extraReserveLamports:h.p.review.extraReserve,walletBalanceLamports:BigInt(h.f.accounts[h.f.wallet].lamports),expiresAtMs:h.p.review.expiresAtMs});
 const superseded=await setup();superseded.c.hooks.fee=async()=>{await refinalize(superseded);return {context:{slot:100},value:10000};};await assert.rejects(()=>superseded.sign(),/Review changed/);assert.equal(superseded.prompts,0);checks++;
 const changedReview=await setup();await assert.rejects(()=>changedReview.sign({signTransaction:async tx=>{changedReview.prompts++;tx.partialSign(key);await refinalize(changedReview);return tx;}}),/Review changed/);assert.equal(changedReview.prompts,1);checks++;
 console.log(JSON.stringify({status:'PASS',checks,wallet:'synthetic deterministic key only',simulation:'mock RPC before/after; sigVerify false/true; no actual network execution',userSignatures:0,sends:0}));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>clearTimeout(watchdog));
