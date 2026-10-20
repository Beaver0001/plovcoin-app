import urllib.request,json,base64,hashlib,pathlib,datetime,argparse
parser=argparse.ArgumentParser(description='Read-only mainnet program fixture download; never signs/sends');parser.add_argument('--output',required=True);parser.add_argument('--support-only',action='store_true');args=parser.parse_args();ROOT=pathlib.Path(args.output).resolve();(ROOT/'fixtures').mkdir(parents=True,exist_ok=True); URL='https://api.mainnet-beta.solana.com'
def rpc(method,params=[]):
 req=urllib.request.Request(URL,data=json.dumps({'jsonrpc':'2.0','id':1,'method':method,'params':params}).encode(),headers={'Content-Type':'application/json'})
 r=json.load(urllib.request.urlopen(req,timeout=45)); assert 'result' in r,r; return r['result']
# base58 codec, needed for loader's ProgramData pointer; no wallet input.
def b58(data):
 chars='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'; n=int.from_bytes(data,'big'); out=''
 while n:n,r=divmod(n,58);out=chars[r]+out
 return '1'*(len(data)-len(data.lstrip(b'\0')))+out
ids=['cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG','SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf']; expected='5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d'
names=['meteora','squads']
if args.support_only:
 names=['spl_token','token2022','ata'];ids=['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA','TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb','ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL']
assert rpc('getGenesisHash')==expected
p=rpc('getMultipleAccounts',[ids,{'encoding':'base64','commitment':'finalized'}]); pending=[];records=[]
def record(name,program,elf,owner,slot,pda=None,deployment=None,raw=None):
 assert elf[:4]==b'\x7fELF';(ROOT/'fixtures'/f'{name}.so').write_bytes(elf)
 records.append({'name':name,'program':program,'loader':owner,'programData':pda,'deploymentSlot':deployment,'accountReadSlot':slot,'programReadSlot':p['context']['slot'],'elfBytes':len(elf),'elfSha256':hashlib.sha256(elf).hexdigest(),'programDataSha256':hashlib.sha256(raw).hexdigest() if raw else None})
for name,program,a in zip(names,ids,p['value']):
 assert a and a['executable'];d=base64.b64decode(a['data'][0])
 if a['owner']=='BPFLoaderUpgradeab1e11111111111111111111111':
  assert int.from_bytes(d[:4],'little')==2;pending.append((name,program,b58(d[4:36])))
 else:
  assert a['owner']=='BPFLoader2111111111111111111111111111111111';record(name,program,d,a['owner'],p['context']['slot'])
if pending:
 r=rpc('getMultipleAccounts',[[x[2] for x in pending],{'encoding':'base64','commitment':'finalized','minContextSlot':p['context']['slot']}])
 for (name,program,pda),a in zip(pending,r['value']):
  d=base64.b64decode(a['data'][0]);assert a['owner']=='BPFLoaderUpgradeab1e11111111111111111111111' and not a['executable'];assert int.from_bytes(d[:4],'little')==3
  record(name,program,d[45:],a['owner'],r['context']['slot'],pda,int.from_bytes(d[4:12],'little'),d)
assert rpc('getGenesisHash')==expected
out={'atUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'rpc':URL,'genesis':expected,'programs':records,'note':'read-only single RPC, different finalized contexts; not source/build parity'}
(ROOT/'program-pins.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
