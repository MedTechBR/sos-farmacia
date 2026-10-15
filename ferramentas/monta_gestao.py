#!/usr/bin/env python3
"""Gera gestao/index.html (a área "Gestão da farmácia" do SOS) a partir do FarmáciaGest.

Uso único (15/10/2026): depois de gerado, gestao/index.html passa a ser a FONTE e é editado direto.
O script fica para registro do que foi trocado em relação ao FarmáciaGest original
(~/Documents/Claude/farmacia/index.html):
  - casca nova no padrão do SOS (barra lateral com grupos, topo e barra de 4 no celular, título de página);
  - tokens do SOS por cima dos do app (ferramentas/gestao_casca.css);
  - tema na mesma chave do SOS (sos-farmacia:tema, data-tema);
  - sai o login antigo (_mtfb/_mtauth, documento único last-write-wins) e entra o portão do SOS
    (mtsync.js + _mtacesso + gestao/conta-gestao.js), com um documento por item na nuvem.
"""
import re, sys, pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ORIG = pathlib.Path.home() / "Documents/Claude/farmacia/index.html"
SAIDA = RAIZ / "gestao" / "index.html"
h = ORIG.read_text(encoding="utf-8")

def troca(a, b, n=1):
    global h
    if a not in h:
        sys.exit("NÃO ACHEI: " + a[:100])
    h = h.replace(a, b, n)

def corta(ini, fim, novo="", incl_fim=False):
    """troca o trecho de `ini` até antes de `fim` (ou incluindo `fim`)"""
    global h
    i = h.index(ini); j = h.index(fim, i)
    if incl_fim: j += len(fim)
    h = h[:i] + novo + h[j:]

# ---------------- <head> ----------------
troca('<title>FarmáciaGest — Gestão de escala da farmácia</title>',
      '<title>Gestão da farmácia · SOS Farmácia Comercial</title>')
h = re.sub(r'<meta name="theme-color"[^>]*>\n', '', h)
h = re.sub(r'<link rel="preconnect"[^>]*>\n', '', h)
h = re.sub(r'<link href="https://fonts.googleapis.com[^>]*>\n', '', h)
troca('<script src="/_mtfb.js?v=1"></script>\n', '')
troca('<script>window.MT_APP={id:"farmaciagest",name:"FarmáciaGest",linha:"farmacia"};</script>\n', '')
troca('<script type="module" src="/_mtauth.js?v=20"></script>\n', '''<meta name="theme-color" content="#F5F6FB" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0D1017" media="(prefers-color-scheme: dark)">
<script>
/* tema escolhido no SOS vale aqui também (mesma chave), antes do primeiro desenho */
(function(){ try{ var t=JSON.parse(localStorage.getItem('sos-farmacia:tema')); if(t) document.documentElement.dataset.tema=t; }catch(e){} })();
/* Conta MedTech e compra, igual ao SOS: só no site (no file:// e na prévia do localhost o app abre sem conta;
   teste do portão com ?portao=1). A Gestão faz parte do produto sosfarmacia. */
(function () {
  var l = location, local = /^(localhost|127\\.0\\.0\\.1|\\[::1\\])$/.test(l.hostname);
  if (!/^https?:$/.test(l.protocol) || (local && !/[?&]portao=1\\b/.test(l.search))) return;
  window.__sosPortao = true;
  ['../mtsync.js?v=1', '/_mtacesso.js?v=13', 'conta-gestao.js?v=2', '/_mtvoltar.js?v=3'].forEach(function (s) {
    document.write('<script data-sos-portao src="' + s + '"><\\/script>');
  });
})();
</script>
''')

# ---------------- CSS ----------------
# dark do app antigo vinha por data-theme; agora é o data-tema do SOS
h = h.replace('data-theme="dark"', 'data-tema="escuro"').replace('data-theme="light"', 'data-tema="claro"')
# tira os blocos de token do app antigo (a camada SOS define tudo) e o chip da nuvem antiga
corta(':root{\n  color-scheme:light;\n  /* marca */', '*{box-sizing:border-box}')
corta('/* O módulo MedTech cobre a tela com o login', '/* selo de pendência na aba */')
casca_css = (RAIZ / "ferramentas" / "gestao_casca.css").read_text(encoding="utf-8")
troca('.print-only{display:none}\n</style>', '.print-only{display:none}\n' + casca_css + '</style>')

