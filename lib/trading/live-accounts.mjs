import { Buffer } from 'buffer';
import BN from 'bn.js';
import { PublicKey, SystemProgram, SYSVAR_CLOCK_PUBKEY,VersionedTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID,NATIVE_MINT,getAssociatedTokenAddressSync,unpackMint,unpackAccount } from '@solana/spl-token';
import { CpAmm,CP_AMM_PROGRAM_ID,deriveCustomizablePoolAddress,derivePoolAddress,deriveTokenVaultAddress,derivePoolAuthority,deriveConfigAddress,getBaseFeeParams } from '@meteora-ag/cp-amm-sdk';
import { planBuy,planSell } from './engine/swap-route.mjs';
import { prepareWalletTransaction,finalizeWalletReview } from './wallet-transaction.mjs';
import { assertReviewReady } from './review';
const GENESIS='5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
const MINT=new PublicKey('B4LhtMwbKh8D1nfj7dE6FefKpg7U2qkbYC371DBcJq9x');
const LOADER=new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111');
const SYSVAR=new PublicKey('Sysvar1111111111111111111111111111111111111');
const verified=new WeakMap();
const preflights=new WeakMap();
const pk=x=>new PublicKey(x instanceof PublicKey?x.toBytes():x);
const equal=(a,b)=>pk(a).equals(pk(b));
const safe=(x,name)=>{if(!Number.isSafeInteger(x)||x<0)throw Error('Unsafe '+name);return x;};
const hash=async bytes=>Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
const timeNow=()=>({wall:Date.now(),monotonic:globalThis.performance.now()});
function assertConnection(connection,record){
  if(connection!==record.connection||connection.rpcEndpoint!==record.endpoint)throw Error('RPC connection changed; reload accounts');
}
function snapshotDeadline(record,maxAgeMs){
  const now=timeNow(),wallAge=now.wall-record.started.wall,elapsed=now.monotonic-record.started.monotonic;
  if(wallAge<0||elapsed<0||Math.max(wallAge,elapsed)>=maxAgeMs)throw Error('Account snapshot expired or clock changed');
  const remaining=Math.floor(maxAgeMs-Math.max(wallAge,elapsed));
  return safe(now.wall+remaining,'snapshot deadline');
}

