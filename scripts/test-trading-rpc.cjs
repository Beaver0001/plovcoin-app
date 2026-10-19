'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict'),esbuild=require('esbuild');
const {PublicKey}=require('@solana/web3.js'),{CpAmm}=require('@meteora-ag/cp-amm-sdk');
const fixture=JSON.parse(fs.readFileSync('scripts/fixtures/trading-accounts.json','utf8'));
const clone=x=>JSON.parse(JSON.stringify(x));let checks=0;
function connection(f=clone(fixture),overrides={}){
 const calls=[];const conn={rpcEndpoint:'https://fixture.invalid',calls,
  getGenesisHash:async()=>{calls.push('getGenesisHash');return '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';},
  getMultipleAccountsInfoAndContext:async(keys,config)=>{calls.push('getMultipleAccounts');assert.equal(config.commitment,'finalized');return {context:{slot:f.slot},value:keys.map(k=>{const a=f.accounts[k.toBase58()];return a?{...a,data:Buffer.from(a.data,'base64'),owner:new PublicKey(a.owner)}:null;})};},
  getLatestBlockhashAndContext:async()=>({context:{slot:f.slot},value:{blockhash:f.wallet,lastValidBlockHeight:20}}),
  getMinimumBalanceForRentExemption:async()=>2039280,
  getFeeForMessage:async message=>{conn.feeMessage=Buffer.from(message.serialize());return {context:{slot:f.slot},value:10000};},
  simulateTransaction:async(tx,config)=>{calls.push('simulateTransaction');assert.equal(config.sigVerify,false);assert.equal(config.replaceRecentBlockhash,false);assert(Buffer.from(tx.message.serialize()).equals(conn.feeMessage));assert.equal(tx.signatures.length,2);assert(tx.signatures[0].every(x=>x===0));assert(tx.signatures[1].some(x=>x!==0));return {context:{slot:f.slot},value:{err:null,unitsConsumed:50000}};},
  getBlockHeight:async()=>10,...overrides};return conn;
}
(async()=>{
 const output=await esbuild.build({entryPoints:['lib/trading/live-accounts.mjs'],bundle:true,platform:'node',packages:'external',format:'cjs',write:false});const m=new Module(path.resolve('scripts/rpc-fixture-module.cjs'),module);m.filename=path.resolve('scripts/rpc-fixture-module.cjs');m.paths=module.paths;m._compile(output.outputFiles[0].text,m.filename);const {loadVerifiedRoute,prepareVerifiedSwap}=m.exports;
 const c=connection(),snapshot=await loadVerifiedRoute(c,fixture.manifest,fixture.wallet);
 assert.equal(snapshot.slot,100);assert.equal(c.calls.filter(x=>x==='getMultipleAccounts').length,1);assert(!snapshot.pools);checks++;
 const BN=require('bn.js'),args={side:'BUY',amountIn:new BN('1000000000'),slippageBps:50,computeUnitLimit:200000,computeUnitPriceMicroLamports:0n,extraReserveLamports:0n,maxSnapshotAgeMs:60000,quoteLifetimeMs:15000};
 const prepared=await prepareVerifiedSwap(c,snapshot,args);assert(prepared.review.minimumOut>0n);assert.equal(prepared.simulation.signatureVerification,false);assert(Buffer.from(prepared.simulation.message).equals(c.feeMessage));checks++;
 const desc=fixture.manifest.pools,wrong='11111111111111111111111111111111';
 async function rejectAccounts(name,mutate,overrides={}){const f=clone(fixture);mutate(f);const conn=connection(f,overrides);await assert.rejects(()=>loadVerifiedRoute(conn,f.manifest,f.wallet),undefined,name);assert(!conn.calls.includes('simulateTransaction'));checks++;}
 await rejectAccounts('wrong chain',()=>{},{getGenesisHash:async()=> 'devnet'});
 await rejectAccounts('missing pool',f=>{delete f.accounts[desc[0].address];});
 await rejectAccounts('wrong pool owner',f=>{f.accounts[desc[0].address].owner=wrong;});
 await rejectAccounts('program bytes changed',f=>{f.manifest.programDataSha256='0'.repeat(64);});
 await rejectAccounts('deployment changed',f=>{f.manifest.deploymentSlot='1';});
 await rejectAccounts('wrong PDA',f=>{f.manifest.pools[0].address=wrong;});
 await rejectAccounts('wrong geometry',f=>{f.manifest.pools[0].sqrtMinPrice='1';});
 await rejectAccounts('wrong liquidity',f=>{f.manifest.pools[0].liquidity='1';});
 await rejectAccounts('wrong config authority',f=>{f.manifest.pools[1].config.authority=wrong;});
 await rejectAccounts('bad mint decimals',f=>{const k='B4LhtMwbKh8D1nfj7dE6FefKpg7U2qkbYC371DBcJq9x',a=f.accounts[k],b=Buffer.from(a.data,'base64');b[44]=6;a.data=b.toString('base64');});
 await rejectAccounts('clock wrong bank',f=>{f.slot=101;});
 const poolDecoder=new CpAmm(connection())._program.coder.accounts;
 const disabled=clone(fixture),state=poolDecoder.decode('pool',Buffer.from(disabled.accounts[desc[0].address].data,'base64'));state.poolStatus=1;const encoded=Buffer.alloc(1112);Buffer.from(disabled.accounts[desc[0].address].data,'base64').copy(encoded,0,0,8);poolDecoder.accountLayouts.get('pool').layout.encode(state,encoded.subarray(8));disabled.accounts[desc[0].address].data=encoded.toString('base64');await assert.rejects(()=>loadVerifiedRoute(connection(disabled),disabled.manifest,disabled.wallet));checks++;
 const vaults=Object.keys(fixture.accounts).filter(k=>Buffer.from(fixture.accounts[k].data,'base64').length===165);const vaultKey=vaults.find(k=>k!==snapshot.plovAta);
 await rejectAccounts('wrong vault authority',f=>{const a=f.accounts[vaultKey],b=Buffer.from(a.data,'base64');b.fill(0,32,64);a.data=b.toString('base64');});
 await rejectAccounts('frozen user ATA',f=>{const a=f.accounts[snapshot.plovAta],b=Buffer.from(a.data,'base64');b[108]=2;a.data=b.toString('base64');});
 async function rejectPreflight(name,overrides,patch={}){const conn=connection(clone(fixture),overrides),s=await loadVerifiedRoute(conn,fixture.manifest,fixture.wallet);await assert.rejects(()=>prepareVerifiedSwap(conn,s,{...args,...patch}),undefined,name);checks++;}
 await rejectPreflight('unknown fee',{getFeeForMessage:async()=>({context:{slot:100},value:null})});
 await rejectPreflight('old fee context',{getFeeForMessage:async()=>({context:{slot:99},value:10000})});
 await rejectPreflight('failed simulation',{simulateTransaction:async()=>({context:{slot:100},value:{err:'fixture error'}})});
 await rejectPreflight('replaced blockhash',{simulateTransaction:async()=>({context:{slot:100},value:{err:null,replacementBlockhash:{blockhash:fixture.wallet}}})});
 await rejectPreflight('old simulation',{simulateTransaction:async()=>({context:{slot:99},value:{err:null}})});
 await rejectPreflight('expired blockhash',{getBlockHeight:async()=>21});
 await rejectPreflight('SELL beyond balance',{}, {side:'SELL',amountIn:new BN('18446744073709551615')});
 await assert.rejects(()=>prepareVerifiedSwap(c,{...snapshot},args));checks++;
 // Async boundary regressions: trusted inputs are copied; a snapshot cannot
 // be moved to another connection or gain a new lifetime after slow RPC.
 const foreign=connection();await assert.rejects(()=>prepareVerifiedSwap(foreign,snapshot,args),/RPC connection changed/);assert.equal(foreign.calls.length,0);checks++;
 const altered=connection(),alteredSnapshot=await loadVerifiedRoute(altered,fixture.manifest,fixture.wallet);altered.rpcEndpoint='https://other.invalid';await assert.rejects(()=>prepareVerifiedSwap(altered,alteredSnapshot,args),/RPC connection changed/);assert(!altered.calls.includes('simulateTransaction'));checks++;
 await rejectPreflight('chain changes before preflight',{getGenesisHash:(()=>{let n=0;return async()=>++n===1?'5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d':'devnet';})()});
 await rejectPreflight('chain changes during preflight',{getGenesisHash:(()=>{let n=0;return async()=>++n<3?'5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d':'devnet';})()});
 const switching=connection();switching.getFeeForMessage=async()=>{switching.rpcEndpoint='https://changed.invalid';return {context:{slot:100},value:10000};};const switchingSnapshot=await loadVerifiedRoute(switching,fixture.manifest,fixture.wallet);await assert.rejects(()=>prepareVerifiedSwap(switching,switchingSnapshot,args),/RPC connection changed/);checks++;
 const mutableManifest=clone(fixture.manifest),mutableWallet=new PublicKey(fixture.wallet),copyConn=connection();copyConn.getGenesisHash=async()=>{mutableManifest.programDataSha256='0'.repeat(64);mutableManifest.pools[1].config.authority=wrong;mutableWallet._bn=new PublicKey(wrong)._bn;return '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';};const copied=await loadVerifiedRoute(copyConn,mutableManifest,mutableWallet);assert.equal(copied.wallet,fixture.wallet);checks++;
 const rawConn=connection(),originalGet=rawConn.getMultipleAccountsInfoAndContext;let returned;
 rawConn.getMultipleAccountsInfoAndContext=async(...a)=>(returned=await originalGet(...a));
 const originalDigest=globalThis.crypto.subtle.digest;
 try {globalThis.crypto.subtle.digest=function(...a){const v=returned.value.find(v=>v&&v.data.length===165);v.data.fill(0,32,64);return originalDigest.apply(this,a);};await loadVerifiedRoute(rawConn,fixture.manifest,fixture.wallet);checks++;} finally {globalThis.crypto.subtle.digest=originalDigest;}
 const amountConn=connection(),amountSnapshot=await loadVerifiedRoute(amountConn,fixture.manifest,fixture.wallet),mutableAmount=args.amountIn.clone();amountConn.getGenesisHash=async()=>{mutableAmount.iaddn(1);return '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';};const amountResult=await prepareVerifiedSwap(amountConn,amountSnapshot,{...args,amountIn:mutableAmount});assert.equal(amountResult.review.amountIn,1000000000n);checks++;
 const realNow=Date.now;let offset=0;Date.now=()=>realNow()+offset;
 try {
  const delayed=connection(),get=delayed.getMultipleAccountsInfoAndContext;delayed.getMultipleAccountsInfoAndContext=async(...a)=>{offset+=1000;return get(...a);};const delayedSnapshot=await loadVerifiedRoute(delayed,fixture.manifest,fixture.wallet);await assert.rejects(()=>prepareVerifiedSwap(delayed,delayedSnapshot,{...args,maxSnapshotAgeMs:500}),/snapshot expired/);assert(!delayed.calls.includes('simulateTransaction'));checks++;
  offset=0;const backwards=connection(),s=await loadVerifiedRoute(backwards,fixture.manifest,fixture.wallet);offset=-10000;await assert.rejects(()=>prepareVerifiedSwap(backwards,s,args),/clock changed/);checks++;
 } finally {Date.now=realNow;}
 const capped=connection(),began=Date.now(),cappedSnapshot=await loadVerifiedRoute(capped,fixture.manifest,fixture.wallet),capResult=await prepareVerifiedSwap(capped,cappedSnapshot,{...args,maxSnapshotAgeMs:5000,quoteLifetimeMs:60000});assert(capResult.review.expiresAtMs<=began+5000);assert(capResult.review.expiresAtMs>Date.now());checks++;
 const perfDescriptor=Object.getOwnPropertyDescriptor(globalThis.performance,'now');let tick=0;Object.defineProperty(globalThis.performance,'now',{value:()=>tick,configurable:true});
 try {const monotonic=connection(),s=await loadVerifiedRoute(monotonic,fixture.manifest,fixture.wallet);tick=60001;await assert.rejects(()=>prepareVerifiedSwap(monotonic,s,args),/snapshot expired/);checks++;}finally {if(perfDescriptor)Object.defineProperty(globalThis.performance,'now',perfDescriptor);else delete globalThis.performance.now;}
 console.log(JSON.stringify({status:'PASS',checks,fixture:fixture.scope,accountSnapshotRequests:1,simulation:'mock RPC; exact message; user signature zero',sends:0}));
})().catch(e=>{console.error(e);process.exitCode=1;});
