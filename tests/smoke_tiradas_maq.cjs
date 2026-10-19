// smoke 19c — tiradas y pistas POR MÁQUINA en el control de cierre (OC-1052981: C1 a 2 pistas, C2 a 4)
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_tiradas_maq.cjs fabrica_bolsas_v6.html
const fs=require('fs');
const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const grab=(a,b)=>{const i=src.indexOf(a),k=src.indexOf(b,i+1);if(i<0||k<0)throw new Error('no está '+a);return src.slice(i,k);};
globalThis.C={maq_corte:[{id:1,nombre:'CORTE-01'},{id:2,nombre:'CORTE-02'}]};
globalThis.PLC={cfg:null};globalThis.escapeHtml=s=>String(s);
eval(grab('function _cvvMaqNom','\n')+'\n'+grab('function _cvvModa','\n'));
eval(grab('const CVV_M_REAL=','// 15o — PARADAS DE LA OC'));
eval(grab('function _cvvEspTiradas','// Control por OC'));
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.error('✗ '+m);}};
const F=JSON.parse(fs.readFileSync(__dirname+'/fixtures/oc_1052981.json','utf8'));
const mpb=0.68;
const o={cargas:F.cargas,tds:F.tds};
o.metros=o.cargas.reduce((s,c)=>s+_cvvMetros(c),0);o.teo=o.metros/mpb;
o.golpes=o.tds.filter(t=>!t.sin_hora).reduce((s,t)=>s+t.golpes,0);
o.tiradas=_cvvTiradas(o,mpb);
_cvvPistasFis(o,mpb);_cvvGolpesEsp(o,mpb);
const T=o.tiradas.map(g=>({b:g.bobs.join('+'),maq:g.maq,p:g.pistas,esp:Math.round(g.gEsp),hizo:g.golpes}));
console.table(T);
console.log('pistas',o.pistas,o.pistasTxt,'esp',Math.round(o.gEsp),'hizo',o.golpes,'dif',(o.difGolpes*100).toFixed(1)+' %','cortadas',Math.round(o.cortadas));
const by=b=>T.find(x=>x.b.startsWith(b));
t(by('BOB-07035').maq===1&&by('BOB-07035').p===2,'07035+07034 en C1 a 2 pistas');
t(by('BOB-07032').maq===1&&by('BOB-07032').p===2,'07032+07031 en C1 a 2 pistas');
t(by('BOB-07041').maq===2&&by('BOB-07041').p===4,'07041… en C2 a 4 pistas');
t(by('BOB-07036').p===4,'07036… en C2 a 4 pistas');
t(Math.abs(by('BOB-07041').hizo-1626)<=5,'07041… hizo ~1.626 golpes (antes 313): '+by('BOB-07041').hizo);
t(Math.abs(by('BOB-07032').hizo-2232)<=10,'07032+07031 hizo ~2.232 (antes 3.790): '+by('BOB-07032').hizo);
t(Math.abs(by('BOB-07036').hizo-2185)<=5,'07036… hizo 2.185: '+by('BOB-07036').hizo);
t(Math.abs(by('BOB-07041').esp-1708)<=3,'07041… tenía que hacer 1.708: '+by('BOB-07041').esp);
t(Math.abs(by('BOB-07036').esp-2276)<=3,'07036… tenía que hacer 2.276: '+by('BOB-07036').esp);
t(o.pistasTxt&&/2 en CORTE-01/.test(o.pistasTxt)&&/4 en CORTE-02/.test(o.pistasTxt),'texto de pistas por máquina: '+o.pistasTxt);
t(Math.abs(o.difGolpes)<0.05,'total cortadora dentro del 5 %');
t(o.cortadas>23000&&o.cortadas<24300,'cortadas ≈ 23.700: '+Math.round(o.cortadas));
// una sola máquina: igual que antes (no usa la regla por máquina)
const o1={cargas:F.cargas.filter(c=>c.maquina_id===1),tds:F.tds.filter(x=>x.maquina===1)};
o1.metros=o1.cargas.reduce((s,c)=>s+_cvvMetros(c),0);o1.teo=o1.metros/mpb;o1.golpes=o1.tds.reduce((s,x)=>s+x.golpes,0);
o1.tiradas=_cvvTiradas(o1,mpb);_cvvPistasFis(o1,mpb);_cvvGolpesEsp(o1,mpb);
t(o1.pistas===2&&!o1.pistasMaq,'sólo C1: 2 pistas, sin desglose');
// golpes en una máquina sin bobinas escaneadas allí
const o2={cargas:F.cargas.filter(c=>c.maquina_id===1),tds:F.tds};
o2.tiradas=_cvvTiradas(o2,mpb);
t(o2.sinTirada.length===1&&o2.sinTirada[0].maq===2&&o2.sinTirada[0].golpes>3000,'golpes de C2 sin bobina escaneada en C2 quedan aparte');
console.log(ok+' ok, '+bad+' mal');process.exit(bad?1:0);
