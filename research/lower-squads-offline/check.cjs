'use strict';
// Offline SDK contract check. No keypairs, signing, RPC, proposals or sends.
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const fs = require('node:fs');
const {PublicKey, Connection, TransactionMessage, VersionedTransaction, SystemInstruction, SystemProgram} = require('@solana/web3.js');
const {TOKEN_PROGRAM_ID, NATIVE_MINT, NATIVE_MINT_2022, getAssociatedTokenAddressSync} = require('@solana/spl-token');
const {CpAmm, encodeFeeTimeSchedulerParams} = require('@meteora-ag/cp-amm-sdk');
const sq = require('@sqds/multisig');
const BN = require('bn.js');
const pub = label => new PublicKey(createHash('sha256').update('PLOV_OFFLINE_V88:'+label).digest());
const hash = b => createHash('sha256').update(b).digest('hex');
let rpcCalls=0;
const connection = new Connection('http://127.0.0.1:1', {fetch:async()=>{rpcCalls++;throw Error('RPC prohibited in offline check');}});
const amm = new CpAmm(connection);
const multisigPda=pub('synthetic-multisig'), member=pub('synthetic-member');
const [vault] = sq.getVaultPda({multisigPda,index:0});
const transactionIndex=1n; // synthetic, never a reserved real index
const [transactionPda] = sq.getTransactionPda({multisigPda,index:transactionIndex});
const [nft,bump] = sq.getEphemeralSignerPda({transactionPda,ephemeralSignerIndex:0});
const syntheticMint=pub('synthetic-token-mint'), config=pub('nonexistent-synthetic-config');
const params={
 payer:vault,creator:vault,poolCreatorAuthority:vault,positionNft:nft,config,
 tokenAMint:syntheticMint,tokenBMint:NATIVE_MINT,tokenAProgram:TOKEN_PROGRAM_ID,tokenBProgram:TOKEN_PROGRAM_ID,
 // Synthetic geometry/amounts: no production budget or launch price.
 tokenAAmount:new BN(1),tokenBAmount:new BN(1),sqrtMinPrice:new BN(2).pow(new BN(63)),sqrtMaxPrice:new BN(2).pow(new BN(65)),
 initSqrtPrice:new BN(2).pow(new BN(64)),liquidityDelta:new BN(2).pow(new BN(64)),
 poolFees:{baseFee:{data:Array.from(encodeFeeTimeSchedulerParams(new BN(2500004),0,new BN(0),new BN(0),0))},compoundingFeeBps:0,padding:0,dynamicFee:null},
 hasAlphaVault:false,activationType:1,collectFeeMode:1,activationPoint:null,isLockLiquidity:false,
};
const checks=[];
async function main(){
 const built=await amm.createCustomPoolWithDynamicConfig(params);
 const core=built.tx.instructions.find(ix=>ix.programId.equals(amm._program.programId));
 assert(core);const decoded=amm._program.coder.instruction.decode(core.data);
 assert.equal(decoded.name,'initializePoolWithDynamicConfig');
 const ixDef=amm._program.idl.instructions.find(x=>x.name===decoded.name);
 const keys=Object.fromEntries(ixDef.accounts.map((a,i)=>[a.name,core.keys[i]]));
 for(const field of ['payer','poolCreatorAuthority']){assert(keys[field].isSigner);assert(keys[field].pubkey.equals(vault));}
 assert(keys.positionNftMint.isSigner);assert(keys.positionNftMint.isWritable);assert(keys.positionNftMint.pubkey.equals(nft));
 assert(keys.creator.pubkey.equals(vault));assert(keys.config.pubkey.equals(config));
 checks.push('Meteora init signer roles: vault payer/authority and ephemeral NFT mint');
 const ata=getAssociatedTokenAddressSync(NATIVE_MINT,vault,true);
 const transfers=built.tx.instructions.filter(ix=>ix.programId.equals(SystemProgram.programId)).map(ix=>SystemInstruction.decodeTransfer(ix));
 assert.equal(transfers.length,1);assert(transfers[0].fromPubkey.equals(vault));assert(transfers[0].toPubkey.equals(ata));assert.equal(BigInt(transfers[0].lamports),1n);
 checks.push('SDK automatically adds SOL transfer to vault WSOL ATA; no fresh WSOL keypair');
 const message = new TransactionMessage({payerKey:vault,recentBlockhash:pub('synthetic-blockhash').toBase58(),instructions:built.tx.instructions});
 const bytes=sq.utils.transactionMessageToMultisigTransactionMessageBytes({message,vaultPda:vault});
 const [stored]=sq.types.transactionMessageBeet.deserialize(Buffer.from(bytes));
 const signers=stored.accountKeys.slice(0,stored.numSigners).map(k=>k.toBase58()).sort();
 assert.deepEqual(signers,[vault.toBase58(),nft.toBase58()].sort());
 const good=await sq.utils.accountsForTransactionExecute({connection,transactionPda,vaultPda:vault,message:stored,ephemeralSignerBumps:[bump],programId:sq.PROGRAM_ID});
 assert.equal(good.accountMetas.filter(x=>x.isSigner).length,0);
 assert(good.accountMetas.find(x=>x.pubkey.equals(nft)).isWritable);
 checks.push('Stored message retains inner signers; execute metas suppress only vault/known ephemeral PDA signatures');
 const missing=await sq.utils.accountsForTransactionExecute({connection,transactionPda,vaultPda:vault,message:stored,ephemeralSignerBumps:[],programId:sq.PROGRAM_ID});
 assert(missing.accountMetas.find(x=>x.pubkey.equals(nft)).isSigner);
 checks.push('Negative: ephemeralSigners=0 leaves an unavailable external NFT-mint signer');
 const [otherTx]=sq.getTransactionPda({multisigPda,index:2n});
 const wrong=await sq.utils.accountsForTransactionExecute({connection,transactionPda:otherTx,vaultPda:vault,message:stored,ephemeralSignerBumps:[bump],programId:sq.PROGRAM_ID});
 assert(wrong.accountMetas.find(x=>x.pubkey.equals(nft)).isSigner);
 checks.push('Negative: changed proposal transaction index cannot reuse the old NFT ephemeral address');
 await assert.rejects(()=>amm.createCustomPoolWithDynamicConfig({...params,tokenBMint:NATIVE_MINT_2022}));
 checks.push('Negative: Token-2022 wrapped SOL rejected by SDK');
 const create=sq.instructions.vaultTransactionCreate({multisigPda,transactionIndex,creator:member,rentPayer:member,vaultIndex:0,ephemeralSigners:1,transactionMessage:message});
 const execute=sq.generated.createVaultTransactionExecuteInstruction({multisig:multisigPda,member,proposal:sq.getProposalPda({multisigPda,transactionIndex})[0],transaction:transactionPda,anchorRemainingAccounts:good.accountMetas});
 function size(ix){try{return {bytes:new VersionedTransaction(new TransactionMessage({payerKey:member,recentBlockhash:pub('synthetic-blockhash').toBase58(),instructions:[ix]}).compileToV0Message()).serialize().length,lookupTables:0};}catch(e){return {serialized:false,errorClass:e.constructor.name,lookupTables:0};}}
 const createSize=size(create),executeSize=size(execute);
 assert(createSize.bytes<=1232);assert(executeSize.bytes<=1232);
 checks.push('Synthetic v0 create/execute envelopes fit 1232 bytes without lookup tables or compute-budget instructions');
 assert.equal(rpcCalls,0);
 const result={version:88,status:'OFFLINE_SDK_CONTRACT_PASS',checks,dependencies:{meteora:'1.5.1',squads:'2.1.4',web3:'1.98.0'},messageSha256:hash(bytes),innerInstructionCount:built.tx.instructions.length,innerSignerCount:stored.numSigners,createEnvelope:createSize,executeEnvelope:executeSize,rpcCalls,signatures:0,networkSends:0,runtimeExecution:'NOT_RUN',operatorAccess:'NOT_PROVEN',productionGeometry:'NOT_SELECTED',MAINNET_GO:'NO'};
 fs.writeFileSync('result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
