'use strict';
// Offline account review only: no RPC, wallet, signing, issuance or acceptance.
const {createHash}=require('node:crypto');
const {PublicKey}=require('@solana/web3.js');
const {cpAmmCoder,deriveConfigAddress}=require('@meteora-ag/cp-amm-sdk');
const BN=require('bn.js');
const PROGRAM='cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG';
const GENESIS='5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
const DISCRIMINATOR=Buffer.from([155,12,170,224,30,250,204,130]);
function requireThat(ok,code){if(!ok)throw Error(code);}
function exactObject(o,keys,code){requireThat(o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join('|')===[...keys].sort().join('|'),code);}
function integer(n,code){requireThat(Number.isSafeInteger(n)&&n>=0,code);return n;}
function pub(s,code){try{requireThat(typeof s==='string',code);const p=new PublicKey(s);requireThat(p.toBase58()===s,code);return p;}catch{throw Error(code);}}
function reviewAccount(snapshot,expected,nowMs=Date.now()){
 exactObject(expected,['authority','index','address','minContextSlot','maxSlotLag','maxAgeMs'],'EXPECTED_SCHEMA');
 const authority=pub(expected.authority,'EXPECTED_AUTHORITY_REQUIRED');
 requireThat(!authority.equals(PublicKey.default),'PUBLIC_AUTHORITY_REJECTED');
 requireThat(typeof expected.index==='string'&&/^(0|[1-9][0-9]*)$/.test(expected.index),'INDEX_DECIMAL_STRING_REQUIRED');
 const index=BigInt(expected.index);requireThat(index<=18446744073709551615n,'INDEX_OUT_OF_U64');
 const derived=deriveConfigAddress(new BN(expected.index));
 requireThat(pub(expected.address,'EXPECTED_ADDRESS_REQUIRED').equals(derived),'EXPECTED_PDA_MISMATCH');
 const floor=integer(expected.minContextSlot,'SLOT_FLOOR');
 const lag=integer(expected.maxSlotLag,'SLOT_LAG');
 const age=integer(expected.maxAgeMs,'MAX_AGE');requireThat(age>0,'MAX_AGE');integer(nowMs,'NOW');
 exactObject(snapshot,['schema','genesisBefore','genesisAfter','capturedAt','currentFinalizedSlot','commitment','address','accountResponse'],'SNAPSHOT_SCHEMA');
 requireThat(snapshot.schema===1,'SNAPSHOT_VERSION');
 requireThat(snapshot.genesisBefore===GENESIS&&snapshot.genesisAfter===GENESIS,'GENESIS_MISMATCH');
 requireThat(snapshot.commitment==='finalized','FINALIZED_REQUIRED');
 requireThat(typeof snapshot.capturedAt==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(snapshot.capturedAt),'CAPTURE_TIME');
 const at=Date.parse(snapshot.capturedAt);requireThat(Number.isFinite(at)&&new Date(at).toISOString()===snapshot.capturedAt&&at<=nowMs&&nowMs-at<=age,'CAPTURE_TIME_STALE_OR_FUTURE');
 requireThat(pub(snapshot.address,'SNAPSHOT_ADDRESS').equals(derived),'SNAPSHOT_PDA_MISMATCH');
 const response=snapshot.accountResponse;requireThat(response&&response.context&&response.value,'ACCOUNT_MISSING');
 const slot=integer(response.context.slot,'CONTEXT_SLOT'),current=integer(snapshot.currentFinalizedSlot,'CURRENT_SLOT');
 requireThat(slot>=floor&&current>=slot&&current-slot<=lag,'SLOT_STALE_OR_INCONSISTENT');
 const a=response.value;requireThat(a.owner===PROGRAM,'OWNER_MISMATCH');requireThat(a.executable===false,'EXECUTABLE_REJECTED');
 requireThat(Array.isArray(a.data)&&a.data.length===2&&a.data[1]==='base64'&&typeof a.data[0]==='string','BASE64_ENCODING');
 requireThat(a.data[0].length===440,'CONFIG_SIZE');const raw=Buffer.from(a.data[0],'base64');
 requireThat(raw.length===328&&raw.toString('base64')===a.data[0],'CANONICAL_BASE64_OR_SIZE');
 requireThat(raw.subarray(0,8).equals(DISCRIMINATOR),'CONFIG_DISCRIMINATOR');
 requireThat(raw[202]===1,'DYNAMIC_CONFIG_REQUIRED');
 requireThat(raw.subarray(40,72).equals(authority.toBuffer()),'AUTHORITY_MISMATCH');
 requireThat(raw.readBigUInt64LE(208)===index,'ACCOUNT_INDEX_MISMATCH');
 requireThat(raw.subarray(248,264).every(n=>n===0),'PERMISSION_ZERO_REQUIRED');
 const decoded=cpAmmCoder.accounts.decode('Config',raw);
 requireThat(decoded.config_type===1&&decoded.index.toString()===expected.index&&decoded.pool_creator_authority.equals(authority)&&decoded.permission.isZero(),'SDK_DECODE_DISAGREEMENT');
 return {schema:1,status:'EXPECTED_ACCOUNT_FIELDS_MATCH_ONLY',address:derived.toBase58(),authority:authority.toBase58(),index:expected.index,permission:'0',contextSlot:slot,rawSha256:createHash('sha256').update(raw).digest('hex'),issuanceAccepted:false,poolCreationAuthorized:false,readyForNetworkSend:false,MAINNET_GO:'NO',remaining:['Authenticity of caller-supplied expectations and RPC/context provenance','Current program/deployment/ELF pins and applicable source/build review','Successful finalized issuance transaction and historical Operator authorization path','Explicit project approval and actual pool/manifest acceptance']};
}
module.exports={reviewAccount,PROGRAM,GENESIS};
if(require.main===module){
 try{const fs=require('node:fs');requireThat(process.argv.length===4,'USAGE: node config-account-check.cjs SNAPSHOT.json EXPECTED.json');const result=reviewAccount(JSON.parse(fs.readFileSync(process.argv[2],'utf8')),JSON.parse(fs.readFileSync(process.argv[3],'utf8')));process.stdout.write(JSON.stringify(result,null,2)+'\n');}
 catch(e){process.stderr.write('Account review rejected: '+e.message+'\n');process.exitCode=1;}
}
