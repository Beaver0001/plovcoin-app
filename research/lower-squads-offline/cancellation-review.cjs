'use strict';
// Sequential orderings in a local VM, not a network scheduling guarantee.
const assert=require('node:assert/strict'),sq=require('@sqds/multisig');
module.exports=async function(ctx){
 const {account,send,connection,multisig,members,approve,execute,add,remove,snap,status,wait,position}=ctx;
 const checks=[],begin=ctx.cases.length;
 const addresses=index=>[sq.getProposalPda({multisigPda:multisig,transactionIndex:index})[0],sq.getTransactionPda({multisigPda:multisig,index})[0]];
 const proposal=index=>sq.accounts.Proposal.fromAccountInfo({data:Buffer.from(account(addresses(index)[0]).data)})[0];
 const cancel=(index,k)=>sq.instructions.proposalCancelV2({multisigPda:multisig,transactionIndex:index,member:k.publicKey});
 async function rejectUnchanged(label,index,ix,signer=members[0]){
  const before=snap(addresses(index)),r=send(label,[ix],[signer],false);
  assert.match(r.logs.join('\n'),/InvalidProposalStatus/);assert.deepEqual(snap(addresses(index)),before);
  r.rollback='MONITORED_LP_VAULT_TRADER_GOVERNANCE_MESSAGE_UNCHANGED_EXTERNAL_FEE_PAYER_EXCLUDED';
 }
 for(const [label,build,direction] of [['add',add,1],['remove',remove,-1]]){
  for(const order of ['cancel-first','execute-first']){
   const built=await build(),index=await approve(label+' '+order,built.tx);wait();
   const beforeLiquidity=position().unlockedLiquidity;
   send(label+' '+order+' first cancel vote',[cancel(index,members[0])]);
   assert.equal(status(index),'Approved');assert.equal(proposal(index).cancelled.length,1);
   assert(proposal(index).cancelled[0].equals(members[0].publicKey));
   if(order==='cancel-first'){
    send(label+' second cancel vote',[cancel(index,members[1])],[members[1]]);
    assert.equal(status(index),'Cancelled');assert.equal(proposal(index).cancelled.length,2);
    const ix=(await sq.instructions.vaultTransactionExecute({connection,multisigPda:multisig,transactionIndex:index,member:members[0].publicKey})).instruction;
    await rejectUnchanged(label+' execute after full cancel',index,ix);
    await rejectUnchanged(label+' cannot reapprove cancelled proposal',index,sq.instructions.proposalApprove({multisigPda:multisig,transactionIndex:index,member:members[0].publicKey}));
    assert(position().unlockedLiquidity.eq(beforeLiquidity));
   }else{
    await execute(label+' execute after only one cancel vote',index);
    assert(position().unlockedLiquidity.eq(direction===1?beforeLiquidity.add(built.delta):beforeLiquidity.sub(built.delta)));
    await rejectUnchanged(label+' late cancel cannot undo execution',index,cancel(index,members[1]),members[1]);
    assert.equal(status(index),'Executed');
   }
   checks.push({operation:label,order,proposal:index.toString(),statusAfterOneCancel:'Approved',finalStatus:status(index),approvedMessageEdited:false});
  }
 }
 return {checks,transactions:ctx.cases.length-begin,conclusion:'One cancellation vote does not suspend this 2-of-3 proposal. If valid execution lands before cancellation threshold, execution wins and later cancellation cannot undo it. Full cancellation first blocks execute and reapproval.',scope:'Four deterministic sequential orderings in synthetic 2-of-3 12h VM. Not concurrent validator execution, mainnet transaction ordering, a fee/MEV strategy, or proof for every governance configuration.'};
};
