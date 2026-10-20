'use strict';
// Offline readback of the saved public snapshot. No network or transaction path.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const sq=require('@sqds/multisig'),{PublicKey}=require('@solana/web3.js');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function review(r){
 const multi=new PublicKey(r.multisig),calls=r.reads;
 assert.equal(r.genesis,'5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d');
 assert.equal(calls[0].result,r.genesis);assert.equal(calls.at(-1).result,r.genesis);
 let floor=0;for(const c of calls){assert(['getGenesisHash','getMultipleAccounts','getProgramAccounts'].includes(c.request.method));if(c.result.context){assert(c.result.context.slot>=floor);assert.equal(c.request.params[1].commitment,'finalized');floor=c.result.context.slot;}}
 const multiple=calls.filter(c=>c.request.method==='getMultipleAccounts'),start=multiple[0],end=multiple.at(-1);
 const decode=a=>{assert.equal(a.owner,sq.PROGRAM_ID.toBase58());assert.equal(a.executable,false);return Buffer.from(a.data[0],'base64');};
 const b=decode(start.result.value[0]);assert(b.equals(decode(end.result.value[0])));
 const m=sq.accounts.Multisig.deserialize(b)[0];assert(sq.getMultisigPda({createKey:m.createKey})[0].equals(multi));assert(sq.getVaultPda({multisigPda:multi,index:0})[0].equals(new PublicKey(r.vault)));
 assert.equal(b.readUInt16LE(72),r.threshold);assert.equal(m.threshold,r.threshold);assert.equal(b.readUInt32LE(74),r.timeLockSeconds);assert.equal(m.timeLock,r.timeLockSeconds);
 assert.equal(b.readBigUInt64LE(78).toString(),r.transactionIndex);assert.equal(b.readBigUInt64LE(86).toString(),r.staleTransactionIndex);
 assert.deepEqual(m.members.map(x=>({key:x.key.toBase58(),mask:x.permissions.mask,initiate:!!(x.permissions.mask&1),vote:!!(x.permissions.mask&2),execute:!!(x.permissions.mask&4)})),r.members);
 assert.equal(m.configAuthority.toBase58(),r.configAuthority);assert.equal(m.configAuthority.equals(PublicKey.default),r.autonomous);
 const stale=BigInt(r.staleTransactionIndex),rows=[];
 const scans=calls.filter(c=>c.request.method==='getProgramAccounts'),rawProposals=scans.find(c=>c.request.params[1].filters[0].memcmp.bytes===require('bs58').encode(Buffer.from(sq.accounts.proposalDiscriminator)));
 assert.equal(rawProposals.result.value.length,r.proposalRows.length);
 for(const item of rawProposals.result.value){
  const raw=decode(item.account),p=sq.accounts.Proposal.deserialize(raw)[0],index=p.transactionIndex.toString(),summary=r.proposalRows.find(x=>x.index===index),tx=r.transactionRows.find(x=>x.index===index);
  assert(summary&&tx);assert.equal(summary.address,item.pubkey);assert.equal(summary.dataSha256,hash(raw));assert.equal(summary.status.__kind,p.status.__kind);assert.equal(summary.status.timestamp,p.status.timestamp.toString(10));
  assert(p.multisig.equals(multi));assert.equal(sq.getProposalPda({multisigPda:multi,transactionIndex:BigInt(index)})[0].toBase58(),item.pubkey);
  for(const field of ['approved','rejected','cancelled'])assert.deepEqual(summary[field],p[field].map(x=>x.toBase58()));
  const record=multiple.find(c=>c.request.params[0].includes(tx.address));assert(record);const a=record.result.value[record.request.params[0].indexOf(tx.address)];assert(a);
  const txBytes=decode(a);assert.equal(hash(txBytes),tx.dataSha256);
  const Type=tx.kind==='ConfigTransaction'?sq.accounts.ConfigTransaction:tx.kind==='VaultTransaction'?sq.accounts.VaultTransaction:sq.accounts.Batch;
  const decoded=Type.deserialize(txBytes)[0];assert(decoded.multisig.equals(multi));assert.equal(decoded.index.toString(),index);
  if(tx.kind==='ConfigTransaction')assert.deepEqual(JSON.parse(JSON.stringify(decoded.actions)),tx.actions);
  const state=p.status.__kind,blocked=state==='Approved'&&tx.kind==='ConfigTransaction'&&BigInt(index)<=stale;
  rows.push({index,kind:tx.kind,status:state,indexAtOrBelowStale:BigInt(index)<=stale,assessment:blocked?'STALE_CONFIG_BLOCKED_BY_INDEX':state==='Approved'?'APPROVED_REQUIRES_REVIEW':['Executed','Cancelled','Rejected'].includes(state)?'TERMINAL_STATUS':'NONTERMINAL_REQUIRES_REVIEW',...(tx.kind==='ConfigTransaction'?{actions:tx.actions}:{})});
 }
 const limits=scans.find(c=>c!==rawProposals);assert(limits);assert.equal(limits.result.value.length,r.spendingLimits.length);
 assert.equal(r.spendingLimits.length,0,'Nonempty spending limits need separate detailed review');
 assert.equal(r.programPin.elfSha256,JSON.parse(fs.readFileSync('program-pins-v90.json')).programs.find(p=>p.name==='squads').elfSha256);
 assert.equal(r.networkSends,0);assert.equal(r.walletPrompts,0);assert.equal(r.MAINNET_GO,'NO');
 return {version:94,status:'OFFLINE_SNAPSHOT_READBACK_PASS',snapshotCapturedAt:r.capturedAt,multisig:r.multisig,vault:r.vault,threshold:r.threshold,members:r.members.length,timeLockSeconds:r.timeLockSeconds,autonomous:r.autonomous,spendingLimitAccounts:0,proposalReadSlot:rawProposals.result.context.slot,proposals:rows.sort((a,b)=>Number(BigInt(a.index)-BigInt(b.index))),approvedVaultProposals:rows.filter(x=>x.kind==='VaultTransaction'&&x.status==='Approved').length,staleApprovedConfigProposals:rows.filter(x=>x.assessment==='STALE_CONFIG_BLOCKED_BY_INDEX').length,programElfMatchesV90:true,sourceRule:'ConfigTransactionExecute requires proposal.transaction_index > multisig.stale_transaction_index; approved vault execution does not apply that same stale check.',sourceCommit:'af94153ff77a28b6effe46b9c94baaa93742b48c',sourceBuildParity:'NOT_PROVEN',signerAvailability:'NOT_CONFIRMED',networkSends:0,walletPrompts:0,MAINNET_GO:'NO',limits:'Only this LP multisig and retained known-layout accounts at recorded slots; not Treasury, historical transaction completeness, independent RPC proof or future execution authorization.'};
}
module.exports=review;
if(require.main===module){const input=process.argv[2],output=process.argv[3];assert(input&&output,'Usage: node review-lp-governance.cjs INPUT.json OUTPUT.json');assert(!fs.existsSync(output));const r=review(JSON.parse(fs.readFileSync(input,'utf8')));fs.writeFileSync(output,JSON.stringify(r,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(r,null,2));}
