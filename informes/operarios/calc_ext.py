"""Cálculo de extrusión por turno fichado. Uso: python3 calc_ext.py <dir_trabajo> <desde ISO> <hasta ISO>
Lee datos.json (y turnos.json, que genera turnos.cjs); escribe ext.json."""
import json,sys,os,subprocess,collections
from datetime import datetime,timezone,timedelta
U=timezone.utc;L=timezone(timedelta(hours=-3))
W,DES,HAS=sys.argv[1],datetime.fromisoformat(sys.argv[2]),datetime.fromisoformat(sys.argv[3])
H=os.path.dirname(os.path.abspath(__file__))
CFG=json.load(open(os.path.join(H,'config.json')));AJ=json.load(open(os.path.join(H,'ajustes.json')))
subprocess.run(['node',os.path.join(H,'turnos.cjs'),W,sys.argv[3]],check=True)
d=json.load(open(os.path.join(W,'datos.json')));T=json.load(open(os.path.join(W,'turnos.json')))
G={int(k):v for k,v in CFG['plc_grupos'].items()};DESDE={int(k):datetime.fromisoformat(v) for k,v in CFG['plc_desde'].items()}
buck=collections.defaultdict(dict)
for r in d.get('plc') or []:
  t=datetime.fromisoformat(r['q']).replace(tzinfo=U)
  if t<DESDE[r['grupo']]: continue
  buck[r['grupo']][t]=(r['mov']/10,r['n']/10)
bobs=[b for b in (d.get('bob') or []) if not b['anul']]
byext=collections.defaultdict(list)
for b in bobs: b['t']=datetime.fromisoformat(b['ca']); byext[b['ext']].append(b)
for l in byext.values():
  l.sort(key=lambda b:b['t'])
  for i,b in enumerate(l): b['next']=l[i+1] if i+1<len(l) else None
def b10(t): t=t.replace(second=0,microsecond=0); return t-timedelta(minutes=t.minute%10)
def movio(g,a,z):
  t=b10(a)
  while t<z:
    b=buck[g].get(t)
    if b and b[0]>0: return True
    t+=timedelta(minutes=10)
  return False
def maqmin(a,z):
  res={};arr={}
  for g in G:
    if z<=DESDE[g]: continue
    t=b10(a)
    # arranque: si la máquina no produjo en las 12 h anteriores, el tiempo hasta que arranca es calentamiento y no cuenta
    ext=int(G[g].split('-')[1])
    prev=[b for b in byext.get(ext,[]) if b['t']<a]
    parada=(not prev or (a-prev[-1]['t'])>timedelta(hours=12)) and not movio(g,a-timedelta(hours=12),a)
    if parada:
      tt=t
      while tt<z and not (buck[g].get(tt) and buck[g][tt][0]>0): tt+=timedelta(minutes=10)
      if tt<z: arr[G[g]]=(tt.astimezone(L).strftime('%H:%M'),round((tt-a).total_seconds()/60)); t=tt
    pos=film=0
    while t<z:
      sa=max(a,t);sb=min(z,t+timedelta(minutes=10));m=(sb-sa).total_seconds()/60
      if t>=DESDE[g] and m>0:
        b=buck[g].get(t)
        if b: pos+=m*b[1];film+=m*b[0]
      t+=timedelta(minutes=10)
    # parada justificada (ajustes.json): minutos de máquina parada que German dio por causa técnica; se cuentan como produciendo
    for x in AJ.get('parada_justificada',[]):
      xd=datetime.fromisoformat(x['desde'])
      if x['maq']==G[g] and a<=xd<z: film=min(pos,film+x['minutos'])
    if pos>0: res[G[g]]=(round(pos),round(film))
  return res,arr
def err(b): return float(b['err'] or 0)
out=[]
for e,info in CFG['extrusores'].items():
  op=info['balanza']
  for a,z in T.get(e,[]):
    A=datetime.fromtimestamp(a/1000,U);Z=datetime.fromtimestamp(z/1000,U)
    if A<DES or A>=HAS: continue
    bs=[b for b in bobs if b['op']==op and A-timedelta(minutes=30)<=b['t']<=Z+timedelta(minutes=30)]
    mm,arr=maqmin(A,Z)
    adv=[b for b in bs if b['cal'] in ('ADVERTENCIA','RECHAZO')]
    noc=[b for b in adv if b['next'] and b['next']['op']==op and abs(err(b['next']))>=3 and (err(b['next'])>0)==(err(b)>0)]
    pos=sum(v[0] for v in mm.values());film=sum(v[1] for v in mm.values());fich=(z-a)/60000
    excl=None
    if not mm or pos<0.5*fich: excl='el cuentametros no registró el turno'
    elif film/pos<0.3 and len(bs)<6: excl='máquinas paradas casi todo el turno'
    for x in AJ.get('excluir_turno',[]):
      if str(x['emp'])==e and A.astimezone(L).strftime('%Y-%m-%d')==x['fecha']: excl=x['motivo']
    out.append(dict(emp=int(e),a=a,z=z,fich=fich,excl=excl,n=len(bs),kg=sum(float(b['kg']) for b in bs),
      fino=sum(1 for b in bs if err(b)>3),grueso=sum(1 for b in bs if err(b)<-3),adv=len(adv),rech=sum(1 for b in bs if b['cal']=='RECHAZO'),
      resp=sum(1 for b in adv if b['resp']),nocorr=len(noc),nocorr_l=[(b['nro'],b['ext'],round(err(b),1),b['next']['nro'],round(err(b['next']),1)) for b in noc],
      rech_l=[(b['nro'],b['ext'],round(err(b),1)) for b in bs if b['cal']=='RECHAZO'],maq=mm,arr=arr))
json.dump(out,open(os.path.join(W,'ext.json'),'w'))
print('ext:',len(out),'turnos')
