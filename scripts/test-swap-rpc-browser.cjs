'use strict';
// An isolated Chromium + native IndexedDB + actual HTTP fixture. The explicit
// test-only fetch bridge maps a fictional HTTPS RPC to our loopback server.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),Module=require('node:module'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {Transaction}=require('@solana/web3.js'),bs58=require('bs58'),esbuild=require('esbuild');
const APP=path.resolve(__dirname,'..'),runtime=process.env.PLOV_BROWSER_RUNTIME||path.resolve(APP,'../continuation_v58/browser-runtime'),br=Module.createRequire(path.join(runtime,'package.json')),{chromium}=br('playwright');
const dir=process.env.PLOV_RPC_BROWSER_RESULTS||fs.mkdtempSync(path.join(os.tmpdir(),'plov-rpc-results-'));fs.mkdirSync(dir,{recursive:true});
const out={status:'RUNNING',scope:'ACTUAL_CHROMIUM_CORE_INDEXEDDB_RPC_ADAPTER_HTTP; SYNTHETIC_SIGNER_AND_LOCAL_RPC_RESPONSES; NO_MAINNET',wireRequests:[],externalRequests:[],pageErrors:[],realWalletPrompts:0,mainnetSends:0};
let browserContext,server,origin;const save=()=>fs.writeFileSync(path.join(dir,'rpc-browser-results.json'),JSON.stringify(out,null,2));const watchdog=setTimeout(()=>{out.status='TIMEOUT';save();process.exit(1);},60000);
(async()=>{
 const bundle=await esbuild.build({absWorkingDir:APP,entryPoints:['lib/trading/engine/index.mjs'],platform:'browser',format:'iife',globalName:'PLOVTradeEngine',bundle:true,minify:true,write:false,alias:{'@coral-xyz/anchor/dist/cjs/utils/bytes':'./lib/trading/engine/anchor-browser-bytes.mjs'},target:'es2022',inject:['scripts/browser-buffer.mjs'],define:{'process.env.NODE_ENV':'"production"'}});
 out.bundleSha256=crypto.createHash('sha256').update(bundle.outputFiles[0].text).digest('hex');
 server=http.createServer((req,res)=>{
  if(req.method!=='POST'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><title>Private RPC fixture</title>');}
  let body='';req.on('data',b=>body+=b);req.on('end',()=>{try{
   const mode=new URL(req.url,'http://localhost').searchParams.get('mode'),q=JSON.parse(body),entry={mode,method:q.method,id:q.id};out.wireRequests.push(entry);let result;
   if(q.method==='getGenesisHash')result='5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
   else if(q.method==='sendTransaction'){
    const bytes=Buffer.from(q.params[0],'base64'),tx=Transaction.from(bytes);assert(tx.verifySignatures(true));assert.equal(tx.signatures.length,2);entry.bytes=bytes.length;entry.sha256=crypto.createHash('sha256').update(bytes).digest('hex');entry.signature=bs58.encode(tx.signature);entry.options=q.params[1];result=entry.signature;
    if(mode==='http429'){res.writeHead(429);return res.end('rate limited');}
    if(mode==='transportError'){const t=setTimeout(()=>res.destroy(),5000);res.on('close',()=>clearTimeout(t));return;}
    if(mode==='differentSignature')result=bs58.encode(Buffer.alloc(64,9));
   }else if(q.method==='getSignatureStatuses'){
    entry.signature=q.params[0][0];entry.searchHistory=q.params[1].searchTransactionHistory;
    result={context:{slot:110},value:['stable','transportError','postDispatchEvent'].includes(mode)?[{slot:105,confirmationStatus:'finalized',err:null}]:[null]};
   }else if(q.method==='isBlockhashValid')result={context:{slot:111},value:mode==='claimEvent'};
   else throw Error('Unexpected method');
   res.setHeader('Content-Type','application/json');res.end(JSON.stringify({jsonrpc:'2.0',id:q.id,result}));
  }catch(e){out.serverError=String(e);res.writeHead(500);res.end('fixture error');}});
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
 browserContext=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(),'plov-rpc-profile-')),{executablePath:process.env.PLOV_CHROMIUM||path.join(runtime,'extracted/chromium'),headless:true,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});out.browser=browserContext.browser().version();
 await browserContext.route('**/*',route=>{if(new URL(route.request().url()).origin!==origin){out.externalRequests.push(route.request().url());return route.abort();}return route.continue();});
 const page=await browserContext.newPage();page.on('pageerror',e=>out.pageErrors.push(e.message));await page.goto(origin);await page.addScriptTag({content:bundle.outputFiles[0].text});
 const cdp=await browserContext.newCDPSession(page);await cdp.send('Browser.grantPermissions',{origin,permissions:['durableStorage']});assert.equal(await page.evaluate(()=>navigator.storage.persist()),true);
 await page.evaluate(async()=>{window.store=await PLOVTradeEngine.openSwapReceiptStore({indexedDB,storageManager:navigator.storage,databaseName:'rpc_integration',epochId:'isolated_epoch',initialize:true});});
 const source=fs.readFileSync(path.join(APP,'scripts/test-trading-browser.cjs'),'utf8'),match=source.match(/const output=await vm\.runInContext\(`([\s\S]*?)`,sandbox/);assert(match);let body=match[1];
 function replaceOnce(from,to){assert.equal(body.split(from).length,2,'Fixture replacement: '+from);body=body.replace(from,to);}
 replaceOnce("['stable','claimEvent','transportError','postDispatchEvent']","['stable','claimEvent','transportError','postDispatchEvent','differentSignature','http429']");
 replaceOnce('const listeners=new Set();let enqueues=0,claims=0;',`const rpcConnection={rpcEndpoint:'https://fixture.invalid/rpc'};
   const adapter=await PLOVTradeEngine.createSwapRpcAdapter({connection:rpcConnection,timeoutMs:1000,fetch:(url,init)=>{if(url!==rpcConnection.rpcEndpoint)throw Error('RPC endpoint mismatch');return fetch('/rpc?mode='+mode,init);}});
   let expectedBytes;const listeners=new Set();let enqueues=0,claims=0;`);
 replaceOnce("claimIntent:async receipt=>{claims++;if(mode==='claimEvent')emit();return true;}","claimIntent:async receipt=>{claims++;const ok=await store.claim(receipt);if(mode==='claimEvent')emit();return ok;}");
 replaceOnce("subscribe:fn=>{listeners.add(fn);return ()=>listeners.delete(fn);}","subscribe:fn=>{listeners.add(fn);const stop=store.subscribeInvalidation(fn);return ()=>{listeners.delete(fn);stop();};}");
 replaceOnce("enqueue:async(bytes,receipt,context)=>{enqueues++;if(!(bytes instanceof Uint8Array)||context.minContextSlot!==100||listeners.size!==1)throw Error('Bad dispatch fixture');if(mode==='transportError')throw Error('fixture timeout');if(mode==='postDispatchEvent')emit();return receipt.signature;}","enqueue:(bytes,receipt,context)=>{enqueues++;expectedBytes=Uint8Array.from(bytes);const pending=adapter.enqueue(bytes,receipt,context);if(mode==='postDispatchEvent')emit();return pending;}");
 replaceOnce("mode==='transportError'?'UNKNOWN':'PENDING'","['transportError','differentSignature','http429'].includes(mode)?'UNKNOWN':'PENDING'");
 replaceOnce("attemptCases.push({mode,status:'PASS',fakeEnqueues:enqueues});",`const stored=await store.get('browser_'+mode);if(!stored)throw Error('Missing persisted intent');
   if(result)await store.recordOutcome(result);
   const latest=await store.get(stored.intentId);if(latest.state!==(result?result.state:'DISPATCH_INTENT'))throw Error('Outcome not persisted');
   const recovered=(await store.recover()).find(x=>x.intentId===stored.intentId);if(!recovered||recovered.canAutomaticallyDispatch!==false||recovered.signature!==stored.signature)throw Error('Unsafe recovery');
   if(await store.claim({...stored,state:'DISPATCH_INTENT'})!==false)throw Error('Durable duplicate accepted');
   const observation=await adapter.reconcile(result||stored,{minContextSlot:100});
   const expectedObservation=['stable','transportError','postDispatchEvent'].includes(mode)?'FINALIZED_SUCCESS_OBSERVED':(mode==='claimEvent'?'UNRESOLVED_VALID_BLOCKHASH':'UNRESOLVED_EXPIRED_BLOCKHASH');
   if(observation.observation!==expectedObservation||observation.canAutomaticallyDispatch!==false)throw Error('Bad recovery observation');
   let duplicateBlocked=false;try{if(expectedBytes)await adapter.enqueue(expectedBytes,stored,{minContextSlot:100,currentBlockHeight:10});else duplicateBlocked=true;}catch{duplicateBlocked=true;}if(!duplicateBlocked)throw Error('Duplicate dispatched');
   const rawHash=expectedBytes?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',expectedBytes)),x=>x.toString(16).padStart(2,'0')).join(''):null;
   adapter.close();attemptCases.push({mode,status:'PASS',httpSends:enqueues,receiptState:result?result.state:stored.state,signature:stored.signature,observation:observation.observation,rawHash,duplicateBlocked});`);
 const result=await page.evaluate(body);out.cases=result.attemptCases;assert.equal(out.cases.length,6);
 for(const item of out.cases){const sends=out.wireRequests.filter(x=>x.mode===item.mode&&x.method==='sendTransaction');assert.equal(sends.length,item.mode==='claimEvent'?0:1);if(sends.length){assert.equal(sends[0].signature,item.signature);assert.equal(sends[0].sha256,item.rawHash);assert.deepEqual(sends[0].options,{encoding:'base64',skipPreflight:false,preflightCommitment:'finalized',maxRetries:0,minContextSlot:100});}const status=out.wireRequests.find(x=>x.mode===item.mode&&x.method==='getSignatureStatuses');assert.equal(status.signature,item.signature);assert.equal(status.searchHistory,true);}
 assert.equal(out.serverError,undefined);assert.deepEqual(out.pageErrors,[]);assert.deepEqual(out.externalRequests,[]);out.status='PASS';save();console.log(JSON.stringify({status:'PASS',checks:out.cases.length,browser:out.browser,mainnetSends:0}));
})().catch(e=>{out.status='FAIL';out.error=String(e.stack||e);save();console.error(e);process.exitCode=1;}).finally(async()=>{clearTimeout(watchdog);if(browserContext)await browserContext.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}});
