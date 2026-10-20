"""Independent timing, floor-withdrawal and coverage oracle; stdlib only."""
from pathlib import Path
import json,hashlib,csv
B=Path(__file__).resolve().parent
raw=(B/'v29-activation-result.json').read_bytes();r=json.loads(raw)
geometry=json.loads((B/'v29-geometry-result.json').read_text())
n=0
def ck(v):
 global n
 assert v
 n+=1
ck(r['version']==103 and r['status']=='LOCAL_ACTIVATION_BOUNDARY_PASS_PRODUCTION_PROCEDURE_OPEN')
ck(r['programPins']==json.loads((B/'program-pins-v90.json').read_text()))
ck(r['geometryResultSHA256']==hashlib.sha256((B/'v29-geometry-result.json').read_bytes()).hexdigest())
refs={g['id']:g for g in geometry['rows'] if g['id'].endswith('_current')}
ck(len(refs)==4 and len(r['cases'])==12)
modes={'on-time','late-no-trade','late-trade'}
ck({c['id'] for c in r['cases']}=={key+'_'+mode for key in refs for mode in modes})
summary=[];good=bad=0;maxbytes=maxcu=0
for c in r['cases']:
 mode=c['mode'];key=c['id'].removesuffix('_'+mode);ref=refs[key]['legs'][0]
 ck(c['threshold']==2 and c['timeLockSeconds']==43200)
 ck(c['lowerAbsent'] and c['lowerProposalStatus']=='Cancelled' and c['cancellationDidNotChangeUpper'])
 ck(c['activationInstructionAbsent'] and not any('activation' in x.lower() for x in c['idlInstructions']))
 ck('setPoolStatus' in c['idlInstructions'] and not c['operatorAuthorizationAvailable'] and c['statusProposal']=='Approved')
 ck(c['abortMessageSHA256']==c['abortNativeMessageSHA256'])
 T=int(c['activationAt']);A=int(c['abortApprovedAt']);R=int(c['abortReadyAt'])
 ck(R==A+43200 and int(c['secondsBetweenReadyAndT0'])==T-R)
 ck((T-R==301) if mode=='on-time' else (T-R==-42900))
 L=int(c['initialPositionLiquidity']);P=int(c['sqrtInitial']);M=int(c['sqrtMax'])
 floor=L*(M-P)//(P*M)
 ck(int(c['floorA'])==floor and floor>0)
 ck(L==int(ref['liquidityU128'])==int(c['initialPoolLiquidity']))
 ck(P==int(ref['sqrtInitial']) and M==int(ref['sqrtMax']))
 u=c['initialUpper'];ck(u['principalA']==ref['amountAUp'] and u['principalB']=='0')
 ck(u['storedMessageSHA256']==u['nativeStoredMessageSHA256'] and u['timelockElapsedSeconds']=='43201')
 tx=c['transactions'];fail={t['label']:t for t in tx if not t['success']}
 expected={'UPPER reject one approval','UPPER reject before12h','UPPER reject missing700M inventory','UPPER reject executed replay','reject inactive UPPER public swap','abort before timelock','abort last second before available','creator cannot disable without operator'}
 expected|=({'stale abort floor after public buy'} if mode=='late-trade' else {'public buy rejected after withdrawal'})
 if mode=='on-time':expected.add('mature abort rejected before T0')
 ck(set(fail)==expected and len(tx)==(33 if mode=='on-time' else 32))
 ck('AccountOwnedByWrongProgram' in '\n'.join(fail['creator cannot disable without operator']['logs']))
 for label in ['abort before timelock','abort last second before available']:ck('TimeLockNotReleased' in '\n'.join(fail[label]['logs']))
 for t in tx:
  ck(t['bytes']<=1232 and int(t['computeUnits'])<=1400000)
  maxbytes=max(maxbytes,t['bytes']);maxcu=max(maxcu,int(t['computeUnits']))
  if not t['success']:ck(t['rollbackBeforeSHA256']==t['rollbackAfterSHA256'])
 good+=sum(t['success'] for t in tx);bad+=len(fail)
 ck(c['preActivationWithdrawalRejected']==(mode=='on-time'))
 if mode=='late-trade':
  ck(c['abortProposal']=='Approved' and c['withdrawal'] is None)
  ck(c['exposedTrade']['success'] and int(c['exposedTrade']['at'])==T)
  ck('ExceededSlippage' in '\n'.join(fail['stale abort floor after public buy']['logs']))
 else:
  w=c['withdrawal'];ck(c['abortProposal']=='Executed' and c['exposedTrade'] is None)
  ck(int(w['at'])==max(R,T) and int(w['returnedA'])==floor)
  ck(w['poolLiquidity']==w['positionLiquidity']=='0')
  ck(int(w['returnedSOL'])==int(w['priorWSOLRent'])==2039280)
  if mode=='on-time':ck('PoolDisabled' in '\n'.join(fail['mature abort rejected before T0']['logs']))
 summary.append(dict(id=c['id'],mode=mode,lower_proposal='Cancelled',ready_minus_T0_seconds=R-T,pre_T0_withdrawal='PoolDisabled' if mode=='on-time' else 'TimelockNotReleased',at_or_after_T0_abort=c['abortProposal'],prior_public_buy=mode=='late-trade',withdrawn_PLOV_atoms=c['withdrawal']['returnedA'] if c['withdrawal'] else '',safe_prestart_abort_proven=False,MAINNET_GO='NO'))
ck(good+bad==r['localTransactions']==388 and r['localFundingAirdrops']==60)
for k in ['networkRequests','networkSends','realWalletPrompts']:ck(r[k]==0)
ck(r['Wave1Inputs'] is None and r['MAINNET_GO']=='NO')
with (B/'v29-activation-summary.csv').open('w') as f:
 w=csv.DictWriter(f,fieldnames=summary[0],lineterminator='\n');w.writeheader();w.writerows(summary)
review=dict(version=103,status='PASS_LOCAL_BOUNDARY_TESTS_PRESTART_ABORT_BLOCKED',cases=12,currentFXCandidates=4,timingOrderings=3,independentChecks=n,transactionsPerRun=388,successes=good,expectedFailures=bad,localFundingAirdrops=60,preActivationMatureWithdrawalRejections=4,postActivationWithdrawals=8,staleWithdrawalRejectionsAfterPublicBuy=4,creatorOnlyDisableRejections=12,cancelledLOWERProposalsDoNotStopUPPER=12,activationUpdateInstructionPresent=False,safePrestartAbortProven=False,operatorAuthorizationProven=False,productionActivationFailureProcedure='BLOCKED_CURRENT_CREATOR_ONLY_DESIGN',productionActivationPoint=None,MAINNET_GO='NO',maxSerializedBytes=maxbytes,maxComputeUnits=maxcu,rawTranscriptSHA256=hashlib.sha256(raw).hexdigest(),scope='Four current-FX candidates only; pinned retained programs, synthetic state and deterministic ordering. Not a mainnet race/priority guarantee, all-FX replay, real operator access, or production approval.')
(B/'v29-activation-review.json').write_text(json.dumps(review,indent=2)+'\n');print(json.dumps(review,indent=2))