# ---------------- corpo: casca no padrão do SOS ----------------
ABAS = [  # id, ícone, rótulo, cor, subtítulo
    ("dia", "calendar-week", "Escala do dia", "var(--c-indigo)", "Quem trabalha em cada turno, cobertura mínima e a semana"),
    ("mensal", "calendar-month", "Escala mensal", "var(--c-violeta)", "A planilha do mês importada e a contagem de turnos"),
    ("func", "users", "Funcionários", "var(--c-azul)", "Equipe, função e turno habitual de cada pessoa"),
    ("trocas", "arrows-exchange", "Trocas", "var(--c-ambar)", "Trocas de horário no mesmo dia ou de dias"),
    ("banco", "clock-hour-4", "Banco de horas", "var(--c-teal)", "Horas extras, descontos e saldo por pessoa"),
    ("receb", "package-import", "Recebimento", "var(--c-verde)", "Entrada de mercadoria: nota, pedido ou foto e conferência"),
    ("diverg", "file-alert", "Divergências", "var(--c-laranja)", "Pendências de nota fiscal e devoluções"),
    ("validade", "calendar-exclamation", "Validade", "var(--c-rosa)", "Produtos perto do vencimento"),
    ("config", "settings", "Configurações", "var(--c-cinza)", "Turnos, categorias, feriados, backup e banco de teste"),
]
GRUPOS = [("Equipe", ["dia", "mensal", "func", "trocas", "banco"]), ("Estoque", ["receb", "diverg", "validade"]), ("Ajustes", ["config"])]
por_id = {a[0]: a for a in ABAS}
def botao(a, primeiro):
    i, ic, rot, cor, _ = a
    sel = 'true' if primeiro else 'false'
    tab = '' if primeiro else ' tabindex="-1"'
    return (f'  <button class="aba" data-tab="{i}" role="tab" aria-selected="{sel}" aria-controls="tab-{i}" id="tb-{i}"{tab} '
            f'style="--c:{cor}"><i class="ti ti-{ic}" aria-hidden="true"></i><span>{rot}</span></button>\n')
nav = ''
for g, ids in GRUPOS:
    nav += f'  <div class="navGrupo" role="presentation">{g}</div>\n' + ''.join(botao(por_id[i], i == "dia") for i in ids)

casca = f'''<aside id="lateral" aria-label="Navegação">
  <a class="marca" href="../" title="Voltar ao SOS Farmácia Comercial"><span class="logo"><i class="ti ti-first-aid-kit" aria-hidden="true"></i></span><span class="nm">Gestão da farmácia<small>SOS Farmácia Comercial</small></span></a>
<nav id="tabs" role="tablist" aria-orientation="vertical" aria-label="Seções da gestão">
{nav}</nav>
  <div class="pe">
    <a class="btIco volta" href="../"><i class="ti ti-arrow-left" aria-hidden="true"></i><span>Voltar ao SOS</span></a>
    <button class="btIco" type="button" data-tema-bt><i class="ti ti-moon" aria-hidden="true"></i><span>Tema</span></button>
    <button class="btIco" type="button" data-ir="config"><i class="ti ti-database" aria-hidden="true"></i><span>Backup</span></button>
  </div>
</aside>
<header id="topoMovel">
  <a class="marca" href="../" aria-label="Voltar ao SOS Farmácia Comercial"><span class="logo"><i class="ti ti-first-aid-kit" aria-hidden="true"></i></span><b>Gestão da farmácia</b></a>
  <button class="btIco" type="button" data-tema-bt aria-label="Claro ou escuro"><i class="ti ti-moon" aria-hidden="true"></i></button>
</header>
<nav id="barra" aria-label="Atalhos">
  <button type="button" data-b="dia" style="--c:var(--c-indigo)"><i class="ti ti-calendar-week" aria-hidden="true"></i>Escala</button>
  <button type="button" data-b="receb" style="--c:var(--c-verde)"><i class="ti ti-package-import" aria-hidden="true"></i>Recebimento</button>
  <button type="button" data-b="validade" id="bb-validade" style="--c:var(--c-rosa)"><i class="ti ti-calendar-exclamation" aria-hidden="true"></i>Validade</button>
  <button type="button" data-b="mais" style="--c:var(--c-cinza)"><i class="ti ti-dots" aria-hidden="true"></i>Mais</button>
</nav>
<main class="wrap">
  <header id="pgTitulo"><span class="selo"><i class="ti ti-calendar-week" aria-hidden="true"></i></span><h1>Escala do dia</h1><p></p></header>
'''
corta('<header class="top">', '  <section id="tab-func"', casca)
troca('<section id="tab-func" role="tabpanel" aria-labelledby="tb-func" tabindex="-1"></section>',
      '<section id="tab-func" role="tabpanel" aria-labelledby="tb-func" tabindex="-1" style="display:none"></section>')
