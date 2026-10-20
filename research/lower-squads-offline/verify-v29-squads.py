"""Independent coverage, accounting, timing and D0 fee oracle. No SDK imports."""
from pathlib import Path
import json,csv,hashlib
B=Path(__file__).resolve().parent;raw=(B/'v29-squads-result.json').read_bytes();r=json.loads(raw);geometry=json.loads((B/'v29-geometry-result.json').read_text());pins=json.loads((B/'program-pins-v90.json').read_text())
n=0
def ck(v):
 global n
 assert v;n+=1
def ceildiv(a,b):return(a+b-1)//b
ck(r['status']=='LOCAL_EXACT_V29_SQUADS_INITIALIZATION_PASS')
ck(r['programPins']==pins and len(pins['programs'])==5)
ck(r['geometryResultSHA256']==hashlib.sha256((B/'v29-geometry-result.json').read_bytes()).hexdigest())
ck(len(r['cases'])==12 and {c['id']for c in r['cases']}=={g['id']for g in geometry['rows']})
summary=[];success=fail=0;maxbytes=maxCU=0;poolkeys=set();nftkeys=set();primary=0
expectedLabels={'UPPER reject one approval','UPPER reject before12h','UPPER reject missing700M inventory','UPPER reject executed replay','LOWER reject one approval','LOWER reject before12h','LOWER reject wrong config authority','LOWER reject static config type','LOWER reject missing ephemeral NFT signer','LOWER reject insufficient vault SOL','LOWER reject executed replay','reject direct member fee withdrawal','fee reject one approval','fee reject before12h','fee reject executed replay'}
expectedLabels|={'reject inactive UPPER public swap','reject inactive LOWER public swap'}
for c in r['cases']:
 g=next(g for g in geometry['rows']if g['id']==c['id']);primary+=g['FX_USD_per_SOL']=='519/5'
 ck(c['threshold']==2 and c['members']==3 and c['timeLockSeconds']==43200 and c['transactionIndex']=='3')
 ck(c['configAuthority']==c['vault'] and len(c['legs'])==2)
 tx=c['transactions'];good=[t for t in tx if t['success']];bad=[t for t in tx if not t['success']];ck(len(tx)==37 and len(good)==20 and len(bad)==17);success+=len(good);fail+=len(bad)
 ck({t['label']for t in bad}==expectedLabels)
 ck(c['activationIsSynthetic']and c['bothPoolsInitializedBeforeActivation']and len(c['activationProbes'])==2)
 ck({p['pool']for p in c['activationProbes']}=={'UPPER','LOWER'})
 for p in c['activationProbes']:ck(p['rejected']and p['reason']=='PoolDisabled'and int(p['at'])<int(p['activationAt'])==int(c['commonActivationAt']))
 ck(int(c['activationProbes'][1]['at'])==int(c['commonActivationAt'])-1)
 for t in tx:
  ck(t['bytes']<=1232 and int(t['computeUnits'])<=1400000);maxbytes=max(maxbytes,t['bytes']);maxCU=max(maxCU,int(t['computeUnits']))
  if not t['success']:
   ck(t['rollbackBeforeSHA256']==t['rollbackAfterSHA256'])
   ck('EXCLUDED' in t['rollback'])
 for leg,ref in zip(c['legs'],g['legs']):
  ck(leg['name']==ref['name'] and leg['pool']not in poolkeys and leg['positionNft']not in nftkeys);poolkeys.add(leg['pool']);nftkeys.add(leg['positionNft'])
  ck(leg['nftOwner']==leg['poolCreator']==c['vault'])
  ck(leg['ephemeralSigners']==1 and set(leg['innerSigners'])=={c['vault'],leg['positionNft']})
  ck(leg['proposalStatus']=='Executed' and leg['storedMessageSHA256']==leg['nativeStoredMessageSHA256'])
  ck(int(leg['executedAt'])-int(leg['approvedAt'])==int(leg['timelockElapsedSeconds'])==43201)
  ck(leg['activationAt']==c['commonActivationAt']and int(leg['executedAt'])<int(leg['activationAt']))
  for a,b in [('sqrtMin','sqrtMin'),('sqrtMax','sqrtMax'),('sqrtInitial','sqrtInitial'),('liquidity','liquidityU128'),('principalA','amountAUp'),('principalB','amountBUp')]:ck(leg[a]==ref[b])
  ck(leg['payerBaseDebit']==ref['amountAUp'] and leg['WSOLResidual']=='0')
  ck(int(leg['vaultLamportDebit'])==sum(int(x['lamports'])for x in leg['createdAccounts']))
  ck(int(leg['vaultA'])==int(leg['principalA']))
  ck(int(leg['vaultB'])-int(leg['principalB'])==(1 if leg['name']=='UPPER'else 0))
  ck(leg['feeNumerator']=='2500004'and leg['protocolPercent']==20 and leg['collectFeeMode']==1 and leg['dynamicFee']==leg['compoundingFeeBps']==0)
  if leg['name']=='LOWER':ck(leg['companionUnchanged'])
 f=c['feeClaim'];ck(f['innerSigners']==[c['vault']]and f['ephemeralSigners']==0 and f['index']=='3')
 ck(f['saleAt']==c['commonActivationAt'])
 ck(f['proposalStatus']=='Executed'and f['NFTOwner']==c['vault']and f['upperPoolUnchanged'])
 ck(f['storedMessageSHA256']==f['nativeStoredMessageSHA256'])
 ck(int(f['executedAt'])-int(f['approvedAt'])==int(f['timelockElapsedSeconds'])==43201)
 ck(f['principalUnchanged']and f['priceUnchanged'])
 before=int(f['sqrtBeforeSale']);after=int(f['sqrtAfterSale']);L=int(f['liquidity']);amount=int(f['salePLOVAtoms']);ck(amount==70000000*10**9)
 ck(after==ceildiv(L*before,L+amount*before))
 gross=L*(before-after)//2**128;fee=ceildiv(gross*2500004,10**9);protocol=fee//5;lp=fee-protocol
 ck(int(f['saleOutputLamports'])==gross-fee and int(f['quotedProtocolFeeLamports'])==protocol and int(f['quotedLPFeeLamports'])==lp)
 ck(0<=lp-int(f['claimableBefore'])<=1)
 ck(f['claimableBefore']==f['actualClaimedLamports'] and int(f['actualClaimedLamports'])>0)
 ck(int(f['vaultLamportDelta'])==int(f['actualClaimedLamports'])+int(f['priorWSOLRentRefund']))
 ck(int(f['principalBeforeSale'])-int(f['principalAfterSale'])==gross)
 ck(f['principalAfterSale']==f['principalAfterClaim']and f['sqrtAfterSale']==f['sqrtAfterClaim'])
 summary.append(dict(id=c['id'],threshold='2/3',timelock_seconds=43200,pools_created=2,initialization='PASS',NFT_owner='SQUADS_VAULT',negative_cases=17,initial_stored_messages='MATCH_NATIVE',actual_fee_claim_lamports=f['actualClaimedLamports'],separate_WSOL_rent_refund_lamports=f['priorWSOLRentRefund'],pool_creation_gap_seconds=int(c['legs'][1]['executedAt'])-int(c['legs'][0]['executedAt']),common_delayed_activation='LOCAL_PASS_NOT_READINESS_GUARD',max_execution_bytes=max(l['executionBytes']for l in c['legs']),real_config='UNAPPROVED',MAINNET_GO='NO'))
