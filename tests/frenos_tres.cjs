// 22w: «qué frena» mira los tres frenos (material, extrusión, corte)
const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');let f=0;const ok=(c,m)=>{if(!c){f++;console.log('✗ '+m);}};
const m=s.match(/function _prgFrenos\(P\)\{[\s\S]*?\n\}/);ok(!!m,'_prgFrenos existe');
const _prgFrenos=new Function(m[0]+';return _prgFrenos;')();
const base={ext:{total:2547,comprometido:1695},kgEntra:0};
let X=_prgFrenos({...base,cor:{total:205846,comprometido:318109},frenadoMP:8525,frenadoCap:0});
ok(X.F.map(x=>x.k).join()==='corte,material','corte al 155 % y material frenan los dos: '+X.F.map(x=>x.k));
ok(Math.round(X.corPct)===155&&/112\.263 bolsas/.test(X.F[0].d),'excedente de corte en bolsas');
ok(X.no.length===1&&/extrusión \(sobran 852 kg/.test(X.no[0]),'extrusión no frena y dice cuánto sobra');
X=_prgFrenos({...base,cor:{total:1000,comprometido:500},frenadoMP:0,frenadoCap:0});
ok(X.F.length===0&&X.no.length===3,'nada frena');
X=_prgFrenos({...base,cor:{total:1000,comprometido:500},frenadoMP:0,frenadoCap:300});
ok(X.F.length===1&&X.F[0].k==='extrusion','frena extrusión sola');
ok(!/casi nunca es el problema/.test(s),'se fue la frase del corte');
ok(/const X=_prgFrenos\(P\);/.test(s)&&/_ps2Sec\(1,'Qué frena esta semana'/.test(s),'el Plan de la semana usa los frenos (25g: tarjetas)');
ok(/defW\[i\]=s<-0\.5\?Math\.min\(n,-s\):0;/.test(s)&&/b\.mpFalta=MP\.filter\(m=>m\.defW\[i\]>=25\)/.test(s),'el plan medio marca la semana sin material');
ok(/⚠ falta material/.test(s)&&/Falta materia prima<\/b> para extruir/.test(s),'aviso en gráfico y en la explicación');
console.log(f?('FALLÓ '+f):'OK frenos_tres');process.exit(f?1:0);