// manifest must come from a separately approved/pinned source, not user input.
// No default production pool/config addresses are invented here.
export async function loadVerifiedRoute(connection, manifest, wallet, minContextSlot=0) {
  // Copy approved JSON before the first await. Later edits to the caller's
  // manifest/PublicKeys or RPC buffers must not alter this verification.
  manifest=JSON.parse(JSON.stringify(manifest??null));
  const started=timeNow(),endpoint=connection.rpcEndpoint;
  if(!manifest||!Array.isArray(manifest.pools)||manifest.pools.length!==2||manifest.pools[0].label!=='UPPER'||manifest.pools[1].label!=='LOWER')throw Error('Approved two-pool manifest required');
  if(!/^[a-f0-9]{64}$/.test(manifest.programDataSha256||''))throw Error('Approved program-data hash required');
  safe(minContextSlot,'minimum slot');wallet=pk(wallet);if(!PublicKey.isOnCurve(wallet.toBytes()))throw Error('Retail wallet must be on curve');
  const programData=pk(manifest.programData),ata=getAssociatedTokenAddressSync(MINT,wallet,false,TOKEN_PROGRAM_ID),authority=derivePoolAuthority();
  const descriptors=manifest.pools.map(p=>{
    const address=pk(p.address),config=p.config?pk(p.config.address):null;
    const derived=config?derivePoolAddress(config,MINT,NATIVE_MINT):deriveCustomizablePoolAddress(MINT,NATIVE_MINT);
    if(!address.equals(derived))throw Error('Pool PDA mismatch');
    return {...p,address,configAddress:config,vaultA:deriveTokenVaultAddress(MINT,address),vaultB:deriveTokenVaultAddress(NATIVE_MINT,address)};
  });
  if(descriptors[0].address.equals(descriptors[1].address)||descriptors[0].config||!descriptors[1].config)throw Error('Expected customizable UPPER and config-based LOWER');
  if(await connection.getGenesisHash()!==GENESIS)throw Error('Wrong chain');
  assertConnection(connection,{connection,endpoint});
  const keys=[CP_AMM_PROGRAM_ID,programData,MINT,NATIVE_MINT,SYSVAR_CLOCK_PUBKEY,wallet,ata,...descriptors.flatMap(p=>[p.address,p.vaultA,p.vaultB,...(p.configAddress?[p.configAddress]:[])])];
  const unique=[...new Map(keys.map(k=>[k.toBase58(),k])).values()];
  const response=await connection.getMultipleAccountsInfoAndContext(unique,{commitment:'finalized',minContextSlot});
  assertConnection(connection,{connection,endpoint});
  const slot=safe(response.context.slot,'snapshot slot');if(slot<minContextSlot||response.value.length!==unique.length)throw Error('Invalid account snapshot');
  const accounts=new Map(unique.map((k,i)=>{const a=response.value[i];return [k.toBase58(),a?{...a,owner:pk(a.owner),data:Buffer.from(a.data)}:null];}));
  const get=k=>{const a=accounts.get(pk(k).toBase58());if(!a)throw Error('Missing account '+pk(k).toBase58());safe(a.lamports,'account balance');return a;};
  // Missing pools stop before fee quotes, simulations, or wallet preparation.
  descriptors.forEach(p=>get(p.address));
  const program=get(CP_AMM_PROGRAM_ID),data=get(programData);
  if(!program.executable||!equal(program.owner,LOADER)||program.data.length!==36||program.data.readUInt32LE(0)!==2||!equal(new PublicKey(program.data.subarray(4,36)),programData))throw Error('Program identity mismatch');
  if(data.executable||!equal(data.owner,LOADER)||data.data.length<45||data.data.readUInt32LE(0)!==3||data.data.readBigUInt64LE(4).toString()!==String(manifest.deploymentSlot))throw Error('Program deployment mismatch');
  if(await hash(data.data)!==manifest.programDataSha256)throw Error('Program bytes changed');
  for(const mint of [MINT,NATIVE_MINT]){const info=get(mint);if(info.executable||!equal(info.owner,TOKEN_PROGRAM_ID)||info.data.length!==82)throw Error('Unsupported mint owner/layout');const m=unpackMint(mint,info,TOKEN_PROGRAM_ID);if(!m.isInitialized||m.decimals!==9)throw Error('Mint decimals/initialization mismatch');}
  const clock=get(SYSVAR_CLOCK_PUBKEY);if(!equal(clock.owner,SYSVAR)||clock.data.length!==40||clock.data.readBigUInt64LE(0)!==BigInt(slot))throw Error('Clock snapshot mismatch');
  const unix=clock.data.readBigInt64LE(32);if(unix<0n)throw Error('Invalid Clock time');
  const sdk=new CpAmm(connection),coder=sdk._program.coder.accounts;
  const fee=Buffer.alloc(32);Buffer.from(getBaseFeeParams({baseFeeMode:0,feeTimeSchedulerParam:{startingFeeBps:25.00004,endingFeeBps:25.00004,numberOfPeriod:0,totalDuration:0}}).data).copy(fee);
  const pools=descriptors.map(p=>{
    const info=get(p.address);if(info.executable||!equal(info.owner,CP_AMM_PROGRAM_ID)||info.data.length!==1112)throw Error('Unsupported pool owner/layout');
    const state=coder.decode('pool',info.data);
    if(!equal(state.tokenAMint,MINT)||!equal(state.tokenBMint,NATIVE_MINT)||!equal(state.tokenAVault,p.vaultA)||!equal(state.tokenBVault,p.vaultB)||!equal(state.creator,p.creator))throw Error('Pool mint/vault/creator mismatch');
    if(state.layoutVersion!==1||state.feeVersion!==1||state.tokenAFlag!==0||state.tokenBFlag!==0||!equal(state.whitelistedVault,PublicKey.default))throw Error('Unsupported pool profile');
    if(state.sqrtMinPrice.toString()!==p.sqrtMinPrice||state.sqrtMaxPrice.toString()!==p.sqrtMaxPrice||state.liquidity.toString()!==p.liquidity||state.poolType!==p.poolType||state.activationType!==p.activationType||state.activationPoint.toString()!==p.activationPoint)throw Error('Pool parameters differ from manifest');
    if(state.poolStatus!==0||![0,1].includes(state.activationType)||new BN(state.activationType===0?String(slot):unix.toString()).lt(state.activationPoint))throw Error('Pool disabled or not active');
    if(state.collectFeeMode!==1||state.poolFees.protocolFeePercent!==20||state.poolFees.dynamicFee.initialized!==0||state.poolFees.compoundingFeeBps!==0||!Buffer.from(state.poolFees.baseFee.baseFeeInfo.data).equals(fee))throw Error('Pool fee profile mismatch');
    if(state.liquidity.lten(0)||state.sqrtPrice.lt(state.sqrtMinPrice)||state.sqrtPrice.gt(state.sqrtMaxPrice))throw Error('Invalid pool price/liquidity');
    for(const [address,mint,native] of [[p.vaultA,MINT,false],[p.vaultB,NATIVE_MINT,true]]){const a=get(address);if(a.executable||a.data.length!==165||!equal(a.owner,TOKEN_PROGRAM_ID))throw Error('Unsupported vault');const v=unpackAccount(address,a,TOKEN_PROGRAM_ID);if(!v.isInitialized||v.isFrozen||!v.owner.equals(authority)||!v.mint.equals(mint)||v.isNative!==native||v.delegate)throw Error('Vault authority/state mismatch');}
    if(p.configAddress){const info=get(p.configAddress);if(info.executable||!equal(info.owner,CP_AMM_PROGRAM_ID)||info.data.length!==328)throw Error('Unsupported config');const c=coder.decode('config',info.data);if(c.configType!==1||c.permission.toString()!=='0'||!equal(c.poolCreatorAuthority,p.config.authority)||!deriveConfigAddress(c.index).equals(p.configAddress)||c.index.toString()!==p.config.index)throw Error('Config authority/index mismatch');}
    return {label:p.label,address:p.address,state};
  });
  if(!pools[0].state.sqrtMinPrice.eq(pools[1].state.sqrtMaxPrice)||pools[0].state.activationType!==pools[1].state.activationType)throw Error('Bands/activation types do not match');
  const user=accounts.get(wallet.toBase58());if(user&&(!equal(user.owner,SystemProgram.programId)||user.executable||user.data.length!==0))throw Error('Unsupported fee payer account');
  const balance=user?BigInt(safe(user.lamports,'wallet balance')):0n;
  const tokenInfo=accounts.get(ata.toBase58());let plovBalance=0n;
  if(tokenInfo){if(tokenInfo.executable||tokenInfo.data.length!==165||!equal(tokenInfo.owner,TOKEN_PROGRAM_ID))throw Error('Unsupported user ATA');const a=unpackAccount(ata,tokenInfo,TOKEN_PROGRAM_ID);if(!a.isInitialized||a.isFrozen||!a.owner.equals(wallet)||!a.mint.equals(MINT)||a.isNative)throw Error('User ATA mismatch');plovBalance=a.amount;}
  const result=Object.freeze({slot,unixTime:unix,wallet:wallet.toBase58(),mint:MINT.toBase58(),nativeBalance:balance,plovBalance,plovAtaExists:!!tokenInfo,plovAta:ata.toBase58()});
  const record={slot,unixTime:unix,wallet,mint:MINT,pools,program:sdk._program,nativeBalance:balance,plovBalance,plovAtaExists:!!tokenInfo,connection,endpoint,started,manifest};
  assertConnection(connection,record);verified.set(result,record);return result;
}

