"""Guarda el resultado de una consulta de Supabase (MCP execute_sql) como JSON limpio.
Uso: python3 guardar.py <archivo_resultado_o_texto> <salida.json>
El archivo puede ser el que guarda el sistema cuando el resultado es grande, o un .txt con el texto del resultado."""
import json,sys
raw=open(sys.argv[1],encoding='utf-8').read()
try:
  r=json.loads(raw); raw=r.get('result',raw) if isinstance(r,dict) else raw
except Exception: pass
a=raw.index('[{'); b=raw.rindex('}]')
v=json.loads(raw[a:b+2])[0]['d']
if isinstance(v,str): v=json.loads(v)
json.dump(v,open(sys.argv[2],'w'))
print('ok',sys.argv[2],{k:len(x or []) for k,x in v.items()} if isinstance(v,dict) else len(v))
