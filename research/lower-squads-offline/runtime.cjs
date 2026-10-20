'use strict';
// Local SBF execution only. Fixture keys have no project/network authority.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {LiteSVM,FailedTransactionMetadata,Clock}=require('litesvm');
const {getTransactionDecoder}=require('@solana/kit');
const {PublicKey,Keypair,Connection,TransactionMessage,VersionedTransaction,SystemProgram,ComputeBudgetProgram}=require('@solana/web3.js');
const spl=require('@solana/spl-token'),m=require('@meteora-ag/cp-amm-sdk'),sq=require('@sqds/multisig'),BN=require('bn.js');
const fixtureDir=process.env.PLOV_LOCAL_FIXTURES;if(!fixtureDir)throw Error('Set PLOV_LOCAL_FIXTURES to pinned local fixture directory');
const pins=JSON.parse(fs.readFileSync(path.join(fixtureDir,'..','program-pins.json')));
const hash=b=>createHash('sha256').update(b).digest('hex');
const key=n=>Keypair.fromSeed(createHash('sha256').update('PLOV_V89_LOCAL_ONLY:'+n).digest());
const members=[key('a'),key('b'),key('c')],op=key('synthetic-operator'),mint=key('mint'),createKey=key('create-key'),treasury=key('synthetic-treasury').publicKey;
const svm=new LiteSVM();let localTransactions=0;const cases=[];
for(const p of pins.programs){const bytes=fs.readFileSync(path.join(fixtureDir,p.name+'.so'));assert.equal(hash(bytes),p.elfSha256);if(p.loader)svm.addProgramWithLoader(p.program,bytes,p.loader);else svm.addProgram(p.program,bytes);}
svm.setClock(new Clock(1000n,0n,0n,0n,1800000000n));
const connection={getAccountInfo:async(pub)=>{const a=svm.getAccount(pub.toBase58());return a.exists?{data:Buffer.from(a.data),owner:new PublicKey(a.programAddress),lamports:Number(a.lamports),executable:a.executable,rentEpoch:0}:null;}};
const amm=new m.CpAmm(new Connection('http://127.0.0.1:1',{fetch:async()=>{throw Error('RPC forbidden')}}));
function account(pub){const a=svm.getAccount(pub.toBase58());return a.exists?a:null;}
function set(pub,data,owner,lamports=100000000n){svm.setAccount({address:pub.toBase58(),data:new Uint8Array(data),programAddress:owner.toBase58(),lamports,executable:false,space:BigInt(data.length)});}
function send(label,ixs,signers=[members[0]],expect=true,units=1400000){
 svm.expireBlockhash();const tx=new VersionedTransaction(new TransactionMessage({payerKey:signers[0].publicKey,recentBlockhash:svm.latestBlockhash(),instructions:[ComputeBudgetProgram.setComputeUnitLimit({units}),...ixs]}).compileToV0Message());tx.sign(signers);
 const r=svm.sendTransaction(getTransactionDecoder().decode(tx.serialize()));localTransactions++;
 const fail=r instanceof FailedTransactionMetadata;const meta=fail?r.meta():r;
 if(fail===expect){console.error(label,fail?r.err().toString():'unexpected success',meta.logs());throw Error(label+' unexpected result');}
 console.log(label,fail?'expected failure':'PASS',String(meta.computeUnitsConsumed()));
 const result={label,serializedBytes:tx.serialize().length,computeUnitLimit:units,success:!fail,error:fail?r.err().toString():null,logs:meta.logs(),computeUnits:String(meta.computeUnitsConsumed())};cases.push(result);return result;
}
(async()=>{
 for(const k of [...members,op])svm.airdrop(k.publicKey.toBase58(),100000000000n);
 const global=sq.accounts.ProgramConfig.fromArgs({authority:op.publicKey,treasury,multisigCreationFee:0n,reserved:Array(64).fill(0)}).serialize()[0];set(sq.getProgramConfigPda({})[0],global,sq.PROGRAM_ID);
 const multisig=sq.getMultisigPda({createKey:createKey.publicKey})[0],vault=sq.getVaultPda({multisigPda:multisig,index:0})[0];
 send('create multisig',[sq.instructions.multisigCreateV2({treasury,creator:members[0].publicKey,multisigPda:multisig,configAuthority:null,threshold:2,members:members.map(k=>({key:k.publicKey,permissions:sq.types.Permissions.all()})),timeLock:43200,createKey:createKey.publicKey,rentCollector:null})],[members[0],createKey]);
 svm.airdrop(vault.toBase58(),100000000000n);
 const operator=m.deriveOperatorAddress(op.publicKey);const operatorData=await amm._program.coder.accounts.encode('operator',{whitelistedAddress:op.publicKey,permission:new BN(1),padding:[new BN(0),new BN(0)]});assert.equal(operatorData.length,72);set(operator,operatorData,amm._program.programId);
 const config=m.deriveConfigAddress(new BN(89));
 const issueIx=await amm._program.methods.createDynamicConfig(new BN(89),{poolCreatorAuthority:vault,permission:new BN(0)}).accountsPartial({config,operator,signer:op.publicKey,payer:op.publicKey,systemProgram:SystemProgram.programId}).instruction();
 const zeroPermission=await amm._program.coder.accounts.encode('operator',{whitelistedAddress:op.publicKey,permission:new BN(0),padding:[new BN(0),new BN(0)]});set(operator,zeroPermission,amm._program.programId);
 const forbidden=send('reject Operator without CreateConfigKey',[issueIx],[op],false);assert.match(forbidden.logs.join('\n'),/InvalidPermission.*6054/);assert.equal(account(config),null);assert.equal(hash(account(operator).data),hash(zeroPermission));forbidden.rollback='CONFIG_ABSENT_OPERATOR_UNCHANGED_FEE_PAYER_EXCLUDED';
 set(operator,operatorData,amm._program.programId);send('issue dynamic config using SYNTHETIC Operator',[issueIx],[op]);
 const configState=amm._program.coder.accounts.decode('config',Buffer.from(account(config).data));assert.equal(configState.configType,1);assert(configState.poolCreatorAuthority.equals(vault));
 const nativeMintData=Buffer.alloc(spl.MINT_SIZE);spl.MintLayout.encode({mintAuthorityOption:0,mintAuthority:PublicKey.default,supply:0n,decimals:9,isInitialized:true,freezeAuthorityOption:0,freezeAuthority:PublicKey.default},nativeMintData);set(spl.NATIVE_MINT,nativeMintData,spl.TOKEN_PROGRAM_ID,1461600n);
 const payerAta=spl.getAssociatedTokenAddressSync(mint.publicKey,vault,true);
 send('create synthetic mint/inventory', [SystemProgram.createAccount({fromPubkey:members[0].publicKey,newAccountPubkey:mint.publicKey,space:spl.MINT_SIZE,lamports:1461600,programId:spl.TOKEN_PROGRAM_ID}),spl.createInitializeMint2Instruction(mint.publicKey,9,members[0].publicKey,null),spl.createAssociatedTokenAccountIdempotentInstruction(members[0].publicKey,payerAta,vault,mint.publicKey),spl.createMintToInstruction(mint.publicKey,payerAta,members[0].publicKey,1000000000000n)],[members[0],mint]);
 const index=1n,transaction=sq.getTransactionPda({multisigPda:multisig,index})[0],nft=sq.getEphemeralSignerPda({transactionPda:transaction,ephemeralSignerIndex:0})[0];
 const geom=amm.preparePoolCreationParams({tokenAAmount:new BN(1000000000),tokenBAmount:new BN(1000000000),minSqrtPrice:new BN(2).pow(new BN(63)),maxSqrtPrice:new BN(2).pow(new BN(65)),collectFeeMode:1});
 const built=await amm.createCustomPoolWithDynamicConfig({payer:vault,creator:vault,poolCreatorAuthority:vault,positionNft:nft,config,tokenAMint:mint.publicKey,tokenBMint:spl.NATIVE_MINT,tokenAProgram:spl.TOKEN_PROGRAM_ID,tokenBProgram:spl.TOKEN_PROGRAM_ID,tokenAAmount:new BN(1000000000),tokenBAmount:new BN(1000000000),sqrtMinPrice:new BN(2).pow(new BN(63)),sqrtMaxPrice:new BN(2).pow(new BN(65)),...geom,poolFees:{baseFee:{data:Array.from(m.encodeFeeTimeSchedulerParams(new BN(2500004),0,new BN(0),new BN(0),0))},compoundingFeeBps:0,padding:0,dynamicFee:null},hasAlphaVault:false,activationType:1,collectFeeMode:1,activationPoint:null,isLockLiquidity:false});
 const message=new TransactionMessage({payerKey:vault,recentBlockhash:svm.latestBlockhash(),instructions:built.tx.instructions});
 send('create vault transaction',[sq.instructions.vaultTransactionCreate({multisigPda:multisig,transactionIndex:index,creator:members[0].publicKey,vaultIndex:0,ephemeralSigners:1,transactionMessage:message})]);
 send('create proposal',[sq.instructions.proposalCreate({multisigPda:multisig,creator:members[0].publicKey,transactionIndex:index,isDraft:false})]);
 const execute=await sq.instructions.vaultTransactionExecute({connection,multisigPda:multisig,transactionIndex:index,member:members[0].publicKey});
 const proposal=sq.getProposalPda({multisigPda:multisig,transactionIndex:index})[0];
 const nftAccount=m.derivePositionNftAccount(nft),wsolAta=spl.getAssociatedTokenAddressSync(spl.NATIVE_MINT,vault,true);
 const tracked=[vault,payerAta,wsolAta,config,proposal,transaction,built.pool,built.position,nft,nftAccount,m.deriveTokenVaultAddress(mint.publicKey,built.pool),m.deriveTokenVaultAddress(spl.NATIVE_MINT,built.pool)];
 function snapshot(){return tracked.map(p=>{const a=account(p);return a?{key:p.toBase58(),lamports:String(a.lamports),owner:a.programAddress,data:hash(a.data)}:{key:p.toBase58(),exists:false};});}
 function negative(label,pattern,units=1400000){const before=snapshot();const r=send(label,[execute.instruction],[members[0]],false,units);assert.match(r.logs.join('\n')+' '+r.error,pattern);assert.deepEqual(snapshot(),before);r.rollback='ALL_TRACKED_ACCOUNTS_UNCHANGED_FEE_PAYER_EXCLUDED';return r;}
 send('approve first',[sq.instructions.proposalApprove({multisigPda:multisig,transactionIndex:index,member:members[0].publicKey})]);
 negative('reject insufficient approvals',/InvalidProposalStatus/);
 send('approve second',[sq.instructions.proposalApprove({multisigPda:multisig,transactionIndex:index,member:members[1].publicKey})],[members[1]]);
 negative('reject timelock not elapsed',/TimeLockNotReleased/);
 let clock=svm.getClock();clock.unixTimestamp+=43201n;svm.setClock(clock);
 const savedConfig=account(config);
 set(config,await amm._program.coder.accounts.encode('config',{...configState,poolCreatorAuthority:members[2].publicKey}),amm._program.programId,savedConfig.lamports);
 negative('reject wrong config authority',/ConstraintHasOne/);svm.setAccount(savedConfig);
 set(config,await amm._program.coder.accounts.encode('config',{...configState,configType:0}),amm._program.programId,savedConfig.lamports);
 negative('reject static config in dynamic init',/InvalidConfigType/);svm.setAccount(savedConfig);
 const savedVault=account(vault);svm.setAccount({...savedVault,lamports:1000000n});
 negative('reject insufficient vault SOL',/insufficient lamports|insufficient funds|InsufficientFunds/i);svm.setAccount(savedVault);
 const savedTokens=account(payerAta),emptyTokens=Buffer.from(savedTokens.data);emptyTokens.writeBigUInt64LE(0n,64);svm.setAccount({...savedTokens,data:new Uint8Array(emptyTokens)});
 negative('reject insufficient token inventory',/insufficient funds/i);svm.setAccount(savedTokens);
 const savedTransaction=account(transaction),decodedTx=sq.accounts.VaultTransaction.fromAccountInfo({data:Buffer.from(savedTransaction.data)})[0];
 const noSigner=sq.accounts.VaultTransaction.fromArgs({...decodedTx,ephemeralSignerBumps:new Uint8Array()}).serialize()[0];
 set(transaction,Buffer.concat([noSigner,Buffer.alloc(savedTransaction.data.length-noSigner.length)]),sq.PROGRAM_ID,savedTransaction.lamports);
 negative('reject missing stored ephemeral signer',/InvalidAccount/);svm.setAccount(savedTransaction);
 const wrongNft=sq.getEphemeralSignerPda({transactionPda:sq.getTransactionPda({multisigPda:multisig,index:2n})[0],ephemeralSignerIndex:0})[0];tracked.push(wrongNft);
 const changedMessage={...decodedTx.message,accountKeys:decodedTx.message.accountKeys.map(p=>p.equals(nft)?wrongNft:p)};
 const changed=sq.accounts.VaultTransaction.fromArgs({...decodedTx,message:changedMessage}).serialize()[0];set(transaction,changed,sq.PROGRAM_ID,savedTransaction.lamports);
 const wrongExecute=await sq.instructions.vaultTransactionExecute({connection,multisigPda:multisig,transactionIndex:index,member:members[0].publicKey});
 assert(wrongExecute.instruction.keys.find(k=>k.pubkey.equals(wrongNft)).isSigner);
 wrongExecute.instruction.keys.find(k=>k.pubkey.equals(wrongNft)).isSigner=false;
 const beforeWrong=snapshot(),wrongResult=send('reject foreign transaction ephemeral address',[wrongExecute.instruction],[members[0]],false);assert.match(wrongResult.logs.join('\n'),/InvalidAccount/);assert.deepEqual(snapshot(),beforeWrong);wrongResult.rollback='ALL_TRACKED_ACCOUNTS_UNCHANGED_FEE_PAYER_EXCLUDED';svm.setAccount(savedTransaction);tracked.pop();
 negative('reject compute budget exhaustion',/exceeded CUs meter|ComputationalBudgetExceeded/,100000);
 const beforeSuccess=snapshot(),beforeVault=account(vault).lamports,beforeTokens=spl.AccountLayout.decode(Buffer.from(account(payerAta).data)).amount;
 const execution=send('execute Squads -> Meteora create',[execute.instruction]);
 const pool=amm._program.coder.accounts.decode('pool',Buffer.from(account(built.pool).data));
 const position=amm._program.coder.accounts.decode('position',Buffer.from(account(built.position).data));
 const nftToken=account(m.derivePositionNftAccount(nft));const nftState=spl.AccountLayout.decode(Buffer.from(nftToken.data));assert(nftState.owner.equals(vault));assert.equal(nftState.amount,1n);assert.equal(nftToken.programAddress,spl.TOKEN_2022_PROGRAM_ID.toBase58());assert(position.nftMint.equals(nft));
 const aVault=account(pool.tokenAVault),bVault=account(pool.tokenBVault);
 const aAmount=spl.AccountLayout.decode(Buffer.from(aVault.data)).amount,bAmount=spl.AccountLayout.decode(Buffer.from(bVault.data)).amount;
 const aDebit=beforeTokens-spl.AccountLayout.decode(Buffer.from(account(payerAta).data)).amount;
 const residual=spl.AccountLayout.decode(Buffer.from(account(wsolAta).data)).amount;
 assert.equal(aDebit,aAmount);assert.equal(bAmount+residual,1000000000n);
 const created=tracked.filter((p,i)=>beforeSuccess[i].exists===false).map(p=>{const a=account(p);assert(a);return {address:p.toBase58(),lamports:String(a.lamports),bytes:a.data.length,owner:a.programAddress};});
 const vaultDebit=beforeVault-account(vault).lamports;assert.equal(vaultDebit,created.reduce((sum,a)=>sum+BigInt(a.lamports),0n));
 assert(sq.accounts.Proposal.fromAccountInfo({data:Buffer.from(account(proposal).data)})[0].status.__kind==='Executed');
 negative('reject replay of executed proposal',/InvalidProposalStatus/);
 const feeData=Buffer.from(pool.poolFees.baseFee.baseFeeInfo.data);assert.equal(feeData.readBigUInt64LE(0),2500004n);assert.equal(feeData.subarray(8).some(x=>x!==0),false);assert.equal(pool.poolFees.protocolFeePercent,20);assert.equal(pool.poolFees.compoundingFeeBps,0);assert.equal(pool.poolFees.dynamicFee.initialized,0);assert.equal(pool.collectFeeMode,1);assert.equal(pool.activationType,1);assert(pool.creator.equals(vault));assert(pool.whitelistedVault.equals(PublicKey.default));const nftMintState=spl.MintLayout.decode(Buffer.from(account(nft).data));assert.equal(nftMintState.supply,1n);assert.equal(nftMintState.decimals,0);
 const out={version:89,status:'LOCAL_SBF_SUITE_PASS',cases,rollbackScope:'12 tracked state/accounts; external fee payer excluded',supportPrograms:'LiteSVM1.4.1 bundled SPL Token/Token2022/ATA; not mainnet-pinned',localFundingAirdrops:5,signatureVerification:true,feeReadback:{baseFeeNumerator:'2500004',constant:true,protocolFeePercent:20,compoundingFeeBps:0,dynamicFeeInitialized:0,collectFeeMode:1,activationType:1,alphaVault:false},faultInjection:'Synthetic Operator/global config/native mint. Wrong config, missing/foreign ephemeral state, and insufficient balances are local state injections.',inventory:{tokenADebit:String(aDebit),poolTokenA:String(aAmount),poolTokenB:String(bAmount),wsolResidual:String(residual),vaultLamportDebit:String(vaultDebit),createdAccounts:created},programPins:pins,execution,localTransactions,networkSends:0,realWalletPrompts:0,operatorPermission:'SYNTHETIC_INJECTED',multisig:'SYNTHETIC_2_OF_3_12H',sourceBuildParity:'NOT_PROVEN',pool:built.pool.toBase58(),position:built.position.toBase58(),nft:nft.toBase58(),nftOwner:vault.toBase58(),MAINNET_GO:'NO'};
 if(process.env.PLOV_DELAYED_REVIEW==='1'){
  assert.equal(pins.programs.length,5);
  out.delayedReview=await require('./delayed-review.cjs')({svm,account,send,amm,connection,multisig,vault,built,nft,nftAccount,members,mint,payerAta,wsolAta,hash,cases});
  const cancellation=process.env.PLOV_CANCEL_REVIEW==='1';
  out.version=cancellation?93:92;out.status=cancellation?'LOCAL_CANCELLATION_ORDER_PASS':'LOCAL_DELAYED_REVIEW_PASS';
  out.supportPrograms='Five mainnet-read pinned ELF; all business and governance state synthetic';out.localTransactions=cases.length;
  fs.writeFileSync(cancellation?'cancellation-review-result.json':'delayed-review-result.json',JSON.stringify(out,null,2)+'\n');
  console.log(cancellation?'CANCELLATION ORDER VERIFIED':'DELAYED REVIEW VERIFIED',cases.length);return;
 }
 if(process.env.PLOV_LIFECYCLE==='1'){assert.equal(pins.programs.length,5);out.lifecycle=await require('./lifecycle.cjs')({svm,account,set,send,amm,connection,multisig,vault,built,nft,nftAccount,members,mint,payerAta,wsolAta,tracked,hash,cases,pins});out.version=90;out.status='LOCAL_PINNED_LIFECYCLE_PASS';out.supportPrograms='Mainnet-read ELF for SPL Token/Token2022/ATA plus Meteora/Squads; native mint and all business state synthetic';out.localTransactions=cases.length;fs.writeFileSync('lifecycle-result.json',JSON.stringify(out,null,2)+'\n');console.log('LIFECYCLE VERIFIED',cases.length);return;}
 fs.writeFileSync('runtime-result.json',JSON.stringify(out,null,2)+'\n');console.log('FULL LOCAL SUITE VERIFIED',cases.length,'transactions');
})().catch(e=>{console.error(e);process.exitCode=1;});
