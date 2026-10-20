import { Transaction,SystemProgram,ComputeBudgetProgram } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { buildSwapInstructions } from './swap-route.mjs';

function nonnegative(x,name){if(typeof x!=='bigint'||x<0n)throw Error(name+' must be nonnegative bigint');return x;}
async function buildNativeSwapTransaction({plan,pools,program,user,plovMint,temporaryWsolAccount,plovAtaExists,recentBlockhash,tokenAccountRentLamports,computeUnitLimit,computeUnitPriceMicroLamports}){
 nonnegative(tokenAccountRentLamports,'rent');if(tokenAccountRentLamports===0n)throw Error('rent quote required');
 nonnegative(computeUnitPriceMicroLamports,'compute unit price');
 if(!Number.isInteger(computeUnitLimit)||computeUnitLimit<1||computeUnitLimit>1400000)throw Error('explicit CU limit required');
 if(typeof plovAtaExists!=='boolean')throw Error('ATA existence must be explicitly checked');
 if(typeof recentBlockhash!=='string'||!recentBlockhash)throw Error('fresh blockhash required');
 if(user.equals(temporaryWsolAccount)||plovMint.equals(spl.NATIVE_MINT))throw Error('invalid temporary account or mint');
 if(plan.direction!==0&&plan.direction!==1)throw Error('invalid direction');
 if(plan.direction===0&&!plovAtaExists)throw Error('SELL source ATA missing');
 const plovAta=spl.getAssociatedTokenAddressSync(plovMint,user,false,spl.TOKEN_PROGRAM_ID);
 if(plovAta.equals(temporaryWsolAccount))throw Error('temporary account must be distinct');
 const inputLamports=plan.direction===1?BigInt(plan.amountIn.toString()):0n;
 const funding=tokenAccountRentLamports+inputLamports;
 if(funding>BigInt(Number.MAX_SAFE_INTEGER))throw Error('funding exceeds exact web3 number range');
 const tx=new Transaction({feePayer:user,recentBlockhash});
 tx.add(ComputeBudgetProgram.setComputeUnitLimit({units:computeUnitLimit}),ComputeBudgetProgram.setComputeUnitPrice({microLamports:computeUnitPriceMicroLamports}));
 if(!plovAtaExists)tx.add(spl.createAssociatedTokenAccountIdempotentInstruction(user,plovAta,user,plovMint,spl.TOKEN_PROGRAM_ID));
 tx.add(SystemProgram.createAccount({fromPubkey:user,newAccountPubkey:temporaryWsolAccount,lamports:Number(funding),space:spl.ACCOUNT_SIZE,programId:spl.TOKEN_PROGRAM_ID}),spl.createInitializeAccount3Instruction(temporaryWsolAccount,spl.NATIVE_MINT,user,spl.TOKEN_PROGRAM_ID));
 tx.add(...await buildSwapInstructions({plan,pools,program,user,inputTokenAccount:plan.direction===1?temporaryWsolAccount:plovAta,outputTokenAccount:plan.direction===1?plovAta:temporaryWsolAccount,expectedMintA:plovMint,expectedMintB:spl.NATIVE_MINT}));
 // Only close the newly-created temporary account. Never close a user's ATA.
 tx.add(spl.createCloseAccountInstruction(temporaryWsolAccount,user,user,[],spl.TOKEN_PROGRAM_ID));
 const packetBytes=tx.serialize({requireAllSignatures:false,verifySignatures:false}).length;
 if(packetBytes>1232)throw Error('transaction exceeds packet limit');
 return {transaction:tx,packetBytes,plovAta,temporaryWsolAccount,temporaryFundingLamports:funding,newAtaRentLamports:plovAtaExists?0n:tokenAccountRentLamports,upfrontFundingLamports:funding+(plovAtaExists?0n:tokenAccountRentLamports),temporaryRentReturnedOnSuccess:tokenAccountRentLamports,needsTemporarySigner:true,scope:'UNSIGNED; temporary account must be absent and signer-controlled; wallet owner/account states/blockhash/fees must be validated before signing; native SOL fee payer is user'};
}
function assertNativeBalance({envelope,walletBalanceLamports,messageFeeLamports,extraReserveLamports}){
 nonnegative(walletBalanceLamports,'balance');nonnegative(messageFeeLamports,'full message fee quote');nonnegative(extraReserveLamports,'extra reserve');
 const required=envelope.upfrontFundingLamports+messageFeeLamports+extraReserveLamports;
 if(walletBalanceLamports<required)throw Error('insufficient native SOL before swap; outputs/refunds cannot fund upfront requirements');
 return {requiredLamports:required,messageFeeLamports,extraReserveLamports,quoteIncludesPriorityFee:true};
}
export {buildNativeSwapTransaction,assertNativeBalance};
