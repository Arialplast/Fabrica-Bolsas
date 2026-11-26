// 25e: mail automático con PDF adjunto (función enviar-mail + Resend)
const fs=require('fs'),path=require('path');const s=fs.readFileSync(process.argv[2],'utf8');
let ok=true;const t=(n,c)=>{if(!c){ok=false;console.error('✗ '+n);}else console.log('✓ '+n);};
const i=s.indexOf('function _mailPedido(');const j=s.indexOf('function _blobB64(',i);
const f=new Function(s.slice(i,j)+';return _mailPedido;')();
const p=f({titulo:'Recibo',numero:'REC-000136'},' a@b.com ','','hola','JVBERi0x','Recibo_REC-000136.pdf','ARIALPLAST');
t('pedido: acción, destinatario limpio, asunto con empresa, PDF y archivo',p.accion==='enviar'&&p.para==='a@b.com'&&p.asunto==='Recibo N° REC-000136 · ARIALPLAST'&&p.pdf_b64==='JVBERi0x'&&p.archivo==='Recibo_REC-000136.pdf'&&p.copia==='');
t('sin servicio configurado sigue el camino manual (mailto)',/if\(modo==='mail'&&srv&&srv\.ok\)\{/.test(s)&&/location\.href='mailto:'/.test(s));
t('si el envío falla NO abre otra cosa ni dice enviado',/No se pudo enviar el mail: /.test(s)&&/No salió nada/.test(s));
t('WhatsApp sin número ya no frena',!/Cargá el WhatsApp del contacto/.test(s));
t('la pantalla dice cómo sale cada uno',/id="doc-env-srv"/.test(s)&&/Mail automático activo/.test(s)&&/WhatsApp no deja adjuntarlo solo desde la PC/.test(s));
const fn=path.join(path.dirname(process.argv[2]),'supabase/functions/enviar-mail/index.ts');
if(fs.existsSync(fn)){const g=fs.readFileSync(fn,'utf8');
  t('función: el remitente sale del secreto, no del pedido',/from: FROM/.test(g)&&!/b\.from|b\.remitente/.test(g));
  t('función: un destinatario, sólo PDF, sin secretos no manda',/to: \[para\]/.test(g)&&/startsWith\("JVBER"\)/.test(g)&&/sin_configurar: true/.test(g));}
process.exit(ok?0:1);