troca('<section id="tab-dia" role="tabpanel" aria-labelledby="tb-dia" tabindex="-1" style="display:none"></section>',
      '<section id="tab-dia" role="tabpanel" aria-labelledby="tb-dia" tabindex="-1"></section>')
troca('  <div class="footer">FarmáciaGest <span class="muted num" id="verTag"></span> • os dados ficam salvos apenas neste navegador (localStorage). Use “Backup” nas Configurações para exportar.</div>\n</div>',
      '  <div class="footer">Gestão da farmácia <span class="num" id="verTag"></span> · <span id="ondeDados">os dados ficam neste aparelho</span>. Faça um backup em Configurações de vez em quando.</div>\n</main>')

# ---------------- JS ----------------
# aba inicial = escala do dia; cor, título de página e barra do celular acompanham a aba
troca("const TABS=['func','dia','trocas','banco','mensal','receb','diverg','validade','config'];",
      "const TABS=['dia','mensal','func','trocas','banco','receb','diverg','validade','config'];\n"
      "const ABA_INFO=" + repr({a[0]: [a[1], a[2], a[4]] for a in ABAS}).replace("'", '"') + ";\n"
      "function aoTrocarAba(name){\n"
      "  document.body.dataset.aba=name;\n"
      "  const inf=ABA_INFO[name]||['circle','',''];\n"
      "  const pg=$('#pgTitulo'); if(pg){ pg.innerHTML='<span class=\"selo\"><i class=\"ti ti-'+inf[0]+'\" aria-hidden=\"true\"></i></span><h1>'+esc(inf[1])+'</h1><p>'+esc(inf[2])+'</p>'; }\n"
      "  $$('#barra button').forEach(b=>{ const on=b.dataset.b===name||(b.dataset.b==='mais'&&!['dia','receb','validade'].includes(name)); if(on)b.setAttribute('aria-current','true'); else b.removeAttribute('aria-current'); });\n"
      "  document.title=(inf[1]?inf[1]+' · ':'')+'Gestão da farmácia';\n"
      "  try{ localStorage.setItem('sos-gestao:aba',name); if(location.hash.slice(1)!==name)history.replaceState(null,'','#'+name); }catch(e){}\n"
      "}")
troca("function selectTab(name,focus){\n  activeTab=name;", "function selectTab(name,focus){\n  activeTab=name;\n  aoTrocarAba(name);")
troca("if(on){ x.scrollIntoView({block:'nearest',inline:'nearest'}); if(focus)x.focus(); }", "if(on&&focus)x.focus();")
troca("  if(k==='ArrowRight')n=(i+1)%TABS.length;\n  else if(k==='ArrowLeft')n=(i-1+TABS.length)%TABS.length;",
      "  if(k==='ArrowRight'||k==='ArrowDown')n=(i+1)%TABS.length;\n  else if(k==='ArrowLeft'||k==='ArrowUp')n=(i-1+TABS.length)%TABS.length;")
troca("let activeTab='func';", "let activeTab='dia';")

