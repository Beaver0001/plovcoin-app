"""Independent coverage, Q64 floor/ceil, timing, custody and rollback oracle; stdlib only."""
from pathlib import Path
import json,hashlib,csv
B=Path(__file__).resolve().parent;raw=(B/'v29-atomic-result.json').read_bytes();r=json.loads(raw)
geometry=json.loads((B/'v29-geometry-result.json').read_text());refs={g['id']:g for g in geometry['rows']}
n=0
def ck(v):
 global n
 assert v
 n+=1
def ceildiv(a,b):return(a+b-1)//b
ck(r['version']==104 and r['status']=='LOCAL_ATOMIC_DUAL_INITIALIZATION_PASS_REAL_CONFIG_OPEN')
ck(r['programPins']==json.loads((B/'program-pins-v90.json').read_text()))
ck(r['geometryResultSHA256']==hashlib.sha256((B/'v29-geometry-result.json').read_bytes()).hexdigest())
modes={'before-T0','at-T0','after-T0','cancelled'}
ck(len(refs)==12 and len(r['cases'])==48)
ck({c['id']for c in r['cases']}=={key+'_'+mode for key in refs for mode in modes})
summary=[];good=bad=maxbytes=maxcu=0;poolkeys=set();nftkeys=set();altkeys=set()
rollbackAfterUpper=0
common={'reject extension of frozen ALT','reject quorum1','reject before12h'}
full={'LOWER wrong authority rolls back successful UPPER','LOWER wrong type rolls back successful UPPER','LOWER missing seed SOL rolls back successful UPPER','reject missing second ephemeral signer','LOWER compute exhaustion rolls back successful UPPER','reject dual creation replay'}
program='cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG'
for c in r['cases']:
 mode=c['mode'];g=refs[c['id'].removesuffix('_'+mode)];success=mode in {'before-T0','at-T0'}
 ck(c['threshold']==2 and c['members']==3 and c['timeLockSeconds']==43200)
 ck(c['ephemeralSigners']==2 and len(c['innerSigners'])==3 and c['vault']in c['innerSigners'])
 ck(c['storedMessageSHA256']==c['nativeStoredMessageSHA256'])
 ck(c['compactMessageBytes']==534<c['uncompressedMessageBytes']==1244)
 ck(c['plainCreate']['bytes'] is None and c['plainCreate']['error']=='encoding overruns Uint8Array')
 ck(c['plainExecute']['bytes']==1243>1232 and c['storeBytes']==862)
 alt=c['ALT'];ck(alt['nativeCreation'] and alt['frozen'] and int(alt['executionSlot'])>int(alt['lastExtendedSlot']))
 ck(alt['address']not in altkeys and len(alt['addresses'])==len(set(alt['addresses'])));altkeys.add(alt['address'])
 ck('bundled' in alt['runtime'] and len(alt['dataSHA256'])==64)
 A=int(c['approvedAt']);T=int(c['activationAt']);ck(A==1800000000)
 ck(T==A+(100 if mode=='after-T0' else 43501))
 tx=c['transactions'];fail={t['label']:t for t in tx if not t['success']}
 expected=common|(full if success else {'reject afterT0 but before12h','reject expired activation point keeps both absent'} if mode=='after-T0' else {'reject fully cancelled dual proposal'})
 if mode=='before-T0':expected|={'reject inactive UPPER public swap','reject inactive LOWER public swap'}
 ck(set(fail)==expected)
 ck(len(tx)=={'before-T0':23,'at-T0':21,'after-T0':16,'cancelled':17}[mode])
 for t in tx:
  ck(t['bytes']<=1232 and int(t['computeUnits'])<=1400000)
  maxbytes=max(maxbytes,t['bytes']);maxcu=max(maxcu,int(t['computeUnits']))
  if not t['success']:ck(t['rollbackBeforeSHA256']==t['rollbackAfterSHA256'])
 good+=sum(t['success']for t in tx);bad+=len(fail)
 ck('immutable' in '\n'.join(fail['reject extension of frozen ALT']['logs']).lower())
 for label in ['reject quorum1','reject dual creation replay','reject fully cancelled dual proposal']:
  if label in fail:ck('InvalidProposalStatus' in '\n'.join(fail[label]['logs']))
 for label in ['reject before12h','reject afterT0 but before12h']:
  if label in fail:ck('TimeLockNotReleased' in '\n'.join(fail[label]['logs']))
 for p in c['failureProbes']:
  ck(p['bothPoolsAbsent'] and p['trackedAccounts']==19)
  if p['upperCPISucceeded']:
   ck(p['label']in full and 'rolls back successful UPPER'in p['label'])
   logs=fail[p['label']]['logs'];ck(('Program '+program+' success')in logs);rollbackAfterUpper+=1
 if not success:
  ck(c['execution']is None and c['legs']==[] and c['activationProbes']==[])
  ck(c['proposalStatus']==('Cancelled'if mode=='cancelled'else'Approved'))
  if mode=='after-T0':ck('InvalidActivationPoint'in '\n'.join(fail['reject expired activation point keeps both absent']['logs']))
 else:
  ck(c['proposalStatus']=='Executed' and len(c['legs'])==2)
  e=c['execution'];E=int(e['executedAt']);ck(E==A+43201 if mode=='before-T0'else E==T)
  ck(E-A>=43200 and E<=T and e['bothSameOuterTransaction'] and e['replayRejected'])
  ck(e['bytes']==440 and int(e['computeUnits'])<=1400000)
  ck(int(e['vaultLamportDebit'])==sum(int(a['lamports'])for a in e['createdAccounts']))
  ck(int(e['payerBaseDebit'])==sum(int(l['amountAUp'])for l in g['legs']))
  for l,ref in zip(c['legs'],g['legs']):
   ck(l['name']==ref['name']and l['owner']==c['vault'])
   ck(l['pool']not in poolkeys and l['positionNft']not in nftkeys);poolkeys.add(l['pool']);nftkeys.add(l['positionNft'])
   ck(l['positionNft']in c['innerSigners'] and l['activationAt']==str(T) and l['executedAt']==str(E))
   for a,b in [('sqrtMin','sqrtMin'),('sqrtMax','sqrtMax'),('sqrtInitial','sqrtInitial'),('liquidity','liquidityU128'),('principalA','amountAUp'),('principalB','amountBUp')]:ck(l[a]==ref[b])
   P=int(l['sqrtInitial']);M=int(l['sqrtMax']);m=int(l['sqrtMin']);L=int(l['liquidity'])
   ck(int(l['principalA'])==ceildiv(L*(M-P),P*M))
   ck(int(l['principalB'])==ceildiv(L*(P-m),2**128))
   ck(l['vaultA']==l['principalA'] and int(l['vaultB'])-int(l['principalB'])==(1 if l['name']=='UPPER'else 0))
  ck(len(c['activationProbes'])==(2 if mode=='before-T0'else 0))
  for p in c['activationProbes']:ck(p['rejected']and p['reason']=='PoolDisabled'and int(p['at'])==T-1)
 summary.append(dict(id=c['id'],mode=mode,proposal=c['proposalStatus'],pools_created=len(c['legs']),native_message_MATCH=True,ALT_frozen=True,plain_execute_bytes=1243,ALT_execute_bytes=e['bytes'] if success else '',after_UPPER_success_rollback_cases=sum(p['upperCPISucceeded']for p in c['failureProbes']),MAINNET_GO='NO'))
