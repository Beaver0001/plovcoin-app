"""Independent funding-ledger, governance timing, native CPI and exact-geometry oracle."""
from pathlib import Path
import json,hashlib,csv,re
B=Path(__file__).resolve().parent;raw=(B/'v29-funding-result.json').read_bytes();r=json.loads(raw)
refs={g['id']:g for g in json.loads((B/'v29-geometry-result.json').read_text())['rows']}
n=0
def ck(v):
 global n
 assert v
 n+=1
def ceildiv(a,b):return(a+b-1)//b
def completed(logs,program,depth):
 stack=[];count=0
 for line in logs:
  invoke=re.fullmatch(r'Program (\w+) invoke \[(\d+)\]',line)
  if invoke:stack.append((invoke[1],int(invoke[2])))
  else:
   end=re.fullmatch(r'Program (\w+) (success|failed:.*)',line)
   if end and stack and stack[-1][0]==end[1]:
    key,d=stack.pop()
    if key==program and d==depth and end[2]=='success':count+=1
 return count
ck(r['version']==105 and r['status']=='LOCAL_TREASURY_LP_HANDOFF_PASS_REAL_FUNDING_OPEN')
ck(r['programPins']==json.loads((B/'program-pins-v90.json').read_text()))
ck(r['geometryResultSHA256']==hashlib.sha256((B/'v29-geometry-result.json').read_bytes()).hexdigest())
ck(len(refs)==12 and len(r['cases'])==24 and {c['id']for c in r['cases']}=={k+'_'+m for k in refs for m in ['overlap','serial']})
common={'reject extension of frozen ALT','Treasury reject only2of5 approvals','Treasury reject before48h','LP reject quorum1','Treasury PLOV failure rolls back prior SOL transfer','Treasury missing SOL leaves both balances unchanged','Treasury reject handoff replay','LP missing PLOV cannot create partial pool pair','LP insufficient SOL rolls back successful UPPER','reject dual creation replay','reject inactive UPPER public swap','reject inactive LOWER public swap'}
summary=[];good=bad=maxbytes=maxcu=0;poolkeys=set();nftkeys=set();partialSOLRollbacks=afterUpper=0
program='cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG'
for c in r['cases']:
 mode=c['mode'];g=refs[c['id'].removesuffix('_'+mode)];f=c['funding'];p=c['fundingPlan'];e=c['execution']
 ck(c['threshold']==2 and c['members']==3 and c['timeLockSeconds']==43200 and c['proposalStatus']=='Executed')
 ck(f['threshold']==3 and f['members']==5 and f['timeLockSeconds']==172800 and f['proposalStatus']=='Executed')
 ck(c['vault']!=f['vault'] and f['LPVaultPreviouslyAbsent'] and f['LPATAPrecreatedExternally'] and f['feePayerIsExternalMember'])
 ck(f['storedMessageSHA256']==f['nativeStoredMessageSHA256'] and c['storedMessageSHA256']==c['nativeStoredMessageSHA256'])
 ck(c['ephemeralSigners']==2 and len(c['innerSigners'])==3 and c['vault']in c['innerSigners'])
 A=int(f['approvedAt']);F=int(f['executedAt']);L=int(c['approvedAt']);E=int(e['executedAt']);T=int(c['activationAt'])
 ck(A==1800000000 and F-A==172801)
 ck(L==(A if mode=='overlap'else F))
 ck(E==(F if mode=='overlap'else L+43201))
 ck(E>=F and E-L>=43200 and T==A+216302 and T>E)
 seed=sum(int(l['amountBUp'])for l in g['legs']);base=sum(int(l['amountAUp'])for l in g['legs'])
 ck(int(p['seedSOL'])==seed and int(p['baseToFund'])==base==700000000*10**9)
 ck(p['initializationRentAndSurplus']=='47251441'and p['zeroDataVaultRent']==p['LPVaultFinalLamports']=='890880')
 ck(not p['productionBudgetApproved'])
 S=int(p['SOLToFund']);ck(S==seed+47251441+890880)
 ck(int(f['SOLCredited'])==int(f['SOLDebited'])==S)
 ck(int(f['PLOVCredited'])==int(f['PLOVDebited'])==base)
 ck(int(e['vaultLamportDebit'])==S-int(p['LPVaultFinalLamports']))
 ck(int(e['vaultLamportDebit'])==sum(int(a['lamports'])for a in e['createdAccounts']))
 ck(int(e['payerBaseDebit'])==base and len(e['createdAccounts'])==13)
 ck(c['ALT']['nativeCreation'] and c['ALT']['frozen'] and int(c['ALT']['executionSlot'])>int(c['ALT']['lastExtendedSlot']))
 ck(c['storeBytes']==862 and e['bytes']==440 and f['executionBytes']==550 and e['bothSameOuterTransaction'] and e['replayRejected'])
 tx=c['transactions'];fail={t['label']:t for t in tx if not t['success']}
 expected=common|({'LP reject before12h','LP mature but Treasury not funded','Treasury still locked when LP mature'}if mode=='overlap'else{'LP reject new12h after funding'})
 ck(set(fail)==expected and len(tx)==(34 if mode=='overlap'else 32))
 for t in tx:
  ck(t['bytes']<=1232 and int(t['computeUnits'])<=1400000)
  maxbytes=max(maxbytes,t['bytes']);maxcu=max(maxcu,int(t['computeUnits']))
  if not t['success']:ck(t['rollbackBeforeSHA256']==t['rollbackAfterSHA256'])
 good+=sum(t['success']for t in tx);bad+=len(fail)
 for label,t in fail.items():
  logs='\n'.join(t['logs'])
  if 'before12h'in label or 'before48h'in label or 'new12h'in label or 'still locked'in label:ck('TimeLockNotReleased'in logs)
  if 'quorum1'in label or 'only2of5'in label or 'replay'in label:ck('InvalidProposalStatus'in logs)
 for fp in c['fundingProbes']:
  ck(fp['bothPoolsAbsent'])
  if fp['systemTransferSucceeded']:
   ck(fp['label']=='Treasury PLOV failure rolls back prior SOL transfer')
   ck(completed(fail[fp['label']]['logs'],'11111111111111111111111111111111',2)>0)
   ck(fp['LPVaultLamports']==fp['LPBaseAtoms']=='0'and fp['proposalStatus']=='Approved');partialSOLRollbacks+=1
 for fp in c['failureProbes']:
  ck(fp['bothPoolsAbsent']and fp['trackedAccounts']==24)
  actual=completed(fail[fp['label']]['logs'],program,2)>0
  ck(fp['upperCPISucceeded']==actual)
  if actual:ck(fp['label']=='LP insufficient SOL rolls back successful UPPER');afterUpper+=1
 ck(len(c['legs'])==2 and len(c['activationProbes'])==2)
 for l,ref in zip(c['legs'],g['legs']):
  ck(l['owner']==c['vault'] and l['executedAt']==str(E) and l['activationAt']==str(T))
  ck(l['pool']not in poolkeys and l['positionNft']not in nftkeys);poolkeys.add(l['pool']);nftkeys.add(l['positionNft'])
  for a,b in [('sqrtMin','sqrtMin'),('sqrtMax','sqrtMax'),('sqrtInitial','sqrtInitial'),('liquidity','liquidityU128'),('principalA','amountAUp'),('principalB','amountBUp')]:ck(l[a]==ref[b])
  P=int(l['sqrtInitial']);M=int(l['sqrtMax']);m=int(l['sqrtMin']);Q=int(l['liquidity'])
  ck(int(l['principalA'])==ceildiv(Q*(M-P),P*M) and int(l['principalB'])==ceildiv(Q*(P-m),2**128))
  ck(l['vaultA']==l['principalA']and int(l['vaultB'])-int(l['principalB'])==(1 if l['name']=='UPPER'else 0))
 for probe in c['activationProbes']:ck(probe['rejected']and probe['reason']=='PoolDisabled'and int(probe['at'])==T-1)
 summary.append(dict(id=c['id'],mode=mode,Treasury_quorum='3/5',Treasury_timelock_s=172800,LP_quorum='2/3',LP_timelock_s=43200,total_elapsed_s=E-A,LP_approved_at=L,Treasury_executed_at=F,LP_executed_at=E,SOL_funding_lamports=S,PLOV_funding_atoms=base,initialization_debit_lamports=e['vaultLamportDebit'],LP_final_rent_lamports=p['LPVaultFinalLamports'],production_budget_approved=False,MAINNET_GO='NO'))
