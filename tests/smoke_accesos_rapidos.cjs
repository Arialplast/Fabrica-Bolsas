// smoke 29a — accesos rápidos: orden de "más usados" y filtro del buscador Ctrl+K (funciones puras)
// uso: node tests/smoke_accesos_rapidos.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const grab=(ini,fin)=>{const a=src.indexOf(ini),b=src.indexOf(fin,a);if(a<0||b<0){console.log('FALTA '+ini);process.exit(1);}return src.slice(a,b);};
eval(grab('function _qaOrdenUsados(','function _qaRenderUsados('));
eval(grab('function _qkNorm(','let _qkSel='));
let ok=0,bad=0;const t=(x,m)=>{if(x)ok++;else{bad++;console.log('✗ '+m);}};

// ---- más usados ----
const V=new Set(['a','b','c','d','e','f','g']);
const uso={a:{n:3,t:1},b:{n:10,t:1},c:{n:3,t:9},d:{n:1,t:1},e:{n:7,t:1},f:{n:2,t:1},g:{n:5,t:1},zz:{n:99,t:1}};
let o=_qaOrdenUsados(uso,[],V,5);
t(JSON.stringify(o.usadas)==='["b","e","g","c","a"]','top 5 por cantidad, empate por más reciente (c antes que a): '+o.usadas);
t(!o.usadas.includes('zz'),'una pantalla que ya no está en el menú no aparece');
o=_qaOrdenUsados(uso,['d','b'],V,5);
t(JSON.stringify(o.fijadas)==='["d","b"]','fijadas en el orden en que se fijaron');
t(!o.usadas.includes('b')&&!o.usadas.includes('d')&&o.usadas.length===5,'las fijadas no se repiten en usadas y siguen 5 usadas');
o=_qaOrdenUsados({},['zz','a'],V,5);
t(JSON.stringify(o.fijadas)==='["a"]'&&o.usadas.length===0,'sin uso: solo fijadas válidas');
t(_qaOrdenUsados(null,null,V,5).usadas.length===0,'datos vacíos/corruptos no rompen');
t(_qaOrdenUsados({a:{n:0,t:5}},[],V,5).usadas.length===0,'contador 0 no aparece');

// ---- buscador ----
t(_qkNorm('Facturación  Electrónica')==='facturacion electronica','sin tildes y minúsculas');
const C=[
  {label:'＋ Nuevo gasto / compra',claves:'cargar gasto compra factura proveedor',accion:true,grp:'Acción'},
  {label:'🛒 Compras y Gastos',grp:'Finanzas',page:'compras-gastos'},
  {label:'🧾 Gastos fijos',grp:'Finanzas',page:'gastos-fijos'},
  {label:'Remitos',grp:'Ventas',page:'remitos'},
  {label:'＋ Nuevo remito',claves:'remito entrega',accion:true,grp:'Acción'},
  {label:'Facturación',grp:'Ventas',page:'facturacion'},
  {label:'Stock bolsas',grp:'Stock',page:'stock-bolsas'},
  {label:'Stock bobinas',grp:'Stock',page:'stock'},
];
let r=_qkFiltrar(C,'gas',{});
t(r.length===3,'«gas» encuentra 3 (acción + 2 pantallas): '+r.length);
r=_qkFiltrar(C,'stock bol',{});
t(r.length===1&&r[0].page==='stock-bolsas','«stock bol»: solo Stock bolsas');
r=_qkFiltrar(C,'facturacion',{});
t(r[0].page==='facturacion','sin tilde encuentra Facturación');
r=_qkFiltrar(C,'stock',{'stock':{n:20}});
t(r[0].page==='stock','a igual coincidencia, gana la más usada');
r=_qkFiltrar(C,'xyz',{});
t(r.length===0,'nada que coincida → vacío');
r=_qkFiltrar(C,'',{});
t(r.length===C.length,'vacío muestra todo');
r=_qkFiltrar(C,'remito',{});
t(r.length===2,'«remito» encuentra pantalla y acción');
r=_qkFiltrar(C,'ventas',{});
t(r.some(x=>x.page==='remitos'),'busca también por el nombre del área');
console.log((bad?'✗ ':'✓ ')+ok+' ok · '+bad+' fallas');process.exit(bad?1:0);
