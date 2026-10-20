"""Informe de operarios (corte y extrusión) — diario o semanal.

Pasos (ver README.md):
  1) python3 informe.py rango  --tipo semana|dia [--fecha AAAA-MM-DD]   -> imprime DESDE/HASTA para las consultas SQL
  2) correr sql/datos.sql y sql/tandas.sql con ese rango y guardar con guardar.py en <dir>/datos.json y <dir>/tandas.json
  3) python3 informe.py calc   --tipo ... --fecha ... --dir <dir>      -> <dir>/metricas.json (+ resumen en pantalla)
  4) escribir <dir>/textos.json (frases para cada hoja; ver README)
  5) python3 informe.py render --dir <dir>                              -> <dir>/informe.html y <dir>/informe.pdf
"""
import json, os, sys, argparse, subprocess, collections, statistics, html
from datetime import datetime, timedelta, timezone, date

L = timezone(timedelta(hours=-3)); U = timezone.utc
H = os.path.dirname(os.path.abspath(__file__))
CFG = json.load(open(os.path.join(H, 'config.json')))
DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
MESES = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']


def dt(ms): return datetime.fromtimestamp(ms / 1000, L)
def n(x, d=0):
    s = f"{x:,.{d}f}"; return s.replace(',', 'X').replace('.', ',').replace('X', '.')
def pct(x): return n(100 * x) + ' %'
def hm(m):
    m = round(m or 0); return f"{m // 60} h {m % 60:02d}" if m >= 60 else f"{m} min"
def esc(s): return html.escape(str(s))
def prod_corto(p):
    p = str(p or '').upper()
    for a in ['BOLSARESIDUO ', 'BOLSA RESIDUO ', 'GRANEL ']: p = p.replace(a, '')
    return p.title()[:24]


# ---------------- períodos ----------------
def periodos(tipo, fecha):
    """Devuelve lista [(clave, etiqueta, desde, hasta)] — el primero es el período del informe."""
    hoy = datetime.now(L).date()
    if tipo == 'semana':
        if fecha: d0 = date.fromisoformat(fecha)
        else:
            d0 = hoy - timedelta(days=hoy.weekday() + 7)   # lunes de la semana pasada
        d0 = d0 - timedelta(days=d0.weekday())
        out = []
        for k in range(4):
            a = d0 - timedelta(days=7 * k)
            out.append((f'S{k}', f"{a.strftime('%d/%m')}–{(a + timedelta(days=5)).strftime('%d/%m')}",
                        datetime(a.year, a.month, a.day, tzinfo=L), datetime(a.year, a.month, a.day, tzinfo=L) + timedelta(days=7)))
        return out
    # día de producción: turnos que empiezan entre las 05:00 de ese día y las 05:00 del siguiente
    if fecha: d0 = date.fromisoformat(fecha)
    else:
        d0 = hoy - timedelta(days=1)
        while d0.weekday() == 6: d0 -= timedelta(days=1)   # domingo -> sábado
    a = datetime(d0.year, d0.month, d0.day, 5, tzinfo=L)
    return [('D0', f"{DIAS[d0.weekday()]} {d0.strftime('%d/%m')}", a, a + timedelta(days=1)),
            ('ANT', 'turno anterior', a - timedelta(days=9), a)]


def rango(tipo, fecha):
    P = periodos(tipo, fecha)
    desde = min(p[2] for p in P) - timedelta(days=2)
    hasta = max(p[3] for p in P) + timedelta(hours=4)
    return desde, hasta


# ---------------- agregados ----------------
def jor(r, ext):
    a = dt(r['a'])
    if ext: return 8 if (a.hour >= 20 or a.hour < 4) else 9
    return 12 if r['fich'] >= 630 else 9