ck(success==240 and fail==204 and success+fail==r['localTransactions']==444 and r['localFundingAirdrops']==60)
ck(primary==4 and len(poolkeys)==len(nftkeys)==24)
for key in['networkRequests','networkSends','realWalletPrompts']:ck(r[key]==0)
ck(r['Wave1Inputs']is None and r['MAINNET_GO']=='NO')
with(B/'v29-squads-summary.csv').open('w')as f:
 writer=csv.DictWriter(f,fieldnames=list(summary[0]));writer.writeheader();writer.writerows(summary)
out=dict(version=102,status='PASS_EXACT_LOCAL_SQUADS_INIT_AND_FEE_CUSTODY',independentChecks=n,cases=12,primaryFXCases=4,poolInitializations=24,actualFeeClaims=12,transactionsPerRun=444,successes=240,expectedFailures=204,localFundingAirdrops=60,NFTsOwnedByVault=24,storedMessagesMatchedNativeAccount=36,quorumOrTimelockBypass=False,preActivationSwapRejections=24,commonActivationTest='PASS_SYNTHETIC_TIME',automaticBothPoolsReadyGuard=False,productionActivationSelected=False,maxSerializedBytes=maxbytes,maxComputeUnits=maxCU,rawTranscriptSHA256=hashlib.sha256(raw).hexdigest(),fullD0D90ReplayInThisSuite=False,priorFullNativePathReview='v29-native-review.json',realConfigAccepted=False,productionLaunchAuthorized=False,MAINNET_GO='NO')
(B/'v29-squads-review.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