ck(good==576 and bad==348 and good+bad==r['localTransactions']==924 and r['localFundingAirdrops']==240)
ck(len(poolkeys)==len(nftkeys)==48 and len(altkeys)==48 and rollbackAfterUpper==96)
for k in ['networkRequests','networkSends','realWalletPrompts']:ck(r[k]==0)
ck(r['Wave1Inputs']is None and r['MAINNET_GO']=='NO')
with(B/'v29-atomic-summary.csv').open('w')as f:
 w=csv.DictWriter(f,fieldnames=summary[0],lineterminator='\n');w.writeheader();w.writerows(summary)
out=dict(version=104,status='PASS_LOCAL_ATOMIC_DUAL_INITIALIZATION_REAL_CONFIG_OPEN',candidateCases=12,timingAndCancellationModes=4,VMcases=48,poolsCreated=48,atomicDualExecutions=24,cancelledWholeProposals=12,expiredActivationRejections=12,rollbackAfterSuccessfulUPPER=96,independentChecks=n,transactionsPerRun=924,successes=576,expectedFailures=348,localFundingAirdrops=240,nativeFrozenALTs=48,storedMessagesMatchedNativeAccount=48,maxSerializedBytes=maxbytes,maxComputeUnits=maxcu,plainExecuteBytes=1243,ALTExecuteBytes=440,ALTStoreBytes=862,uncompressedStoredMessageBytes=1244,ALTStoredMessageBytes=534,preActivationSwapRejections=24,realConfigAccepted=False,productionAtomicDesignApproved=False,productionActivationPoint=None,sourceBuildParityProven=False,ALTProgram='LiteSVM bundled builtin; not a mainnet-read pinned ELF',allOtherPrograms='Five retained v90 mainnet-read ELF pins, not freshly fetched',fullD0D90ReplayInThisSuite=False,networkSends=0,realWalletPrompts=0,MAINNET_GO='NO',rawTranscriptSHA256=hashlib.sha256(raw).hexdigest())
(B/'v29-atomic-review.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
