"""Independent stdlib accounting, integer fee/price oracle and threshold review."""
from pathlib import Path
from fractions import Fraction as F
from decimal import Decimal,localcontext
from itertools import product
import json,csv,hashlib
B=Path(__file__).resolve().parent;raw=(B/'v29-native-result.json').read_bytes();r=json.loads(raw);inputs=json.loads((B/'v29-path-input.json').read_text());geometry=json.loads((B/'v29-geometry-input.json').read_text())
n=0;unit=10**9;scale=2**128
def ck(x):
 global n
 assert x;n+=1
def dec(x):
 with localcontext()as ctx:ctx.prec=55;return str(Decimal(x.numerator)/Decimal(x.denominator))
def floor(x):return x.numerator//x.denominator
def ceildiv(a,b):return(a+b-1)//b
def price(state):return F(int(state['activeSqrtPrice'])**2,scale)
ck(r['status']=='ALL_NATIVE_PATHS_COMPLETED_PENDING_THRESHOLD_REVIEW')
ck(len(r['cases'])==12 and r['localFundingAirdrops']==36)
ck(r['sourcePathsSHA256']==hashlib.sha256((B/'v29-path-input.json').read_bytes()).hexdigest())
ck(r['geometryResultSHA256']==hashlib.sha256((B/'v29-geometry-result.json').read_bytes()).hexdigest())
ck({c['id']for c in r['cases']}=={c['geometryId']for c in inputs['cases']})
reports=[];eventrows=[];maxprice=F(0);maxD=F(0);maxAdust=0;maxBdust=0;successes=failures=swaps=0
for case in r['cases']:
 ref=next(v for v in inputs['cases']if v['geometryId']==case['id']);g=next(v for v in geometry['cases']if v['id']==case['id']);fx=F(case['FX_USD_per_SOL']);seed=int(case['seedLamports']);k=F(ref['k']);ck(seed==floor(F(g['seed_SOL'])*unit))
 ck(len(case['events'])==5 and len(case['finalFeeClaims'])==2)
 txs=case['transactions'];good=[t for t in txs if t['success']];bad=[t for t in txs if not t['success']];successes+=len(good);failures+=len(bad)
 ck(len(bad)==1 and bad[0]['label']=='reject minOut above exact quote')
 ck(bad[0]['rollbackBeforeSHA256']==bad[0]['rollbackAfterSHA256']and 'ExceededSlippage' in '\n'.join(bad[0]['logs']))
 for t in txs:ck(t['bytes']<=1232 and int(t['computeUnits'])<=1400000)
 for init in case['initializations']:
  ck(int(init['principalA'])==(700000000*unit if init['leg']=='UPPER'else 0))
  ck(int(init['principalB'])==(0 if init['leg']=='UPPER'else seed))
  surplus=1 if init['leg']=='UPPER'else 0
  ck(int(init['vaultB'])==int(init['principalB'])+surplus and int(init['vaultBSurplusExcludedFromPrincipal'])==surplus)
  ck(int(init['vaultBLamports'])==int(init['nativeRentReserve'])+int(init['vaultB']))
 # Swap oracle: independent OnlyB constant-fee integer arithmetic.
 for s in case['swaps']:
  swaps+=1;inp=int(s['input']);out=int(s['output']);lp=int(s['lpFee']);protocol=int(s['protocolFee']);before=int(s['sqrtBefore']);after=int(s['nextSqrtPrice']);L=int(s['liquidity']);mn=int(s['sqrtMin']);mx=int(s['sqrtMax']);mode=s['mode'];request=int(s['requested'])
  ck(mn<=after<=mx and L>0)
  if s['sell']:
   ck(mode in[0,1]);ck(after<=before)
   cap=ceildiv(L*(before-mn),mn*before)
   expectedInput=min(request,cap)if mode==1 else request
   expectedPrice=mn if mode==1 and request>=cap else ceildiv(L*before,L+expectedInput*before)
   ck(inp==expectedInput and after==expectedPrice)
   gross=L*(before-after)//scale;fee=ceildiv(gross*2500004,10**9)
   ck(out==gross-fee and lp+protocol==fee and protocol==fee//5)
   ck(int(s['deltaTraderA'])==-inp and int(s['deltaVaultB'])==-out)
  else:
   ck(mode in[1,2]);ck(after>=before)
   net=int(s['excludedFeeInput']);fee=inp-net
   ck(fee==ceildiv(inp*2500004,10**9) and lp+protocol==fee and protocol==fee//5)
   if mode==2:
    ck(out==request);ck(after==ceildiv(L*before,L-out*before))
    ck(net==ceildiv(L*(after-before),scale))
   else:
    ck(after==mx);ck(net==ceildiv(L*(mx-before),scale));ck(out==L*(mx-before)//(before*mx))
   ck(int(s['deltaTraderA'])==out and int(s['deltaVaultB'])==inp)
  ck(int(s['deltaVaultA'])==-int(s['deltaTraderA']))
  ck(int(s['deltaTraderSOL'])+int(s['deltaVaultB'])==-int(s['baseFeeLamports'])==-5000)
 pending=0;distributed=0;totalBuy=0;totalReturn=0;minimum=None;minil=None;maxdrop=F(0)
 for idx,(event,continuous)in enumerate(zip(case['events'],ref['expectedContinuousEvents'])):
  buy=floor(F(ref['buy_tokens'][idx])*unit)if idx<4 else 0
  ck(int(event['buyAtoms'])==buy and int(event['returnAtoms'])==pending)
  cumulative=floor(F(inputs['claim0PLOV'])*unit+idx*F(inputs['laterClaimPLOV'])*unit)if idx<4 else floor(F(inputs['totalClaimsPLOV'])*unit)
  claim=cumulative-distributed;ck(int(event['claimAtoms'])==claim);distributed=cumulative
  totalBuy+=buy;totalReturn+=pending;pending=floor((1-k)*buy)
  for state in[event['preSale'],event['postSale']]:
   aa=bb=fees=protocol=0;curveA=curveB=0
   for leg in state['legs']:
    z=int(leg['sqrtPrice']);lo=int(leg['sqrtMin']);hi=int(leg['sqrtMax']);L=int(leg['liquidity']);a=int(leg['vaultA']);b=int(leg['principalB']);fee=int(leg['lpFees']);pro=int(leg['protocol']);surplus=int(leg['vaultBSurplusExcluded'])
    ca=L*(hi-z)//(z*hi);cb=L*(z-lo)//scale
    ck(ca==int(leg['curveA'])and cb==int(leg['curveB']))
    ck(int(leg['vaultB'])==b+fee+pro+surplus)
    ck(0<=fee-int(leg['claimableLPFeeB'])<=1)
    ck(a>=ca and b>=cb);maxAdust=max(maxAdust,a-ca);maxBdust=max(maxBdust,b-cb)
    aa+=a;bb+=b;fees+=fee;protocol+=pro;curveA+=ca;curveB+=cb
   ck(aa==int(state['poolAAtoms'])and bb==int(state['principalBLamports']))
   ck(fees==int(state['lpFeeLamports'])and protocol==int(state['protocolLamports']))
   ck(seed+int(state['demandLamports'])==bb+fees+protocol+int(state['cashLamports']))
  post=event['postSale'];pre=event['preSale'];p=price(post);p_pre=price(pre)
  reserve=sum(int(l['curveB'])for l in post['legs']);a=sum(int(l['curveA'])for l in post['legs']);claimable=sum(int(l['claimableLPFeeB'])for l in post['legs'])
  hodl=700000000*p+F(seed,unit);lpvalue=F(a,unit)*p+F(reserve+claimable,unit);il=100*(lpvalue-hodl)/hodl;drop=100*(1-p/p_pre)
  ck(reserve>=10*unit);ck(drop<=45);ck(il>=F(-19,100))
  if idx==0:ck(buy<=175000000*unit and F(int(pre['demandLamports']),unit)*fx<=45000)
  minimum=reserve if minimum is None else min(minimum,reserve);minil=il if minil is None else min(minil,il);maxdrop=max(maxdrop,drop)
  pdiff=abs(p*fx-F(continuous['price_USD']));maxprice=max(maxprice,pdiff)
  eventrows.append(dict(id=case['id'],event=event['event'],FX=dec(fx),price_USD=dec(p*fx),withdrawable_principal_SOL=dec(F(reserve,unit)),accounted_principal_SOL=dec(F(int(post['principalBLamports']),unit)),claimable_LP_fees_SOL=dec(F(claimable,unit)),IL_pct=dec(il),drop_pct=dec(drop),continuous_price_USD=continuous['price_USD'],price_delta_USD=dec(p*fx-F(continuous['price_USD'])),reserve_pass=True,drop_pass=True,IL_pass=True))
 ck(distributed==floor(F(inputs['totalClaimsPLOV'])*unit)and pending==0)
 ck(totalBuy==int(case['totalBuyAtoms'])and totalReturn==int(case['totalReturnAtoms']))
 terminal=case['events'][-1]['postSale'];ck(int(terminal['poolAAtoms'])==700000000*unit+distributed+totalReturn-totalBuy)
 ck(int(case['demandLamports'])==int(terminal['demandLamports'])and int(case['cashLamports'])==int(terminal['cashLamports']))
 for f in case['finalFeeClaims']:
  leg=next(l for l in terminal['legs']if l['name']==f['pool'])
  ck(f['actualClaimedB']==f['claimableBefore']==leg['claimableLPFeeB'])
  ck(int(f['ownerLamportDelta'])==int(f['actualClaimedB'])+int(f['priorWsolLamportsRefunded'])-5000)
  ck(f['principalUnchanged']and f['priceUnchanged'])
 deltaD=F(int(case['demandLamports']),unit)-F(ref['expectedContinuousDemandSOL']);maxD=max(maxD,abs(deltaD))
 reports.append(dict(id=case['id'],FX=dec(fx),min_withdrawable_principal_SOL=dec(F(minimum,unit)),min_IL_pct=dec(minil),max_drop_pct=dec(maxdrop),D_SOL=dec(F(int(case['demandLamports']),unit)),D_USD=dec(F(int(case['demandLamports']),unit)*fx),D_minus_continuous_SOL=dec(deltaD),events=5,all_thresholds='PASS'))
ck(len(eventrows)==60 and successes+failures==r['localTransactions'])
ck(swaps==162 and failures==12 and successes==234 and r['localTransactions']==246)
for k in['networkRequests','networkSends','realWalletPrompts']:ck(r[k]==0)
ck(r['Wave1Inputs']is None and r['MAINNET_GO']=='NO')
for name,data in [('v29-native-summary.csv',reports),('v29-native-event-review.csv',eventrows)]:
 with(B/name).open('w')as f:
  writer=csv.DictWriter(f,fieldnames=list(data[0]));writer.writeheader();writer.writerows(data)
out=dict(version=101,status='PASS_NATIVE_V29_WITNESSES_WITHIN_LOCAL_SCOPE',independentChecks=n,cases=12,events=60,swaps=swaps,nativeTransactions=r['localTransactions'],successes=successes,expectedSlippageFailures=failures,localFundingAirdrops=36,actualFinalFeeClaims=24,initialUpperVaultSurplusLamportsPerCase=1,surplusCountedAsPrincipal=False,maxAccountMinusWithdrawableDustAAtoms=maxAdust,maxAccountMinusWithdrawableDustBLamports=maxBdust,maxPriceDeltaUSD=dec(maxprice),maxDemandDeltaSOL=dec(maxD),minWithdrawablePrincipalSOL=min(F(x['min_withdrawable_principal_SOL'])for x in reports).__str__(),primaryFXCases=4,primaryFXResults=[x for x in reports if F(x['FX'])==F('103.8')],nativeResultSHA256=hashlib.sha256(raw).hexdigest(),realConfigAccepted=False,productionLaunchAuthorized=False,newSquadsIntegrationTest=False,sourceBuildParity='NOT_PROVEN',MAINNET_GO='NO')
(B/'v29-native-review.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({k:v for k,v in out.items()if k!='primaryFXResults'},indent=2))