export function assertVerifiedSnapshot(snapshot){if(!verified.has(snapshot))throw Error('Snapshot did not pass account verification');}

export async function prepareVerifiedSwap(connection,snapshot,{side,amountIn,slippageBps,computeUnitLimit,computeUnitPriceMicroLamports,extraReserveLamports,maxSnapshotAgeMs,quoteLifetimeMs}){
  assertVerifiedSnapshot(snapshot);const record=verified.get(snapshot);
  if(!['BUY','SELL'].includes(side)||!Number.isSafeInteger(maxSnapshotAgeMs)||maxSnapshotAgeMs<=0||!Number.isSafeInteger(quoteLifetimeMs)||quoteLifetimeMs<=0)throw Error('Explicit side and freshness limits required');
  amountIn=amountIn.clone();
  assertConnection(connection,record);snapshotDeadline(record,maxSnapshotAgeMs);
  if(await connection.getGenesisHash()!==GENESIS)throw Error('Wrong chain');
  assertConnection(connection,record);snapshotDeadline(record,maxSnapshotAgeMs);
  const currentPoint=new BN(record.pools[0].state.activationType===0?String(record.slot):record.unixTime.toString());
  const plan=(side==='BUY'?planBuy:planSell)({pools:record.pools,amountIn,currentPoint,slippageBps});
  if(side==='SELL'&&(!record.plovAtaExists||record.plovBalance<BigInt(amountIn.toString())))throw Error('Insufficient PLOV');
  const latest=await connection.getLatestBlockhashAndContext({commitment:'confirmed',minContextSlot:record.slot});
  assertConnection(connection,record);
  if(safe(latest.context.slot,'blockhash slot')<record.slot)throw Error('Blockhash context regressed');
  safe(latest.value.lastValidBlockHeight,'last valid height');
  const rent=safe(await connection.getMinimumBalanceForRentExemption(165,'confirmed'),'rent quote');if(rent===0)throw Error('Unknown rent');
  assertConnection(connection,record);
  const prepared=await prepareWalletTransaction({plan,pools:record.pools,program:record.program,user:record.wallet,plovMint:record.mint,plovAtaExists:record.plovAtaExists,recentBlockhash:latest.value.blockhash,tokenAccountRentLamports:BigInt(rent),computeUnitLimit,computeUnitPriceMicroLamports});
  const message=prepared.envelope.transaction.compileMessage();
  const fee=await connection.getFeeForMessage(message,'confirmed');
  assertConnection(connection,record);
  if(fee.value===null||safe(fee.context.slot,'fee slot')<record.slot)throw Error('Unknown or stale message fee');
  const messageFeeLamports=BigInt(safe(fee.value,'message fee'));
  const versioned=new VersionedTransaction(message,prepared.envelope.transaction.signatures.map(s=>Uint8Array.from(s.signature||Buffer.alloc(64))));
  const simulation=await connection.simulateTransaction(versioned,{commitment:'confirmed',minContextSlot:record.slot,sigVerify:false,replaceRecentBlockhash:false});
  assertConnection(connection,record);
  if(safe(simulation.context.slot,'simulation slot')<record.slot||simulation.value.err!==null||simulation.value.replacementBlockhash)throw Error('Simulation failed or changed blockhash');
  if(!Buffer.from(versioned.message.serialize()).equals(Buffer.from(prepared.message)))throw Error('Simulation message changed');
  const currentBlockHeight=safe(await connection.getBlockHeight({commitment:'confirmed',minContextSlot:record.slot}),'current height');
  if(currentBlockHeight>latest.value.lastValidBlockHeight)throw Error('Blockhash expired');
  if(await connection.getGenesisHash()!==GENESIS)throw Error('Wrong chain');
  assertConnection(connection,record);
  const expiresAtMs=Math.min(safe(Date.now()+quoteLifetimeMs,'quote deadline'),snapshotDeadline(record,maxSnapshotAgeMs));
  const review=await finalizeWalletReview(prepared,{messageFeeLamports,extraReserveLamports,walletBalanceLamports:record.nativeBalance,expiresAtMs});
  assertConnection(connection,record);snapshotDeadline(record,maxSnapshotAgeMs);
  if(Date.now()>=expiresAtMs)throw Error('Quote expired during preparation');
  const result=Object.freeze({prepared,review,snapshot,lastValidBlockHeight:latest.value.lastValidBlockHeight,currentBlockHeight,simulation:Object.freeze({reviewId:review.id,message:Uint8Array.from(prepared.message),succeeded:true,slot:simulation.context.slot,signatureVerification:false}),scope:'READ_ONLY_RPC_PREFLIGHT; no user signature, no send, and no proof of wallet access. Refresh accounts/simulation/context before any separately authorized signature.'});
  preflights.set(result,{record,prepared,review,message:Buffer.from(prepared.message),maxSnapshotAgeMs,lastValidBlockHeight:latest.value.lastValidBlockHeight,lastAccountSlot:record.slot});
  return result;
}