# tema: mesma chave e atributo do SOS
corta("/* ================= tema ================= */", "let trocaCruzada=false;", '''/* ================= tema (mesma chave do SOS) ================= */
const TEMA_K='sos-farmacia:tema';
function temaSalvo(){ try{ return JSON.parse(localStorage.getItem(TEMA_K))||''; }catch(e){ return ''; } }
function escuroAgora(){ const t=temaSalvo(); return t==='escuro'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches); }
function applyTheme(){
  const t=temaSalvo();
  if(t)document.documentElement.dataset.tema=t; else delete document.documentElement.dataset.tema;
  const e=escuroAgora();
  $$('[data-tema-bt] .ti').forEach(i=>i.className='ti '+(e?'ti-sun':'ti-moon'));
}
function trocaTema(){ try{ localStorage.setItem(TEMA_K,JSON.stringify(escuroAgora()?'claro':'escuro')); }catch(e){} applyTheme(); }
applyTheme();
document.addEventListener('click',e=>{
  if(e.target.closest('[data-tema-bt]'))trocaTema();
  const ir=e.target.closest('[data-ir]'); if(ir)selectTab(ir.dataset.ir);
  const bb=e.target.closest('#barra [data-b]'); if(bb){ if(bb.dataset.b==='mais')gavetaMais(); else selectTab(bb.dataset.b); }
});
/* gaveta "Mais" do celular: todas as seções, voltar ao SOS e tema */
function gavetaMais(){
  const veu=document.createElement('div'); veu.className='veuG';
  const g=document.createElement('div'); g.className='gavetaG'; g.setAttribute('role','dialog'); g.setAttribute('aria-label','Mais seções');
  const fecha=()=>{ veu.remove(); g.remove(); };
  let html='<div class="puxa"></div>';
  [['Equipe',['dia','mensal','func','trocas','banco']],['Estoque',['receb','diverg','validade']],['Ajustes',['config']]].forEach(([nome,ids])=>{
    html+='<div class="navGrupo">'+nome+'</div>'+ids.map(id=>{ const b=$('#tb-'+id); const c=b?b.style.getPropertyValue('--c'):'';
      return '<button class="aba" type="button" data-g="'+id+'" style="--c:'+c+'"'+(activeTab===id?' aria-current="true"':'')+'><i class="ti ti-'+ABA_INFO[id][0]+'" aria-hidden="true"></i>'+esc(ABA_INFO[id][1])+'</button>'; }).join('');
  });
  html+='<div class="navGrupo">SOS</div><a class="aba" href="../" style="--c:var(--marca)"><i class="ti ti-arrow-left" aria-hidden="true"></i>Voltar ao SOS Farmácia</a>'
    +'<button class="aba" type="button" data-tema-bt style="--c:var(--c-cinza)"><i class="ti ti-moon" aria-hidden="true"></i>Claro ou escuro</button>';
  g.innerHTML=html;
  veu.onclick=fecha;
  g.addEventListener('click',e=>{ const b=e.target.closest('[data-g]'); if(b){ fecha(); selectTab(b.dataset.g); } else if(e.target.closest('a,[data-tema-bt]'))setTimeout(fecha,80); });
  document.addEventListener('keydown',function esc1(e){ if(e.key==='Escape'){ fecha(); document.removeEventListener('keydown',esc1); } });
  document.body.append(veu,g);
  applyTheme();
  const p=g.querySelector('[aria-current="true"]')||g.querySelector('.aba'); if(p)p.focus();
}
''')

# selo de pendência também no botão "Validade" da barra do celular
corta("function selosDasAbas(){", "/* ---------- aviso do navegador", '''function selosDasAbas(){
  const n=contarAlertasVal();
  ['#tb-validade','#bb-validade'].forEach(sel=>{
    const b=$(sel); if(!b)return;
    let selo=b.querySelector('.tab-badge');
    if(n>0){
      if(!selo){ selo=document.createElement('span'); selo.className='tab-badge'; b.appendChild(selo); }
      selo.textContent=n>99?'99+':n;
      selo.setAttribute('aria-label',n+' produto(s) precisando de atenção');
    }else if(selo)selo.remove();
  });
}

''')