ck(good==456 and bad==336 and good+bad==r['localTransactions']==792 and r['localFundingAirdrops']==168)
ck(len(poolkeys)==len(nftkeys)==48 and partialSOLRollbacks==afterUpper==24)
for k in ['networkRequests','networkSends','realWalletPrompts']:ck(r[k]==0)
ck(r['Wave1Inputs']is None and r['MAINNET_GO']=='NO')
with(B/'v29-funding-summary.csv').open('w')as f:
 w=csv.DictWriter(f,fieldnames=summary[0],lineterminator='\n');w.writeheader();w.writerows(summary)
out=dict(version=105,status='PASS_LOCAL_TREASURY_LP_HANDOFF_REAL_FUNDING_OPEN',candidateCases=12,schedules=2,VMcases=24,poolsCreated=48,nativeFundingTransfers=24,SOLTransferRolledBackAfterPLOVFailure=24,LPIncompleteFundingRollbacksAfterUPPER=24,LPReadyButTreasuryUnfundedRejections=12,independentChecks=n,transactionsPerRun=792,successes=456,expectedFailures=336,localFundingAirdrops=168,storedMessagesMatchedNativeAccount=48,overlapElapsedSeconds=172801,serialElapsedSeconds=216002,LPVaultFinalRentLamports=890880,operatingBudgetEstablished=False,productionFundingApproved=False,productionAtomicDesignApproved=False,realConfigAccepted=False,productionActivationPoint=None,maxSerializedBytes=maxbytes,maxComputeUnits=maxcu,ALTProgram='LiteSVM bundled builtin, not separately captured mainnet ELF',otherPrograms='Five retained v90 ELF, not fresh mainnet state',CPIProof='Successful depth2 program completion, excluding self-CPI event emission',fullD0D90ReplayInThisSuite=False,networkSends=0,realWalletPrompts=0,MAINNET_GO='NO',rawTranscriptSHA256=hashlib.sha256(raw).hexdigest())
(B/'v29-funding-review.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
