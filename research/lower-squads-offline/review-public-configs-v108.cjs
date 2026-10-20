'use strict';
// Offline review of retained public RPC evidence. No transaction or network API.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {PublicKey}=require('@solana/web3.js');
const {cpAmmCoder,deriveConfigAddress,deriveCustomizablePoolAddress}=require('@meteora-ag/cp-amm-sdk');
const BN=require('bn.js');
const raw=fs.readFileSync(__dirname+'/public-config-snapshot-v108.json');
const snapshot=JSON.parse(raw),rows=snapshot.response.value;
const authority='2bfo1Z7kfFu5BgmjCNCK5jAPqzV8emB39gCag62gravK';
const counts={publicStatic:0,privateStatic:0,dynamic:0,publicDynamic:0,approvedAuthorityDynamic:0};
const ranges={};const seen=new Set();
for(const {pubkey,account} of rows){
 assert(!seen.has(pubkey));seen.add(pubkey);
 assert.equal(account.owner,'cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG');assert.equal(account.executable,false);
 assert.equal(account.data[1],'base64');const b=Buffer.from(account.data[0],'base64');assert.equal(b.length,328);
 assert(b.subarray(0,8).equals(Buffer.from([155,12,170,224,30,250,204,130])));
 const c=cpAmmCoder.accounts.decode('Config',b);assert.equal(deriveConfigAddress(new BN(c.index.toString())).toBase58(),pubkey);
 assert.equal(c.config_type,b[202]);assert(c.pool_creator_authority.toBuffer().equals(b.subarray(40,72)));
 assert.equal(c.index.toString(),b.readBigUInt64LE(208).toString());
 assert([0,1].includes(c.config_type));const isPublic=c.pool_creator_authority.equals(PublicKey.default);
 if(c.config_type===1){counts.dynamic++;if(isPublic)counts.publicDynamic++;if(c.pool_creator_authority.toBase58()===authority)counts.approvedAuthorityDynamic++;}
 else if(isPublic){counts.publicStatic++;const k=c.sqrt_min_price.toString()+':'+c.sqrt_max_price.toString();ranges[k]=(ranges[k]||0)+1;}
 else counts.privateStatic++;
}
const a=new PublicKey('B4LhtMwbKh8D1nfj7dE6FefKpg7U2qkbYC371DBcJq9x'),b=new PublicKey('So11111111111111111111111111111111111111112');
const customizable=deriveCustomizablePoolAddress(a,b).toBase58();assert.equal(customizable,deriveCustomizablePoolAddress(b,a).toBase58());
const geometry=JSON.parse(fs.readFileSync(__dirname+'/v29-geometry-result.json'));
const sdkBytes=fs.readFileSync(require.resolve('@meteora-ag/cp-amm-sdk'));
assert.equal(crypto.createHash('sha256').update(sdkBytes).digest('hex'),geometry.sdkEntrySHA256);
const lowerCompatibility=geometry.rows.map(r=>{const l=r.legs.find(x=>x.name==='LOWER');assert(l);return {id:r.id,sqrtMin:l.sqrtMin,sqrtMax:l.sqrtMax,publicStaticRangeMatches:ranges[l.sqrtMin+':'+l.sqrtMax]||0};});
assert.equal(lowerCompatibility.length,12);assert(lowerCompatibility.every(r=>r.publicStaticRangeMatches===0));
const result={version:108,status:'PUBLIC_READ_NOT_PRODUCTION_ACCEPTANCE',capturedAt:snapshot.summary.capturedAt,slot:snapshot.response.context.slot,total:rows.length,counts,publicStaticRanges:ranges,snapshotSHA256:crypto.createHash('sha256').update(raw).digest('hex'),customizable:{address:customizable,seeds:'cpool + sorted mint pair; no config/range/authority seed',twoDistinctCustomizablePoolsForSamePair:false,scope:'Pinned SDK 1.5.1 PDA derivation, not a new native execution test'},supportReplyRequiredToContinue:false,actualConfigAccepted:false,MAINNET_GO:'NO',limitations:['One RPC, finalized retained-account scan with dataSize328; not cryptographic completeness, future availability, other layouts or historical issuance proof.','No current ProgramData/ELF/source-build parity check in this scan.','Public static bounds must match LOWER geometry; existence alone is insufficient.','Local verifier still intentionally requires approved private authority; public config would need separately reviewed acceptance.']};
result.researchLowerRangeCompatibility=lowerCompatibility;
result.sdkEntrySHA256=geometry.sdkEntrySHA256;
result.publicCompatiblePathFoundForCurrentTwoPoolDesign=false;
result.nextIndependentWork='Current program/source-build parity and production acceptance preparation; no support reply required. Actual compatible config remains an execution prerequisite, not an information request.';
fs.writeFileSync(__dirname+'/public-config-review-v108.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