# nuvem antiga (documento único) sai; a sincronização agora é do mtsync, por item
corta("/* ============================================================\n   NUVEM — conta MedTech", "/* ============================================================\n   ABA: CONFIGURAÇÕES", '''/* ============================================================
   NUVEM — conta MedTech pelo motor dos apps de estudo (mtsync.js)
   Cada funcionário, troca, lançamento, item etc. é um documento próprio em
   users/{uid}/apps/sosgestao/sync — último que editou vence POR ITEM e exclusão vira lápide.
   Quem liga é conta-gestao.js (só no site). Aqui ficam só os ganchos que ele usa.
   ============================================================ */
const FG_COLS={
  funcs:['fg_funcs',()=>FUNCS,v=>FUNCS=v], trocas:['fg_trocas',()=>TROCAS,v=>TROCAS=v], banco:['fg_banco',()=>BANCO,v=>BANCO=v],
  feriados:['fg_feriados',()=>FERIAS,v=>FERIAS=v], turnos:['fg_turnos',()=>TURNOS,v=>TURNOS=v], cats:['fg_cats',()=>CATS,v=>CATS=v],
  minimos:['fg_minimos',()=>MINIMOS,v=>MINIMOS=v], receb:['fg_receb',()=>RECEB,v=>RECEB=v], recdoc:['fg_recdoc',()=>RECDOC,v=>RECDOC=v],
  diverg:['fg_diverg',()=>DIVERG,v=>DIVERG=v], mensal:['fg_mensal',()=>MENSAL,v=>MENSAL=v], validade:['fg_validade',()=>VALIDADE,v=>VALIDADE=v],
  valcfg:['fg_valcfg',()=>VALCFG,v=>VALCFG=v]
};
let _recebendo=false;
window.FG={
  cols:FG_COLS,
  ler(c){ const x=FG_COLS[c]; return x?x[1]():undefined; },
  gravar(c,v){ const x=FG_COLS[c]; if(!x)return; _recebendo=true; try{ x[2](v); saveLS(x[0],v); } finally{ _recebendo=false; } },
  aoReceber(){ try{ ensureMinimos(); saveLS('fg_minimos',MINIMOS); gravarBackup(); render(); selosDasAbas(); }catch(e){ console.error(e); } },
  /* importação única do FarmáciaGest antigo (documento users/{uid}/apps/farmaciagest):
     junta POR ID com o que já está aqui; o que já existe no aparelho vence */
  juntarAntigo(p){
    if(!p||typeof p!=='object')return 0;
    let novos=0;
    const lista=(c,campo)=>{ const atual=FG_COLS[c][1]()||[]; const tem=new Set(atual.map(x=>x&&String(x[campo])));
      (Array.isArray(p[c==='feriados'?'ferias':c])?p[c==='feriados'?'ferias':c]:[]).forEach(x=>{ if(x&&x[campo]!=null&&!tem.has(String(x[campo]))){ const y=Object.assign({},x); delete y._upd; atual.push(y); tem.add(String(x[campo])); novos++; } });
      FG_COLS[c][2](atual); };
    ['funcs','trocas','banco','receb','recdoc','diverg','mensal','validade','turnos','cats'].forEach(c=>lista(c,'id'));
    lista('feriados','data');
    if(p.minimos&&typeof p.minimos==='object')Object.keys(p.minimos).forEach(t=>{ MINIMOS[t]=Object.assign({},p.minimos[t],MINIMOS[t]||{}); });
    if(p.valcfg&&typeof p.valcfg==='object')VALCFG=Object.assign({},p.valcfg,VALCFG);
    ensureMinimos(); saveAllInterno(); gravarBackup();
    return novos;
  },
  naConta(email){ const o=$('#ondeDados'); if(o)o.textContent='os dados ficam neste aparelho e na conta '+(email||'MedTech')+', com sincronização automática'; }
};
''')
troca("  if(typeof carimbarMudancas==='function'&&!_aplicandoRemoto){ carimbarMudancas(); enviarParaNuvem(); }",
      "  if(!_recebendo&&window.MTS&&MTS.mudou)Object.keys(FG_COLS).forEach(c=>MTS.mudou(c));")
troca("iniciarNuvem();\n", "")
# começa na última aba usada (ou na escala do dia)
troca("setTimeout(()=>avisarVencimentos(false),1200);\nrender();",
      "setTimeout(()=>avisarVencimentos(false),1200);\n"
      "{ let a='dia'; const hs=location.hash.slice(1); try{ const s=localStorage.getItem('sos-gestao:aba'); if(TABS.includes(s))a=s; }catch(e){} if(TABS.includes(hs))a=hs; selectTab(a); }\n"
      "addEventListener('hashchange',()=>{ const hs=location.hash.slice(1); if(TABS.includes(hs)&&hs!==activeTab)selectTab(hs); });")

# sobras do app antigo que não podem ficar
h = h.replace("pelo botão (data-theme no <html> vence a mídia)", "pelo botão (data-tema no <html> vence a mídia)")
for proibido in ["_mtauth", "_mtfb", "nuvemChip", "iniciarNuvem", "themeBtn", "data-theme"]:
    if proibido in h:
        sys.exit("SOBROU: " + proibido)
if "</script" in h.split("<script>", 3)[-1].rsplit("</script>", 1)[0]:
    sys.exit("</script literal dentro do script principal")

SAIDA.parent.mkdir(exist_ok=True)
SAIDA.write_text(h, encoding="utf-8")
print("ok:", SAIDA, len(h), "bytes")
