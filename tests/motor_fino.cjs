// 21b: motor fino de corte — cortadoras entrelazadas con los cortadores disponibles
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');let n=0;const A=(c,t)=>{if(!c){console.error('✗ '+t);process.exit(1);}n++;};const nr=(a,b,e)=>Math.abs(a-b)<(e||1e-6);
const mf=eval('('+src.match(/function _corteMotorFino\(ocs,grid,libre,opt\)\{[\s\S]*?\n  return S;\n\}/)[0]+')');const cmp=eval('('+src.match(/function _corteFinoComparar\(A,B,ahora\)\{[\s\S]*?\n\}/)[0]+')');
const H=3600000,P=H/2;const G=(n)=>({t0:0,paso:P,n});const rep=(v,k)=>Array(k).fill(v);
// 1) dos máquinas con cola, UN cortador: la de más prioridad corta, la otra espera
let S=mf([{id:1,rest:1000,maqs:[{id:'A',bph:1000}],rel:0},{id:2,rest:1000,maqs:[{id:'B',bph:1000}],rel:0}],G(rep(1,8)));
A(nr(S[1].fin,1*H)&&nr(S[2].ini,1*H)&&nr(S[2].fin,2*H)&&nr(S[2].esp,1),'un cortador para dos cortadoras: corta primero la orden de más prioridad; la otra espera 1 h');
// 2) con dos cortadores, las dos a la vez
S=mf([{id:1,rest:1000,maqs:[{id:'A',bph:1000}],rel:0},{id:2,rest:1000,maqs:[{id:'B',bph:1000}],rel:0}],G(rep(2,8)));
A(nr(S[1].fin,H)&&nr(S[2].fin,H)&&S[2].esp===0,'dos cortadores: las dos cortadoras a la vez');
// 3) sin cortadores no se corta (turno sin gente) y se retoma
S=mf([{id:1,rest:2000,maqs:[{id:'A',bph:1000}],rel:0}],G([1,1,0,0,0,0,1,1]));
A(nr(S[1].fin,4*H)&&nr(S[1].hs,2),'sin cortador la máquina no avanza: 2 h de corte que terminan a las 4 h de reloj');
// 4) misma máquina: en orden de prioridad
S=mf([{id:1,rest:500,maqs:[{id:'A',bph:1000}],rel:0},{id:2,rest:500,maqs:[{id:'A',bph:1000}],rel:0}],G(rep(3,8)));
A(nr(S[1].fin,H/2)&&nr(S[2].ini,H/2)&&nr(S[2].fin,H)&&S[2].esp===0,'una cortadora: una orden atrás de la otra; esperar máquina no es esperar cortador');
// 5) no interrumpe la que ya empezó aunque llegue una de más prioridad
S=mf([{id:1,rest:1000,maqs:[{id:'A',bph:1000}],rel:1*H},{id:2,rest:2000,maqs:[{id:'A',bph:1000}],rel:0}],G(rep(1,12)));
A(nr(S[2].ini,0)&&nr(S[2].fin,2*H)&&nr(S[1].ini,2*H)&&nr(S[1].fin,3*H),'la orden empezada no se interrumpe por otra de más prioridad que llega después');
// 6) orden en dos cortadoras con un solo cortador: avanza con una
S=mf([{id:1,rest:2000,maqs:[{id:'A',bph:1000},{id:'B',bph:1000}],rel:0}],G(rep(1,8)));A(nr(S[1].fin,2*H),'dos cortadoras asignadas y un cortador: corta con una sola');
S=mf([{id:1,rest:2000,maqs:[{id:'A',bph:1000},{id:'B',bph:1000}],rel:0}],G(rep(2,8)));A(nr(S[1].fin,1*H),'con dos cortadores usa las dos');
// 7) bobina (rel) y máquina ocupada por una orden cerrada
S=mf([{id:1,rest:1000,maqs:[{id:'A',bph:1000}],rel:2*H}],G(rep(1,12)));A(nr(S[1].ini,2*H)&&nr(S[1].fin,3*H),'no arranca antes de tener la bobina');
S=mf([{id:1,rest:1000,maqs:[{id:'A',bph:1000}],rel:0}],G(rep(1,12)),{A:1.5*H});A(nr(S[1].ini,1.5*H)&&nr(S[1].fin,2.5*H),'respeta la máquina ocupada por una orden ya cerrada');
// 8) el cortador libre va a la otra máquina aunque su orden tenga menos prioridad (no queda ocioso)
S=mf([{id:1,rest:1000,maqs:[{id:'A',bph:1000}],rel:5*H},{id:2,rest:1000,maqs:[{id:'B',bph:1000}],rel:0}],G(rep(1,16)));A(nr(S[2].fin,H)&&nr(S[1].ini,5*H),'mientras una orden espera su bobina, el cortador corta la otra');
// 9) sin horizonte suficiente queda sin fin (el que llama deja el motor de siempre) ; orden sin nada por cortar
S=mf([{id:1,rest:99999,maqs:[{id:'A',bph:1000}],rel:0},{id:2,rest:0,maqs:[{id:'A',bph:1000}],rel:0}],G(rep(1,4)));A(S[1].fin===null&&S[2].fin===0,'lo que no entra en el horizonte queda sin fecha; lo ya cortado termina ya');
// 10) total de horas de corte = bolsas / ritmo (no inventa ni pierde producción)
S=mf([{id:1,rest:3300,maqs:[{id:'A',bph:1100}],rel:0},{id:2,rest:700,maqs:[{id:'B',bph:700}],rel:0}],G([1,2,2,0,1,1,2,2,2,2]));A(nr(S[1].hs,3)&&nr(S[2].hs,1),'las horas de corte son bolsas ÷ ritmo de la máquina');
const K=cmp({1:{ini:0,fin:new Date(2*H),hs:2},2:{ini:0,fin:new Date(2*H),hs:2}},{1:{ini:0,fin:new Date(2*H),hs:2,espCortador:0},2:{ini:new Date(2*H),fin:new Date(6*H),hs:2,espCortador:2}});
A(K.tarde===1&&K.igual===1&&nr(K.maxD,4)&&nr(K.hEsp,2)&&K.filas[0].id==='2','comparación entre motores: cuántas terminan más tarde y cuánto esperaron cortador');
A(/function calcScheduleCorteReal\(modo\)/.test(src)&&/\(modo\|\|_prgMotorCorte\(\)\)==='fino'&&_dotPlanOn\(\)/.test(src)&&/\|\|'factor'\)==='fino'\?'fino':'factor'/.test(src),'interruptor: por defecto el motor de siempre');
A(/const hsRestantes=unidadesRestantes\/capT\/_dotF;/.test(src)&&/const iniLibre=_slotComunCorte\(maqIds,E0,hsRestantes,busy\);/.test(src),'el motor de siempre quedó igual');
// 21c: personas, habilitaciones, cambios de medida y plan por cortador
const gd=eval('('+src.match(/function _corteGridDe\(inter,t0,paso,N\)\{.*\}/)[0]+')');const plan=eval('('+src.match(/function _corteFinoPlan\(sched,desde,hasta\)\{[\s\S]*?return out;\}/)[0]+')');
let g=gd([[0,2*H,'ana',false],[H,3*H,'beto',false],[0,3*H,'imp',true],[0.25*H,H,'tarde',false]],0,P,6);
A(g.n.join()==='1,2,2,2,1,1'&&g.p[1].includes('tarde')&&!g.p[0].includes('tarde')&&!g.p.some(x=>x.includes('imp')),'grilla: cuenta al que está TODO el tramo y no al que está en la impresora');
const GP=(p)=>({t0:0,paso:P,p});
// habilitación: sólo ana sabe la cortadora A; beto sólo B
S=mf([{id:1,rest:1000,maqs:[{id:'A',bph:1000}],rel:0},{id:2,rest:1000,maqs:[{id:'B',bph:1000}],rel:0}],GP([['beto'],['beto'],['ana','beto'],['ana','beto']]),null,{hab:{ana:['A'],beto:['B']}});
A(nr(S[2].fin,H)&&S[2].seg[0].emp==='beto'&&nr(S[1].ini,H)&&S[1].seg[0].emp==='ana'&&nr(S[1].espHab,1)&&nr(S[1].esp,0),'cada uno en la cortadora que sabe: la orden de la A espera a Ana aunque tenga más prioridad (y se anota como falta de habilitado)');
S=mf([{id:1,rest:500,maqs:[{id:'A',bph:1000}],rel:0}],GP([['beto'],['beto'],['ana']]),null,{hab:{ana:['A'],beto:['B']}});A(nr(S[1].espHab,1)&&nr(S[1].ini,H),'si hay gente pero nadie habilitado, se informa aparte');
// el polivalente queda para donde hace falta: ana sólo sabe A; beto sabe A y B
S=mf([{id:1,rest:1000,maqs:[{id:'A',bph:1000}],rel:0},{id:2,rest:1000,maqs:[{id:'B',bph:1000}],rel:0}],GP([['beto','ana'],['beto','ana']]),null,{hab:{ana:['A'],beto:['A','B']}});
A(S[1].seg[0].emp==='ana'&&S[2].seg[0].emp==='beto'&&nr(S[2].fin,H),'asigna primero al que menos máquinas sabe, así el polivalente cubre la otra');
// no rota gente sin motivo
S=mf([{id:1,rest:2000,maqs:[{id:'A',bph:1000}],rel:0}],GP([['ana','beto'],['beto','ana'],['ana','beto'],['beto','ana']]));A(S[1].seg.length===1&&nr(S[1].seg[0].z,2*H),'el que está en una cortadora sigue en ella: un solo tramo');
// cambio de medida: 18 min = 0,3 h
S=mf([{id:1,fam:'x',rest:1000,maqs:[{id:'A',bph:1000}],rel:0},{id:2,fam:'y',rest:1000,maqs:[{id:'A',bph:1000}],rel:0},{id:3,fam:'y',rest:1000,maqs:[{id:'A',bph:1000}],rel:0}],G(rep(1,12)),null,{setupH:0.3});
A(nr(S[1].fin,H)&&nr(S[2].fin,2.3*H,1)&&nr(S[2].setup,0.3)&&nr(S[3].setup,0)&&nr(S[3].fin,3.3*H,1),'cambio de medida: 18 minutos de cortadora; misma medida seguida no pierde nada');
S=mf([{id:1,fam:'y',rest:1000,maqs:[{id:'A',bph:1000}],rel:0}],G(rep(1,6)),null,{setupH:0.3,famIni:{A:'x'}});A(nr(S[1].setup,0.3)&&nr(S[1].fin,1.3*H,1),'también cuenta el cambio contra lo que la máquina tenía puesto');
const PL=plan({7:{seg:[{a:0,z:P,maq:'A',emp:'ana'},{a:P,z:2*P,maq:'A',emp:'ana'},{a:2*P,z:3*P,maq:'B',emp:'beto'}]},8:{seg:[{a:2*P,z:4*P,maq:'A',emp:'ana'}]}},0,10*H);
A(PL.length===3&&PL[0].emp==='ana'&&PL[0].oc==='7'&&nr(PL[0].z,2*P)&&PL[1].oc==='8'&&PL[2].emp==='beto','plan por cortador: une tramos seguidos y ordena por persona y hora');
A(plan({7:{seg:[{a:0,z:P,maq:'A',emp:'ana'}]}},P,2*P).length===0,'sólo el período pedido');
S=mf([{id:1,rest:300,maqs:[{id:'A',bph:1000}],rel:0},{id:2,rest:300,maqs:[{id:'A',bph:1000}],rel:0}],G(rep(1,4)));
A(nr(S[1].fin,0.3*H)&&nr(S[2].ini,0.3*H)&&nr(S[2].fin,0.6*H)&&nr(S[2].hs,0.3)&&S[2].seg[0].emp===S[1].seg[0].emp,'si una orden termina a mitad de la media hora, la siguiente arranca ahí con el mismo cortador: no se pierde el resto del tramo');
S=mf([{id:1,rest:300,maqs:[{id:'A',bph:1000}],rel:0},{id:2,rest:300,maqs:[{id:'B',bph:1000}],rel:0}],G(rep(1,4)));A(nr(S[2].ini,0.5*H),'el cortador no salta de máquina dentro del mismo tramo');
console.log('✓ motor_fino '+n+' ok');