def agg(rs, ext):
    w = collections.defaultdict(float); w['cbL'] = []; jors = []
    for r in rs:
        w['trab'] += 1; w['sab'] += dt(r['a']).weekday() == 5
        if r['excl']: continue
        w['dias'] += 1
        for k in ['fich', 'cort', 'golpes', 'cargas', 'nLarga', 'larga', 'arr', 'cie', 'sinG', 'cbN', 'cbT', 'ocN', 'ocT',
                  'n', 'kg', 'fino', 'grueso', 'adv', 'resp', 'nocorr', 'rech']:
            v = r.get(k, 0)
            if isinstance(v, (int, float)): w[k] += v
        for k in ['mano', 'sinEsc']:
            if r.get(k) is not None: w[k] += r[k]; w['hayOrigen'] = 1
        w['cbL'] += r.get('cbL', [])
        if dt(r['a']).weekday() != 5: jors.append(jor(r, ext))
        if ext:
            pos = sum(v[0] for v in r['maq'].values()); film = sum(v[1] for v in r['maq'].values())
            w['pos'] += pos; w['film'] += film; w['fr'] += (pos - film) / r['fich'] if r['fich'] else 0
        else:
            w['fr'] += (r['fich'] - r['cort']) / r['fich'] if r['fich'] else 0
    js = jors or [9]
    w['ref'] = max(set(js), key=lambda j: (js.count(j), j))
    w['pj'] = w['fr'] / w['dias'] * w['ref'] * 60 if w['dias'] else 0
    w['cbMed'] = statistics.median(w['cbL']) if w['cbL'] else None
    return dict(w)


def calc(args):
    dia = args.tipo == 'dia'
    P = periodos(args.tipo, args.fecha); desde, hasta = rango(args.tipo, args.fecha)
    W = args.dir
    subprocess.run(['node', os.path.join(H, 'calc_corte.cjs'), W, desde.isoformat(), hasta.isoformat()], check=True)
    subprocess.run(['python3', os.path.join(H, 'calc_ext.py'), W, desde.isoformat(), hasta.isoformat()], check=True)
    C = json.load(open(os.path.join(W, 'corte.json'))); E = json.load(open(os.path.join(W, 'ext.json')))
    def per(r):
        t = dt(r['a'])
        for k, _, a, z in P:
            if a <= t < z: return k
        return None
    M = {'tipo': args.tipo, 'periodos': [(k, e, a.isoformat(), z.isoformat()) for k, e, a, z in P], 'emp': {}}
    for area, lst, ids in [('Corte', C['turnos'], CFG['cortadores']), ('Extrusión', E, CFG['extrusores'])]:
        ext = area == 'Extrusión'
        for e, info in ids.items():
            nom = info if isinstance(info, str) else info['nombre']
            rs = [r for r in lst if str(r['emp']) == e]
            for r in rs: r['per'] = per(r)
            if args.tipo == 'dia':
                hoy = [r for r in rs if r['per'] == 'D0']
                ant = [r for r in rs if r['per'] == 'ANT' and not r['excl']]
                ant = ant[-1:] if ant else []
                por = {'D0': hoy, 'ANT': ant}
            else:
                por = {k: [r for r in rs if r['per'] == k] for k, *_ in P}
            if not por[P[0][0]]: continue
            M['emp'][e] = {'nombre': nom, 'area': area, 'agg': {k: agg(v, ext) for k, v in por.items()},
                           'turnos': sorted(por[P[0][0]], key=lambda r: r['a']),
                           'ant': sorted(por.get('ANT', []), key=lambda r: r['a'])}
            if not ext:
                a0, z0 = P[0][2], P[0][3]
                if dia: a0 = a0 - timedelta(hours=5)   # cierres del día calendario
                M['emp'][e]['cierres'] = [c for c in C['cierres'] if str(c['main']) == e and a0 <= datetime.fromisoformat(c['fecha'].replace('Z', '+00:00')) < z0]
    json.dump(M, open(os.path.join(W, 'metricas.json'), 'w'), ensure_ascii=False)
    # resumen en pantalla para escribir los textos
    k0 = P[0][0]
    for e, x in M['emp'].items():
        print(f"\n== {x['nombre']} ({x['area']}) id {e}")
        for k, et, *_ in P:
            w = x['agg'].get(k)
            if not w or not w.get('dias'): print(f"  {k} {et}: sin datos ({int(w['trab']) if w else 0} turnos)"); continue
            if x['area'] == 'Corte':
                print(f"  {k} {et}: turnos {int(w['dias'])}/{int(w['trab'])} fich {w['fich']/60:.1f}h cort {100*w['cort']/w['fich']:.0f}% parado/jornada {hm(w['pj'])} (ref {w['ref']}h) "
                      f"cambios {int(w['cbN'])} ({w['cbMed'] and round(w['cbMed'],1)} min c/u) otras {int(w['ocN'])}·{hm(w['ocT'])} largas {int(w['nLarga'])}·{hm(w['larga'])} "
                      f"sin cortar {hm(w['arr']+w['cie']+w['sinG'])} golpes {int(w['golpes'])} mano {w.get('mano')} sinEsc {w.get('sinEsc')}")
            else:
                print(f"  {k} {et}: turnos {int(w['dias'])}/{int(w['trab'])} fich {w['fich']/60:.1f}h produciendo {100*w['film']/w['pos'] if w['pos'] else 0:.0f}% parada/jornada {hm(w['pj'])} "
                      f"kg {w['kg']:.0f} kg/hf {w['kg']/(w['fich']/60):.0f} justas {100*(1-(w['fino']+w['grueso'])/w['n']) if w['n'] else 0:.0f}% finas {int(w['fino'])} gruesas {int(w['grueso'])} "
                      f"avisos {int(w['adv'])} contestó {int(w['resp'])} sin corregir {int(w['nocorr'])} rechazos {int(w['rech'])}")
        for r in x['turnos']:
            t = dt(r['a'])
            extra = f" EXCLUIDO: {r['excl']}" if r['excl'] else ''
            if x['area'] == 'Corte':
                print(f"    {DIAS[t.weekday()]} {t.strftime('%d/%m %H:%M')} fich {hm(r['fich'])} cort {hm(r['cort'])} cambios {r['cbN']} largas {r['largas']} entrar/salir {hm(r['arr'])}/{hm(r['cie'])} golpes {r['golpes']} mano {r['mano']} sinEsc {r['sinEsc']}{extra}")
            else:
                print(f"    {DIAS[t.weekday()]} {t.strftime('%d/%m %H:%M')} fich {hm(r['fich'])} maq {r['maq']} arranque {r['arr']} bobinas {r['n']} finas {r['fino']} gruesas {r['grueso']} sin corregir {r['nocorr_l']} rechazos {r['rech_l']}{extra}")
        for c in x.get('cierres', []):
            if c.get('sinPlc'): print(f"    OC {c['n']} no se compara: {c['sinPlc']} de {c['nb']} bobinas sin metros del PLC"); continue
            print(f"    OC {c['n']} {c['prod'][:30]} {'faltan' if c['faltan']>0 else 'sobran'} {abs(round(c['faltan']))} ({abs(c['pct'])*100:.1f}%) golpes {c['dif'] and round(c['dif']*100,1)}% expl: {c['expl']}")


