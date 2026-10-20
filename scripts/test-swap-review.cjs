'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),ts=require('typescript'),Module=require('module');
function load(file){const filename=path.resolve(file),m=new Module(filename,module);m.filename=filename;m.paths=module.paths;const out=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});m._compile(out.outputText,filename);return m.exports;}
const r=load('lib/trading/review.ts');
const review={id:'fixture',side:'BUY',wallet:'fixture-wallet',network:'mainnet-beta',mint:r.PLOV_MINT,poolAddresses:['fixture-upper','fixture-lower'],amountIn:1000000000n,quotedOut:700000000000000n,minimumOut:690000000000000n,messageFee:10000n,temporaryRent:2039280n,newAtaRent:2039280n,extraReserve:5000n,expiresAtMs:2000};
const message=Uint8Array.from([1,2,3]);const context=()=>({launchEnabled:true,accountChecksPassed:true,wallet:review.wallet,network:review.network,nowMs:1000,currentBlockHeight:10,lastValidBlockHeight:20,nativeBalance:2000000000n,plovBalance:0n,simulation:{reviewId:review.id,message,succeeded:true},message});
let checks=0;function reject(name,patch){assert.throws(()=>r.assertReviewReady(review,message,{...context(),...patch}),undefined,name);checks++;}
assert.equal(r.TRADE_LAUNCH_ENABLED,false);checks++;
assert.equal(r.upfrontRequired(review),1004093560n);checks++;
assert.equal(r.formatAtoms(1n),'0.000000001');assert.equal(r.formatAtoms(12345678901234567890n),'12345678901.23456789');checks+=2;
r.assertReviewReady(review,message,context());checks++;
reject('closed launch',{launchEnabled:false});reject('wrong wallet',{wallet:'other'});reject('wrong network',{network:'devnet'});reject('unverified accounts',{accountChecksPassed:false});reject('quote expiry',{nowMs:2000});reject('blockhash expiry',{currentBlockHeight:21});reject('message mutation',{message:Uint8Array.from([1,2,4])});reject('wrong simulation',{simulation:{...context().simulation,reviewId:'other'}});reject('failed simulation',{simulation:{...context().simulation,succeeded:false}});reject('fee/rent shortage',{nativeBalance:r.upfrontRequired(review)-1n});
const sell={...review,side:'SELL',amountIn:100000000000000n};assert.throws(()=>r.assertReviewReady(sell,message,{...context(),plovBalance:1n}));checks++;
assert.throws(()=>r.upfrontRequired({...review,messageFee:null}));checks++;
(async()=>{
 let calls=0;const tx={message,signed:false};const base={review,reviewedMessage:message,transaction:tx,readContext:context,getMessage:t=>t.message,verifySignedTransaction:t=>t.signed,wallet:{signTransaction:async t=>{calls++;return {...t,signed:true};}}};
 await assert.rejects(()=>r.signReviewedTransaction({...base,readContext:()=>({...context(),launchEnabled:false})}));assert.equal(calls,0);checks++;
 const signed=await r.signReviewedTransaction(base);assert(signed.signed);assert.equal(calls,1);checks++;
 await assert.rejects(()=>r.signReviewedTransaction({...base,wallet:{signTransaction:async t=>({...t,signed:true,message:Uint8Array.from([9])})}}),/changed/);checks++;
 let walletChanged=false;await assert.rejects(()=>r.signReviewedTransaction({...base,readContext:()=>({...context(),wallet:walletChanged?'other':review.wallet}),wallet:{signTransaction:async t=>{walletChanged=true;return {...t,signed:true};}}}),/Wallet or network changed/);checks++;
 await assert.rejects(()=>r.signReviewedTransaction({...base,verifySignedTransaction:()=>false}),/signature/);checks++;
 await assert.rejects(()=>r.signReviewedTransaction({...base,wallet:{signTransaction:async()=>{throw Error('User rejected');}}}),/User rejected/);checks++;
 // SSR checks both languages without mounting a public page or wallet provider.
 const original=Module._resolveFilename;Module._resolveFilename=function(name,...args){if(name==='@/lib/trading/review')return path.resolve('lib/trading/review.ts');return original.call(this,name,...args);};
 require.cache[path.resolve('lib/trading/review.ts')]={exports:r};const {SwapReview}=load('components/trading/SwapReview.tsx'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
 for(const locale of ['en','ru']){const html=renderToStaticMarkup(React.createElement(SwapReview,{review,locale})),text=html.replace(/<[^>]*>/g,'');assert(text.includes(r.PLOV_MINT));assert(text.includes('1.00409356 SOL'));assert(!html.includes('<button'));assert(!html.includes('<form'));checks++;}
 Module._resolveFilename=original;
 console.log(JSON.stringify({status:'PASS',checks,wallet:'fake adapter only',native_sends:0,public_routes_added:0}));
})().catch(e=>{console.error(e);process.exitCode=1;});