// Read-only context reader for signPreparedSwap. No wallet call or broadcast.
// readWalletState is a synchronous sample from the trusted wallet/launch adapter;
// launchEnabled alone is not launch authorization. Production remains unmounted.
export async function refreshVerifiedSwapContext(connection,preflight,{phase,transaction,readWalletState}) {
  const p=preflights.get(preflight);
  if(!p)throw Error('Unknown verified preflight');
  if(!['before','after'].includes(phase)||typeof readWalletState!=='function')throw Error('Signing phase and wallet state reader required');
  const check=()=>{
    assertConnection(connection,p.record);snapshotDeadline(p.record,p.maxSnapshotAgeMs);
    if(Date.now()>=p.review.expiresAtMs)throw Error('Quote expired');
    if(!Buffer.from(transaction.serializeMessage()).equals(p.message))throw Error('Transaction changed after review');
    const state=readWalletState();
    if(!state.launchEnabled)throw Error('Trading is not open');
    if(state.wallet!==p.review.wallet||state.network!==p.review.network)throw Error('Wallet or network changed');
    return state;
  };
  check();
  // Work with an independent message/signature copy across RPC awaits.
  const versioned=new VersionedTransaction(transaction.compileMessage(),transaction.signatures.map(s=>Uint8Array.from(s.signature||Buffer.alloc(64))));
  if(phase==='after'&&!transaction.verifySignatures(true))throw Error('Missing or invalid transaction signature');
  const fresh=await loadVerifiedRoute(connection,p.record.manifest,p.record.wallet,p.lastAccountSlot);
  check();p.lastAccountSlot=Math.max(p.lastAccountSlot,fresh.slot);
  if(fresh.plovAtaExists!==preflight.snapshot.plovAtaExists)throw Error('ATA availability changed; prepare a new review');
  const fee=await connection.getFeeForMessage(versioned.message,'confirmed');check();
  if(fee.value===null||safe(fee.context.slot,'fee slot')<fresh.slot||BigInt(safe(fee.value,'message fee'))!==p.review.messageFee)throw Error('Message fee changed or is stale; prepare a new review');
  const rent=safe(await connection.getMinimumBalanceForRentExemption(165,'confirmed'),'rent quote');check();
  if(BigInt(rent)!==p.review.temporaryRent)throw Error('Account rent changed; prepare a new review');
  const simulation=await connection.simulateTransaction(versioned,{commitment:'confirmed',minContextSlot:fresh.slot,sigVerify:phase==='after',replaceRecentBlockhash:false});check();
  if(safe(simulation.context.slot,'simulation slot')<fresh.slot||simulation.value.err!==null||simulation.value.replacementBlockhash||!Buffer.from(versioned.message.serialize()).equals(p.message))throw Error('Simulation failed or changed message/context');
  const height=safe(await connection.getBlockHeight({commitment:'confirmed',minContextSlot:fresh.slot}),'current height');check();
  if(await connection.getGenesisHash()!==GENESIS)throw Error('Wrong chain');
  const state=check();
  if(phase==='after'&&!transaction.verifySignatures(true))throw Error('Missing or invalid transaction signature');
  const context={launchEnabled:state.launchEnabled,accountChecksPassed:true,wallet:state.wallet,network:state.network,nowMs:Date.now(),currentBlockHeight:height,lastValidBlockHeight:p.lastValidBlockHeight,nativeBalance:fresh.nativeBalance,plovBalance:fresh.plovBalance,simulation:Object.freeze({reviewId:p.review.id,message:Uint8Array.from(p.message),succeeded:true,slot:simulation.context.slot,signatureVerification:phase==='after'}),message:Uint8Array.from(p.message)};
  assertReviewReady(p.review,p.message,context);
  return Object.freeze(context);
}
