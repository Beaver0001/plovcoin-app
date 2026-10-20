"""Independent stdlib integer sqrt/deposit oracle; no SDK or model imports."""
from fractions import Fraction as F
from pathlib import Path
from math import isqrt
from itertools import product
import json,hashlib
B=Path(__file__).resolve().parent
inp=(B/'v29-geometry-input.json').read_bytes();i=json.loads(inp);raw=(B/'v29-geometry-result.json').read_bytes();r=json.loads(raw)
n=0
def ck(v):
 global n
 assert v;n+=1
def sha(b):return hashlib.sha256(b).hexdigest()
def ceildiv(a,b):return(a+b-1)//b
u=F('1142480981.4523755081912336211585505561862406110240133621895648983858162546301042')
caps={'MIN':F('34512.45414340313'),'IDEAL':F('47510.87641698001')}
fxs={F('72.66'),F('103.80'),F('134.94')};P=F(3,20000);X=700000000;unit=10**9;scale=2**128
ck(r['inputSHA256']==sha(inp));ck(r['candidateCases']==len(r['rows'])==len(i['cases'])==12)
ck({(c['scenario'],int(c['retentionPercent']),F(c['FX_USD_per_SOL']))for c in i['cases']}==set(product(caps,[90,100],fxs)))
ck(i['tokenADecimals']==i['tokenBDecimals']==9 and int(i['baseSeedPLOV'])==X)
ck(r['primaryFXCases']==4)
maxprice=F(0);maxcoeff=F(0);maxdeficit=F(0)
for c in i['cases']:
 row=next(z for z in r['rows']if z['id']==c['id']);Q=caps[c['scenario']];fx=F(c['FX_USD_per_SOL']);lo=F(100000000000)
 ck(F(c['seed_USD'])==Q and F(c['seed_SOL'])==Q/fx)
 ck(F(c['lowerCoefficientPLOV'])==lo and F(c['upperCoefficientPLOV'])==u)
 prices={'lower':P*(1-Q/(P*lo))**2/fx,'start':P/fx,'upper':P*(u/(u-X))**2/fx}
 sq={}
 for k,v in prices.items():
  ck(F(c['pricesSOLperPLOV'][k]['rational'])==v)
  ck(abs(F(c['pricesSOLperPLOV'][k]['decimal'])-v)<F('1e-95'))
  a=v.numerator*scale;d=v.denominator;z=isqrt(a//d)
  ck(z*z*d<=a<(z+1)**2*d)
  ck(z==int(row['sqrtQ64'][k]));sq[k]=z
  error=(v-F(z*z,scale))/v;ck(0<=error<F('1e-14'));maxprice=max(maxprice,error)
 ck(4295048016<=sq['lower']<sq['start']<sq['upper']<=79226673521066979257578248091)
 budget=(Q/fx*unit).numerator//(Q/fx*unit).denominator
 deficit=Q/fx*unit-budget;ck(0<=deficit<1);maxdeficit=max(maxdeficit,deficit)
 ck(int(row['seedSOLAtomsBudgetFloor'])==budget and len(row['legs'])==2)
 for leg in row['legs']:
  upper=leg['name']=='UPPER';mn=sq['start']if upper else sq['lower'];mx=sq['upper']if upper else sq['start'];cur=sq['start']
  ck(int(leg['sqrtMin'])==mn and int(leg['sqrtMax'])==mx and int(leg['sqrtInitial'])==cur)
  L=(X*unit*mn*mx)//(mx-mn)if upper else budget*scale//(mx-mn)
  ck(0<L<2**128 and L==int(leg['liquidityU128']))
  numeratorA=L*(mx-cur);denominatorA=cur*mx;numeratorB=L*(cur-mn)
  ck(max(numeratorA,denominatorA,numeratorB,L*mx,X*unit*mn*mx,budget*scale)<2**256)
  vals={'amountAUp':ceildiv(numeratorA,denominatorA),'amountADown':numeratorA//denominatorA,'amountBUp':ceildiv(numeratorB,scale),'amountBDown':numeratorB//scale,'budgetA':X*unit if upper else 0,'budgetB':0 if upper else budget}
  for key,value in vals.items():ck(int(leg[key])==value)
  ck(vals['amountAUp']==vals['budgetA']and vals['amountBUp']==vals['budgetB'])
  ck(vals['amountAUp']-vals['amountADown']in[0,1]and vals['amountBUp']-vals['amountBDown']in[0,1])
  ck(leg['unspentA']==leg['unspentB']=='0' and leg['nativeExecution']=='NOT_RUN')
  coeff=F(L,cur*unit);target=u if upper else lo;err=abs(coeff/target-1);ck(err<F('1e-10'));maxcoeff=max(maxcoeff,err)
for k in ['RPCRequests','walletPrompts','signatures','transactionBuilds','networkSends']:ck(r[k]==0)
ck(i['Wave1Inputs']is None and r['Wave1Inputs']is None and not i['productionGeometryApproved'])
ck(i['MAINNET_GO']==r['MAINNET_GO']=='NO')
out=dict(status='PASS_INDEPENDENT_INTEGER_ORACLE',checks=n,candidateCases=12,poolLegs=24,primaryFXCases=4,inputSHA256=sha(inp),sdkResultSHA256=sha(raw),maxRelativePriceFloorError=str(maxprice),maxRelativeVirtualCoefficientError=str(maxcoeff),maxSeedBudgetDeficitLamports=str(maxdeficit),allSqrtFloorsExact=True,initialAtomicBudgetsExceeded=False,allDisplayedProductsFitU256=True,fullAtomicPathReplay='NOT_RUN',nativeExecution='NOT_RUN',realConfigAccepted=False,MAINNET_GO='NO')
(B/'v29-geometry-independent.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({k:v for k,v in out.items()if not k.startswith('max')}))
print('maxRelativePriceFloorError≈',float(maxprice),'maxRelativeVirtualCoefficientError≈',float(maxcoeff),'maxSeedBudgetDeficitLamports≈',float(maxdeficit))
