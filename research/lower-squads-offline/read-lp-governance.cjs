'use strict';
// Public mainnet reads only. No signer, transaction builder, simulation or send.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {PublicKey}=require('@solana/web3.js'),sq=require('@sqds/multisig'),bs58=require('bs58');
const endpoint='https://api.mainnet-beta.solana.com',genesis='5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
const multisig=new PublicKey('9CcvfhksgjsQhK7fi4S7Mjv4gaCMNDpDiqGgS4CduA7B'),vault=sq.getVaultPda({multisigPda:multisig,index:0})[0];
assert.equal(vault.toBase58(),'2bfo1Z7kfFu5BgmjCNCK5jAPqzV8emB39gCag62gravK');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const BN=require('bn.js');
function json(v){if(typeof v==='bigint'||BN.isBN(v))return v.toString(10);if(v instanceof PublicKey)return v.toBase58();if(Array.isArray(v))return v.map(json);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,json(x)]));return v;}
let floor=0,id=0;const reads=[];
async function rpc(method,params=[],retain=true){
 assert(['getGenesisHash','getMultipleAccounts','getProgramAccounts'].includes(method));
 const request={jsonrpc:'2.0',id:++id,method,params};
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Connection':'close'},body:JSON.stringify(request),signal:AbortSignal.timeout(45000)});
 assert(response.ok,'HTTP '+response.status);const body=await response.json();assert(!body.error,JSON.stringify(body.error));assert.equal(body.id,request.id);assert('result' in body);
 if(body.result?.context){assert(Number.isSafeInteger(body.result.context.slot));assert(body.result.context.slot>=floor);floor=body.result.context.slot;}
 if(retain)reads.push({request,result:body.result});return body.result;
}
const options=()=>({encoding:'base64',commitment:'finalized',minContextSlot:floor});
function bytes(a){assert(a&&a.data[1]==='base64');const b=Buffer.from(a.data[0],'base64');assert.equal(b.toString('base64'),a.data[0]);return b;}
function decode(Type,a,disc){assert.equal(a.owner,sq.PROGRAM_ID.toBase58());assert.equal(a.executable,false);const b=bytes(a);assert.deepEqual([...b.subarray(0,8)],disc);const [v]=Type.deserialize(b);assert(v.serialize()[0].equals(b.subarray(0,v.serialize()[0].length)));return v;}
function ms(a){const v=decode(sq.accounts.Multisig,a,sq.accounts.multisigDiscriminator),b=bytes(a);assert(sq.getMultisigPda({createKey:v.createKey})[0].equals(multisig));assert.equal(b.readUInt16LE(72),v.threshold);assert.equal(b.readUInt32LE(74),v.timeLock);assert.equal(b.readBigUInt64LE(78).toString(),v.transactionIndex.toString());assert.equal(b.readBigUInt64LE(86).toString(),v.staleTransactionIndex.toString());return v;}
async function scan(discriminator){return rpc('getProgramAccounts',[sq.PROGRAM_ID.toBase58(),{...options(),withContext:true,filters:[{memcmp:{offset:0,bytes:bs58.encode(Buffer.from(discriminator))}},{memcmp:{offset:8,bytes:multisig.toBase58()}}]}]);}
async function main(){
 assert.equal(await rpc('getGenesisHash'),genesis);
 const initial=await rpc('getMultipleAccounts',[[multisig.toBase58(),vault.toBase58(),sq.PROGRAM_ID.toBase58()],options()]);
 const state=ms(initial.value[0]),program=initial.value[2],programBytes=bytes(program);
 assert.equal(program.owner,'BPFLoaderUpgradeab1e11111111111111111111111');assert.equal(program.executable,true);assert.equal(programBytes.readUInt32LE(0),2);
 const programData=new PublicKey(programBytes.subarray(4,36));
 assert(PublicKey.findProgramAddressSync([sq.PROGRAM_ID.toBuffer()],new PublicKey(program.owner))[0].equals(programData));
 const proposals=await scan(sq.accounts.proposalDiscriminator);assert(proposals.value.length<=256,'Stop: proposal result exceeds review bound');
 const limits=await scan(sq.accounts.spendingLimitDiscriminator);assert(limits.value.length<=64,'Stop: spending limit result exceeds review bound');
 const proposalRows=proposals.value.map(({pubkey,account})=>{const p=decode(sq.accounts.Proposal,account,sq.accounts.proposalDiscriminator),index=BigInt(p.transactionIndex.toString());assert(p.multisig.equals(multisig));assert(sq.getProposalPda({multisigPda:multisig,transactionIndex:index})[0].equals(new PublicKey(pubkey)));assert(index<=BigInt(state.transactionIndex.toString()));return {address:pubkey,index:index.toString(),status:json(p.status),approved:p.approved.map(x=>x.toBase58()),rejected:p.rejected.map(x=>x.toBase58()),cancelled:p.cancelled.map(x=>x.toBase58()),transaction:sq.getTransactionPda({multisigPda:multisig,index})[0].toBase58(),dataSha256:hash(bytes(account))};});
 const spendingLimits=limits.value.map(({pubkey,account})=>{const s=decode(sq.accounts.SpendingLimit,account,sq.accounts.spendingLimitDiscriminator);assert(s.multisig.equals(multisig));assert(sq.getSpendingLimitPda({multisigPda:multisig,createKey:s.createKey})[0].equals(new PublicKey(pubkey)));return {address:pubkey,vaultIndex:s.vaultIndex,mint:s.mint.toBase58(),amount:s.amount.toString(),remaining:s.remainingAmount.toString(),period:json(s.period),members:s.members.map(x=>x.toBase58()),destinations:s.destinations.map(x=>x.toBase58())};});
 const transactionRows=[];
 for(let start=0;start<proposalRows.length;start+=100){
  const group=proposalRows.slice(start,start+100),r=await rpc('getMultipleAccounts',[group.map(p=>p.transaction),options()]);
  r.value.forEach((a,i)=>{const p=group[i];if(!a){transactionRows.push({index:p.index,address:p.transaction,exists:false});return;}
   const b=bytes(a),types=[[sq.accounts.VaultTransaction,sq.accounts.vaultTransactionDiscriminator,'VaultTransaction'],[sq.accounts.ConfigTransaction,sq.accounts.configTransactionDiscriminator,'ConfigTransaction'],[sq.accounts.Batch,sq.accounts.batchDiscriminator,'Batch']];
   const found=types.find(([,disc])=>Buffer.from(disc).equals(b.subarray(0,8)));assert(found,'Unknown transaction account discriminator');
   const t=decode(found[0],a,found[1]);assert(t.multisig.equals(multisig));assert.equal(t.index.toString(),p.index);
   transactionRows.push({index:p.index,address:p.transaction,exists:true,kind:found[2],dataSha256:hash(b),...(found[2]==='VaultTransaction'?{vaultIndex:t.vaultIndex,accountKeys:t.message.accountKeys.map(x=>x.toBase58()),instructionProgramIndexes:t.message.instructions.map(x=>x.programIdIndex)}:found[2]==='ConfigTransaction'?{actions:json(t.actions)}:{})});
  });
 }
 // Hash current program bytes in memory. Retain header/hash instead of duplicating ELF in Git.
 const binary=await rpc('getMultipleAccounts',[[programData.toBase58()],options()],false),pd=binary.value[0],raw=bytes(pd);
 assert.equal(pd.owner,program.owner);assert.equal(pd.executable,false);assert.equal(raw.readUInt32LE(0),3);assert(raw.subarray(45,49).equals(Buffer.from([127,69,76,70])));
 const pins=JSON.parse(fs.readFileSync('program-pins-v90.json','utf8')),pin=pins.programs.find(p=>p.name==='squads');
 const programPin={program:sq.PROGRAM_ID.toBase58(),programData:programData.toBase58(),readSlot:binary.context.slot,deploymentSlot:raw.readBigUInt64LE(4).toString(),elfBytes:raw.length-45,elfSha256:hash(raw.subarray(45)),programDataSha256:hash(raw),headerBase64:raw.subarray(0,45).toString('base64'),matchesV90Elf:hash(raw.subarray(45))===pin.elfSha256};
 const final=await rpc('getMultipleAccounts',[[multisig.toBase58(),sq.PROGRAM_ID.toBase58()],options()]);
 assert.equal(hash(bytes(final.value[0])),hash(bytes(initial.value[0])),'Multisig changed during scan');assert.equal(hash(bytes(final.value[1])),hash(programBytes),'Program pointer changed during scan');
 assert.equal(await rpc('getGenesisHash'),genesis);
 const unresolved=proposalRows.filter(p=>['Draft','Active','Approved','Executing'].includes(p.status.__kind));
 const result={version:94,status:'READ_ONLY_GOVERNANCE_SNAPSHOT',capturedAt:new Date().toISOString(),endpoint,genesis,multisig:multisig.toBase58(),vault:vault.toBase58(),vaultIndex:0,firstSlot:initial.context.slot,lastSlot:final.context.slot,threshold:state.threshold,timeLockSeconds:state.timeLock,configAuthority:state.configAuthority.toBase58(),autonomous:state.configAuthority.equals(PublicKey.default),transactionIndex:state.transactionIndex.toString(),staleTransactionIndex:state.staleTransactionIndex.toString(),members:state.members.map(x=>({key:x.key.toBase58(),mask:x.permissions.mask,initiate:(x.permissions.mask&1)!==0,vote:(x.permissions.mask&2)!==0,execute:(x.permissions.mask&4)!==0})),vaultAccount:initial.value[1]?{owner:initial.value[1].owner,lamports:initial.value[1].lamports}:null,proposalRows,unresolvedProposalIndexes:unresolved.map(p=>p.index),spendingLimits,transactionRows,programPin,multisigBytesUnchangedAcrossRead:true,reads,networkSends:0,walletPrompts:0,MAINNET_GO:'NO',limitations:['Single RPC and known SDK layouts, not cryptographic completeness or a simultaneous snapshot.','Missing/closed historical proposal accounts are not recovered; retained-account scan is not transaction history.','No permission, threshold or timelock guarantees future governance state or transaction order.','ProgramData hash/header retained; full freshly returned ELF bytes omitted, comparison fixture retained separately in v90.','Candidate authority is not approved by this read; config issuance and production wallet acceptance remain separate.']};
 const output=process.argv[3];assert(process.argv[2]==='--live'&&output,'Usage: node read-lp-governance.cjs --live OUTPUT.json');assert(!fs.existsSync(output),'Refuse to overwrite existing snapshot');
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({...result,reads:result.reads.map(r=>({method:r.request.method,slot:r.result?.context?.slot})),proposalRows:result.proposalRows.map(p=>({index:p.index,status:p.status.__kind})),transactionRows:result.transactionRows.map(t=>({index:t.index,kind:t.kind,exists:t.exists}))},null,2));
}
if(require.main===module){if(process.argv[2]!=='--live'||!process.argv[3])throw Error('Explicit --live OUTPUT.json required');main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});}