# ---------------- render ----------------
def render(args):
    W = args.dir
    M = json.load(open(os.path.join(W, 'metricas.json'))); T = json.load(open(os.path.join(W, 'textos.json')))
    P = M['periodos']; k0 = P[0][0]; dia = M['tipo'] == 'dia'
    kcomp = 'ANT' if dia else P[1][0]

    def delta(e, f, better, fmt):
        a = M['emp'][e]['agg'].get(k0); b = M['emp'][e]['agg'].get(kcomp)
        if not a or not b or not a.get('dias') or not b.get('dias'): return ('', '')
        try: va, vb = f(a), f(b)
        except Exception: return ('', '')
        if va is None or vb is None or abs(va - vb) < 1e-9: return ('', '= igual que antes')
        good = (va > vb) == (better == 'up')
        return ('good' if good else 'bad', ('▲ ' if va > vb else '▼ ') + 'antes ' + fmt(vb))

    def tile(lbl, val, sub, d):
        return f'<div class="tile {d[0]}"><div class="tl">{lbl}</div><div class="tv">{val}</div><div class="ts">{sub}</div><div class="td">{d[1]}</div></div>'

    def cmp_row(e, label, f, fmt, better):
        cells = []
        ws = [M['emp'][e]['agg'].get(k) for k, *_ in P]
        vals = []
        for w in ws:
            try: vals.append(f(w) if w and w.get('dias') else None)
            except Exception: vals.append(None)
        for i, v in enumerate(vals):
            if v is None: cells.append('<td class="na">—</td>'); continue
            cls = ''
            if i == 0 and vals[1] is not None and abs(v - vals[1]) > 1e-9:
                cls = ' class="' + ('good' if (v > vals[1]) == (better == 'up') else 'bad') + '"'
            cells.append(f'<td{cls}>{fmt(v)}</td>')
        return f'<tr><th>{label}</th>' + ''.join(cells) + '</tr>'

    def txt_row(e, label, f):
        ws = [M['emp'][e]['agg'].get(k) for k, *_ in P]
        return f'<tr><th>{label}</th>' + ''.join('<td>' + (f(w) if w and w.get('trab') else '—') + '</td>' for w in ws) + '</tr>'

    def dtrab(w): return str(int(w['trab'] - w['sab'])) + (' + sáb' if w['sab'] else '') + f" ({int(w['dias'])} con datos)"

    def filas_dia(e, rs, ext):
        out = []
        for r in rs:
            a = dt(r['a']); z = dt(r['z'])
            tag = ' <span class="sab">sábado</span>' if a.weekday() == 5 else ''
            if ext and r.get('arr'): tag += ' <span class="sab">arranque</span>'
            fecha = f"{DIAS[a.weekday()]} {a.strftime('%d/%m')}{tag}"
            if r['excl']:
                out.append(f"<tr class='ex'><th>{fecha}</th><td>{a.strftime('%H:%M')}–{z.strftime('%H:%M')}</td><td colspan='9'>No cuenta: {esc(r['excl'])}</td></tr>"); continue
            if not ext:
                lg = (f"{r['nLarga']} · {hm(r['larga'])}") if r['nLarga'] else '0'
                out.append(f"<tr><th>{fecha}</th><td>{a.strftime('%H:%M')}–{z.strftime('%H:%M')}</td><td>{n(r['fich']/60,1)} h</td><td>{n(r['cort']/60,1)} h</td>"
                           f"<td{' class=bad' if r['fich'] and r['cort']/r['fich']<0.5 else ''}>{pct(r['cort']/r['fich']) if r['fich'] else '—'}</td><td>{hm(r['fich']-r['cort'])}</td>"
                           f"<td>{r['cbN']} · {hm(r['cbT'])}</td><td>{r['ocN']} · {hm(r['ocT'])}</td><td>{lg}</td><td>{hm(r['arr'])} / {hm(r['cie'])}</td><td>{n(r['golpes'])}</td></tr>")
            else:
                pos = sum(v[0] for v in r['maq'].values()); film = sum(v[1] for v in r['maq'].values()); fuera = r['fino'] + r['grueso']
                out.append(f"<tr><th>{fecha}</th><td>{a.strftime('%H:%M')}–{z.strftime('%H:%M')}</td><td>{n(r['fich']/60,1)} h</td>"
                           f"<td{' class=bad' if pos and film/pos<0.9 else ''}>{pct(film/pos) if pos else '—'}</td><td>{hm(pos-film)}</td><td>{r['n']} · {n(r['kg'])} kg</td>"
                           f"<td{' class=bad' if r['n'] and fuera/r['n']>0.4 else ''}>{fuera} de {r['n']}</td><td{' class=bad' if r['nocorr'] else ''}>{r['nocorr']}</td><td>{r['rech']}</td></tr>")
        return out

    def arranques(e, rs):
        filas = []
        for r in rs:
            for m, (h, mins) in sorted(r.get('arr', {}).items()):
                filas.append(f"<tr><th>{dt(r['a']).strftime('%d/%m')} · {m}</th><td>{h}</td><td>{hm(mins)}</td></tr>")
        if not filas: return ''
        return ('<h3>Arranque de máquinas (calentamiento, no cuenta como parada)</h3><div class="tw"><table class="t sm"><tr><th>Día · máquina</th><th>Empezó a producir</th><th>Después de fichar</th></tr>'
                + ''.join(filas) + '</table></div>')

    def cierres_html(cs):
        if not cs: return ''
        rows = []
        for c in sorted(cs, key=lambda c: -c['pct']):
            ok = abs(c['pct']) <= 0.01
            if c.get('sinPlc'):
                rows.append(f"<tr><th>{c['n'][-4:]}</th><td>{esc(prod_corto(c['prod']))}</td><td class='na'>no se compara</td><td>metros a mano</td></tr>"); continue
            res = 'cierra' if ok else (('faltan ' if c['faltan'] > 0 else 'sobran ') + n(abs(c['faltan'])) + f" ({n(abs(c['pct'])*100,1)} %)")
            rows.append(f"<tr><th>{c['n'][-4:]}</th><td>{esc(prod_corto(c['prod']))}</td><td class='{'good' if ok else 'bad'}' style='white-space:nowrap'>{res}</td><td>{esc((c['expl'] or '—').replace('Descarte de arranques sin pesar: ','Descarte sin pesar · ')[:34])}</td></tr>")
        hd = '<tr><th>OC</th><th>Producto</th><th>Resultado</th><th>Qué se anotó</th></tr>'
        if len(rows) > 4:
            h2 = (len(rows) + 1) // 2
            return f'<h3>Órdenes que cerró</h3><div class="oc2"><table class="t sm">{hd}{"".join(rows[:h2])}</table><table class="t sm">{hd}{"".join(rows[h2:])}</table></div>'
        return f'<h3>Órdenes que cerró</h3><div class="tw"><table class="t sm">{hd}{"".join(rows)}</table></div>'

    titulo_per = P[0][1]
    if dia:
        d0 = datetime.fromisoformat(P[0][2]); sem_txt = f"{DIAS[d0.weekday()]} {d0.day} de {MESES[d0.month]} de {d0.year}"
        contra = 'el turno anterior de cada uno'
    else:
        d0 = datetime.fromisoformat(P[0][2]); d1 = d0 + timedelta(days=5)
        sem_txt = f"Semana del {d0.day}/{d0.month} al {d1.day}/{d1.month}/{d1.year}"; contra = 'la semana anterior'
    secs = []; nav = []
    orden = [e for e in T.get('orden', []) if e in M['emp']] + [e for e in M['emp'] if e not in T.get('orden', [])]
    for e in orden:
        x = M['emp'][e]; t = T['empleados'].get(e, {}); ext = x['area'] == 'Extrusión'; w = x['agg'][k0]
        if not w.get('dias'): w = w
        if not ext:
            tiles = [tile('Horas fichadas', n(w.get('fich', 0)/60, 1) + ' h', f"{int(w.get('dias',0))} turno(s)" + (' con sábado' if w.get('sab') else ''), ('', '')),
                     tile('Cortando', pct(w['cort']/w['fich']) if w.get('fich') else '—', n(w.get('cort',0)/60, 1) + ' h', delta(e, lambda w: w['cort']/w['fich'], 'up', pct)),
                     tile('Parado por jornada', hm(w.get('pj')), f"jornada de {n(w.get('ref',9))} h", delta(e, lambda w: w['pj'], 'down', hm)),
                     tile('Cambio de bobina', (n(w['cbMed'], 1) + ' min') if w.get('cbMed') else '—', f"{int(w.get('cbN',0))} cambios", delta(e, lambda w: w['cbMed'], 'down', lambda v: n(v, 1) + ' min'))]
            head = '<tr><th>Día</th><th>Fichó</th><th>Fichado</th><th>Cortando</th><th>%</th><th>Tiempo muerto</th><th>Cambios de bobina</th><th>Otras cortas</th><th>Paradas largas</th><th>Al entrar / salir</th><th>Golpes</th></tr>'
            cmp = [txt_row(e, 'Días trabajados' if not dia else 'Turnos', dtrab),
                   cmp_row(e, 'Horas fichadas', lambda w: w['fich']/60, lambda v: n(v, 1) + ' h', 'up'),
                   cmp_row(e, 'Cortando, % del fichado', lambda w: w['cort']/w['fich'], pct, 'up'),
                   cmp_row(e, 'Tiempo parado (total)', lambda w: w['fich']-w['cort'], hm, 'down'),
                   cmp_row(e, 'Tiempo parado por jornada (9 h; 12 h turnos largos)', lambda w: w['pj'], hm, 'down'),
                   txt_row(e, 'Cambios de bobina (cuántos · tiempo)', lambda w: f"{int(w['cbN'])} · {hm(w['cbT'])}" if w.get('dias') else '—'),
                   cmp_row(e, 'Cambio de bobina: lo que tarda (típico)', lambda w: w['cbMed'], lambda v: n(v, 1) + ' min', 'down'),
                   txt_row(e, 'Otras paradas cortas, 3 a 20 min (cuántas · tiempo)', lambda w: f"{int(w['ocN'])} · {hm(w['ocT'])}" if w.get('dias') else '—'),
                   txt_row(e, 'Paradas largas, más de 20 min (cuántas · tiempo)', lambda w: f"{int(w['nLarga'])} · {hm(w['larga'])}" if w.get('dias') else '—'),
                   cmp_row(e, 'Fichado sin cortar (al entrar, al salir o el día entero)', lambda w: w['arr']+w['cie']+w['sinG'], hm, 'down'),
                   cmp_row(e, 'Golpes por hora cortando', lambda w: w['golpes']/(w['cort']/60), lambda v: n(v), 'up'),
                   cmp_row(e, 'Bobinas cargadas a mano', lambda w: w['mano'] if w.get('hayOrigen') else None, lambda v: n(v), 'down'),
                   cmp_row(e, 'Bobinas cortadas sin escanear', lambda w: w['sinEsc'] if w.get('hayOrigen') else None, lambda v: n(v), 'down')]
            extra = cierres_html(x.get('cierres', []))
        else:
            tiles = [tile('Horas fichadas', n(w.get('fich', 0)/60, 1) + ' h', f"{int(w.get('dias',0))} turno(s)" + (' con sábado' if w.get('sab') else ''), ('', '')),
                     tile('Máquinas produciendo', pct(w['film']/w['pos']) if w.get('pos') else '—', 'sin contar el arranque', delta(e, lambda w: w['film']/w['pos'], 'up', pct)),
                     tile('Peso justo (±3 %)', pct(1-(w['fino']+w['grueso'])/w['n']) if w.get('n') else '—', f"{int(w.get('fino',0))} finas · {int(w.get('grueso',0))} gruesas", delta(e, lambda w: 1-(w['fino']+w['grueso'])/w['n'], 'up', pct)),
                     tile('Avisos sin corregir', str(int(w.get('nocorr', 0))), f"de {int(w.get('adv',0))} avisos · contestó {int(w.get('resp',0))}", delta(e, lambda w: w['nocorr'], 'down', lambda v: n(v)))]
            head = '<tr><th>Día</th><th>Fichó</th><th>Fichado</th><th>Máquinas produciendo</th><th>Máquina parada</th><th>Bobinas</th><th>Fuera de ±3 %</th><th>Avisos sin corregir</th><th>Rechazos</th></tr>'
            cmp = [txt_row(e, 'Días trabajados' if not dia else 'Turnos', dtrab),
                   cmp_row(e, 'Horas fichadas', lambda w: w['fich']/60, lambda v: n(v, 1) + ' h', 'up'),
                   cmp_row(e, 'Máquinas produciendo', lambda w: w['film']/w['pos'], pct, 'up'),
                   cmp_row(e, 'Máquina parada (total, 3 máquinas)', lambda w: w['pos']-w['film'], hm, 'down'),
                   cmp_row(e, 'Máquina parada por jornada (sumando las 3; 8 h de noche)', lambda w: w['pj'], hm, 'down'),
                   cmp_row(e, 'kg por hora fichada', lambda w: w['kg']/(w['fich']/60), lambda v: n(v), 'up'),
                   cmp_row(e, 'Bobinas con el peso justo (±3 %)', lambda w: 1-(w['fino']+w['grueso'])/w['n'], pct, 'up'),
                   cmp_row(e, 'Avisos sin corregir', lambda w: w['nocorr'], lambda v: n(v), 'down'),
                   cmp_row(e, 'Rechazos', lambda w: w['rech'], lambda v: n(v), 'down')]
            extra = arranques(e, x['turnos'])
        filas = filas_dia(e, x['turnos'], ext)
        if dia and x.get('ant'):
            filas = [f"<tr class='sep'><th colspan='11'>Turno anterior</th></tr>"] + filas_dia(e, x['ant'], ext) + [f"<tr class='sep'><th colspan='11'>Este turno</th></tr>"] + filas
        mal = ''.join(f'<li>{li}</li>' for li in t.get('corregir', [])) or '<li>Sin desvíos para marcar.</li>'
        bien = ''.join(f'<li>{li}</li>' for li in t.get('bien', [])) or '<li>—</li>'
        cols = ''.join(f'<th>{esc(k if not dia else ("Este turno" if k == "D0" else "Turno anterior"))}<span>{esc(et) if not dia else ""}</span></th>' for k, et, *_ in P)
        turno = t.get('turno', '')
        nav.append(f'<a href="#e{e}">{esc(x["nombre"].split()[-1])}</a>')
        secs.append(f"""<section class="hoja" id="e{e}">
<header class="hh"><div><div class="eyebrow">{x['area']}{(' · turno ' + esc(turno)) if turno else ''}</div><h2>{esc(x['nombre'])}</h2></div><div class="sem">{sem_txt}<br>ARIALPLAST · Berisso</div></header>
<p class="lead">{t.get('lead','')}</p>
<div class="tiles">{''.join(tiles)}</div>
<div class="cols"><div class="box mal"><h3>Para hablar y corregir</h3><ul>{mal}</ul></div><div class="box bien"><h3>Lo que estuvo bien</h3><ul>{bien}</ul></div></div>
<h3>{'Turno por turno' if dia else 'Día por día'}</h3><div class="tw"><table class="t">{head}{''.join(filas)}</table></div>
<h3>{'Contra el turno anterior' if dia else 'Contra las 3 semanas anteriores'}</h3><div class="tw"><table class="t cmp"><tr><th></th>{cols}</tr>{''.join(cmp)}</table></div>
<p class="nota">Verde o rojo: contra {contra}.{t.get('nota','')}</p>
{extra}
<div class="firma"><span>Charla el ____/____/____</span><span>Firma ______________________</span><span>Próxima revisión ____/____</span></div>
</section>""")

    # resúmenes por sector
    def resumen(area, sid):
        R = T.get('resumen', {}).get(sid, {})
        ids = [e for e in orden if M['emp'][e]['area'] == area]
        if not ids: return ''
        rows = []
        for e in ids:
            w = M['emp'][e]['agg'][k0]
            if not w.get('dias'): rows.append(f"<tr><th>{esc(M['emp'][e]['nombre'])}</th><td colspan='9'>sin datos</td></tr>"); continue
            d = lambda f, b: delta(e, f, b, lambda v: '')[0]
            if area == 'Corte':
                cs = [c for c in M['emp'][e].get('cierres', []) if not c.get('sinPlc')]
                ci = sum(1 for c in cs if abs(c['pct']) <= 0.01); fa = [c for c in cs if c['pct'] > 0.01]; so = [c for c in cs if c['pct'] < -0.01]
                rows.append(f"<tr><th>{esc(M['emp'][e]['nombre'])}</th><td>{n(w['fich']/60,1)} h</td><td class='{d(lambda w:w['cort']/w['fich'],'up')}'>{pct(w['cort']/w['fich'])}</td>"
                            f"<td class='{d(lambda w:w['pj'],'down')}'>{hm(w['pj'])}<span class='j'> /{n(w['ref'])} h</span></td><td>{int(w['cbN'])} · <span class='{d(lambda w:w['cbMed'],'down')}'>{n(w['cbMed'] or 0,1)} min</span></td>"
                            f"<td>{int(w['ocN'])} · {hm(w['ocT'])}</td><td class='{d(lambda w:w['nLarga'],'down')}'>{int(w['nLarga'])} · {hm(w['larga'])}</td><td>{hm(w['arr']+w['cie']+w['sinG'])}</td><td>{n(w['golpes'])}</td>"
                            f"<td>{len(cs)}: {ci} justas · {len(fa)} faltan ({n(sum(c['faltan'] for c in fa))}) · {len(so)} sobran ({n(-sum(c['faltan'] for c in so))})</td></tr>")
            else:
                rows.append(f"<tr><th>{esc(M['emp'][e]['nombre'])}</th><td>{n(w['fich']/60,1)} h</td><td class='{d(lambda w:w['film']/w['pos'],'up')}'>{pct(w['film']/w['pos']) if w['pos'] else '—'}</td>"
                            f"<td>{hm(w['pj'])}<span class='j'> /{n(w['ref'])} h</span></td><td>{n(w['kg'])} kg · {n(w['kg']/(w['fich']/60))}</td>"
                            f"<td class='{d(lambda w:1-(w['fino']+w['grueso'])/w['n'],'up')}'>{pct(1-(w['fino']+w['grueso'])/w['n']) if w['n'] else '—'}</td><td>{int(w['fino'])} / {int(w['grueso'])}</td>"
                            f"<td>{int(w['adv'])} · {int(w['resp'])}</td><td class='{d(lambda w:w['nocorr'],'down')}'>{int(w['nocorr'])}</td><td>{int(w['rech'])}</td></tr>")
        if area == 'Corte':
            hd = "<tr><th>Operario</th><th>Fichado</th><th>Cortando</th><th>Parado por jornada</th><th>Cambios de bobina · tarda</th><th>Otras cortas</th><th>Paradas largas</th><th>Fichado sin cortar</th><th>Golpes</th><th>Órdenes cerradas</th></tr>"
        else:
            hd = "<tr><th>Operario</th><th>Fichado</th><th>Máquinas produciendo</th><th>Parada por jornada (3 máq.)</th><th>Producción · kg/h fichada</th><th>Peso justo</th><th>Finas / gruesas</th><th>Avisos · contestó</th><th>Sin corregir</th><th>Rechazos</th></tr>"
        cajas = ''.join(f'<div class="box {c.get("tipo","mal")}"><h3>{c["titulo"]}</h3><ul>{"".join(f"<li>{li}</li>" for li in c["items"])}</ul></div>' for c in R.get('cajas', []))
        nav.insert(len([s for s in nav if 'res-' in s]), f'<a href="#res-{sid}">Resumen {area.lower()}</a>')
        return f"""<section class="hoja res" id="res-{sid}">
<header class="hh"><div><div class="eyebrow">Resumen del sector</div><h2>{area}</h2></div><div class="sem">{sem_txt}<br>ARIALPLAST · Berisso</div></header>
<p class="lead">{R.get('lead','')}</p>
<div class="tw"><table class="t big">{hd}{''.join(rows)}</table></div>
<p class="nota">Verde o rojo: contra {contra}. Parado por jornada: el % del tiempo fichado que estuvo parado, llevado a la jornada normal de ese turno.</p>
<div class="cols3">{cajas}</div>
</section>"""
    res = resumen('Corte', 'corte') + resumen('Extrusión', 'ext')
    pie = """<div class="pie"><b>Cómo se mide</b><ul>
<li>Fichado: reloj. Cortando: tiempo con golpes (pausas de menos de 3 min cuentan como cortando). Tiempo muerto = cambios de bobina + otras paradas cortas (3 a 20 min) + paradas largas (más de 20 min) + fichado sin cortar. Una parada es «cambio de bobina» si se escaneó una bobina en esa cortadora durante la parada o hasta 5 min después.</li>
<li>Extrusión: «máquinas produciendo» = minutos con film corriendo en el cuentametros mientras el operario estaba fichado. Si la máquina venía parada (más de 12 h sin producir), el tiempo hasta que arranca es calentamiento y no cuenta como parada.</li>
<li>Sábado de 6 h: por eso se comparan totales y tiempos «por jornada» (9 h; 8 h la noche de extrusión; 12 h los turnos largos de corte).</li>
<li>Un turno no cuenta si ese día no hubo registro, si las máquinas estuvieron paradas casi todo el turno o si falta la entrada o la salida del reloj.</li></ul></div>"""
    tit = ('Informe diario operarios' if dia else 'Informe semanal operarios')
    tpl = open(os.path.join(H, 'plantilla.html')).read()
    out = (tpl.replace('{{TITULO}}', tit).replace('{{H1}}', f"{tit} · {sem_txt}").replace('{{CONTRA}}', contra)
           .replace('{{NAV}}', ''.join(nav)).replace('{{SECS}}', res + '\n'.join(secs)).replace('{{PIE}}', pie))
    open(os.path.join(W, 'informe.html'), 'w').write(out)
    subprocess.run(['node', os.path.join(H, 'pdf.cjs'), os.path.join(W, 'informe.html'), os.path.join(W, 'informe.pdf')], check=True)
    print('listo:', os.path.join(W, 'informe.html'), os.path.join(W, 'informe.pdf'))


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('paso', choices=['rango', 'calc', 'render'])
    ap.add_argument('--tipo', choices=['semana', 'dia']); ap.add_argument('--fecha'); ap.add_argument('--dir', default='.')
    a = ap.parse_args()
    if a.paso == 'rango':
        d, h = rango(a.tipo, a.fecha)
        print('DESDE', d.astimezone(U).strftime('%Y-%m-%d %H:%M+00')); print('HASTA', h.astimezone(U).strftime('%Y-%m-%d %H:%M+00'))
        for k, e, x, y in periodos(a.tipo, a.fecha): print(k, e, x.isoformat(), y.isoformat())
    elif a.paso == 'calc': os.makedirs(a.dir, exist_ok=True); calc(a)
    else: render(a)
