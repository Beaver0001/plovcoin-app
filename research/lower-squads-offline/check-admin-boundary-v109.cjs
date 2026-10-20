'use strict';
// Local synthetic signer only; no RPC, wallet or network send.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {LiteSVM,FailedTransactionMetadata}=require('litesvm');
const {getTransactionDecoder}=require('@solana/kit');
const {Keypair,Connection,TransactionMessage,VersionedTransaction,SystemProgram}=require('@solana/web3.js');
const {CpAmm,deriveOperatorAddress}=require('@meteora-ag/cp-amm-sdk');
const BN=require('bn.js');
const dir=process.env.PLOV_LOCAL_FIXTURES;assert(dir,'PLOV_LOCAL_FIXTURES required');
const pin=JSON.parse(fs.readFileSync(__dirname+'/program-pins-v90.json')).programs.find(x=>x.name==='meteora');
const elf=fs.readFileSync(path.join(dir,'meteora.so'));assert.equal(crypto.createHash('sha256').update(elf).digest('hex'),pin.elfSha256);
const svm=new LiteSVM();svm.addProgramWithLoader(pin.program,elf,pin.loader);
const outsider=Keypair.fromSeed(crypto.createHash('sha256').update('PLOV_V109_LOCAL_ONLY_ADMIN_BOUNDARY').digest());
svm.airdrop(outsider.publicKey.toBase58(),1000000000n);
const operator=deriveOperatorAddress(outsider.publicKey);
const amm=new CpAmm(new Connection('http://127.0.0.1:1',{fetch:async()=>{throw Error('RPC forbidden');}}));
(async()=>{
 const ix=await amm._program.methods.createOperatorAccount(new BN(1)).accountsPartial({operator,whitelistedAddress:outsider.publicKey,signer:outsider.publicKey,payer:outsider.publicKey,systemProgram:SystemProgram.programId}).instruction();
 assert.equal(svm.getAccount(operator.toBase58()).exists,false);
 const before=svm.getAccount(outsider.publicKey.toBase58()).lamports;
 const tx=new VersionedTransaction(new TransactionMessage({payerKey:outsider.publicKey,recentBlockhash:svm.latestBlockhash(),instructions:[ix]}).compileToV0Message());tx.sign([outsider]);
 const r=svm.sendTransaction(getTransactionDecoder().decode(tx.serialize()));assert(r instanceof FailedTransactionMetadata);
 const logs=r.meta().logs();assert(logs.some(l=>/Unauthorized|InvalidAdmin/.test(l)),logs.join('\n'));
 assert.equal(svm.getAccount(operator.toBase58()).exists,false);
 const fee=before-svm.getAccount(outsider.publicKey.toBase58()).lamports;assert.equal(fee,5000n);
 const result={version:109,status:'LOCAL_NON_ADMIN_OPERATOR_CREATION_REJECTED',elfSHA256:pin.elfSha256,syntheticSigner:outsider.publicKey.toBase58(),syntheticOperator:operator.toBase58(),localProgramTransactions:1,separateSyntheticAirdrops:1,error:r.err().toString(),logs,operatorExistsAfter:false,payerFeeLamports:fee.toString(),sourceBuildParityProven:false,localFeatureAbsenceProven:false,scope:'One deployed-ELF behavior boundary; no exhaustive feature-set or source identity proof',rpcCalls:0,networkSends:0,realWalletPrompts:0,MAINNET_GO:'NO'};
 fs.writeFileSync(__dirname+'/admin-boundary-result-v109.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
