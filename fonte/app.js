(function () {
'use strict';

/* Cópia intacta do arquivo, tirada antes de qualquer desenho: é a base de "Salvar arquivo". */
const ORIGEM = '<!doctype html>\n' + document.documentElement.outerHTML;
const CHAVE = 'sos-farmacia:';
const DADOS = JSON.parse(document.getElementById('sos-dados').textContent);
let editando = false, alterado = false, imprimindo = false, tituloOriginal = document.title;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const semAcento = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const novoId = (pre, tipo) => `${pre}-${tipo}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const mod = id => DADOS.modulos.find(m => m.id === id);
const ic = n => `<i class="ti ti-${n}" aria-hidden="true"></i>`;
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const corVars = m => `--mc:${m.cor};--mc-t:${m.corT};--mc-s:${m.cor}55;--ac:${m.cor};--acT:${m.corT}`;

function lerLS(k, padrao) { try { const v = localStorage.getItem(CHAVE + k); return v ? JSON.parse(v) : padrao; } catch (e) { return padrao; } }
function gravarLS(k, v) { try { localStorage.setItem(CHAVE + k, JSON.stringify(v)); return true; } catch (e) { return false; } }
function apagarLS(k) { try { localStorage.removeItem(CHAVE + k); } catch (e) { /* sem armazenamento */ } }

function toast(msg) {
  $$('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

/* ---------------- limpeza do HTML editado ---------------- */
const BLOCO_OK = new Set(['P', 'H3', 'H4', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I', 'BR', 'SUP', 'SUB', 'DIV', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD']);
const INLINE_OK = new Set(['STRONG', 'B', 'EM', 'I', 'BR', 'SUP', 'SUB']);
const CLASSES_OK = ['tab', 'cx chave', 'cx alerta', 'cx balcao', 'cx lei', 'cx exemplo'];
function trocaTag(n, tag) { const x = document.createElement(tag); while (n.firstChild) x.appendChild(n.firstChild); n.replaceWith(x); return x; }
function limpaHtml(html, inline) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const ok = inline ? INLINE_OK : BLOCO_OK;
  (function anda(no) {
    [...no.childNodes].forEach(n => {
      if (n.nodeType === 3) return;
      if (n.nodeType !== 1) { n.remove(); return; }
      anda(n);
      const tag = n.tagName;
      if (!ok.has(tag)) {
        if (/^(SCRIPT|STYLE|IFRAME|OBJECT|IMG|SVG|META|LINK)$/.test(tag)) { n.remove(); return; }
        if (!inline && /^H[1256]$/.test(tag)) { trocaTag(n, 'h3'); return; }
        n.replaceWith(...n.childNodes); return;
      }
      const cls = (n.getAttribute('class') || '').trim();
      const span = [n.getAttribute('colspan'), n.getAttribute('rowspan')];
      [...n.attributes].forEach(a => n.removeAttribute(a.name));
      if (tag === 'TD' || tag === 'TH') { if (span[0]) n.setAttribute('colspan', span[0]); if (span[1]) n.setAttribute('rowspan', span[1]); }
      if (tag === 'DIV') {
        if (CLASSES_OK.includes(cls)) n.setAttribute('class', cls);
        else if ([...n.children].some(c => /^(P|DIV|UL|OL|TABLE|H3|H4)$/.test(c.tagName))) n.replaceWith(...n.childNodes);
        else trocaTag(n, 'p');
      }
    });
  })(tpl.content);
  return tpl.innerHTML.replace(/<p>(\s|&nbsp;|<br>)*<\/p>/g, '').trim();
}

/* ---------------- mapa mental (SVG) ---------------- */
const CORES_RAMO = ['#2563EB', '#C2255C', '#0B7A54', '#D9480F', '#6D28D9', '#0E7490', '#A16207'];
const medidor = document.createElement('canvas').getContext('2d');
function quebra(texto, fonte, max) {
  medidor.font = fonte;
  const palavras = String(texto).split(/\s+/).filter(Boolean), linhas = [];
  let atual = '';
  palavras.forEach(p => {
    const t = atual ? atual + ' ' + p : p;
    if (medidor.measureText(t).width <= max || !atual) atual = t; else { linhas.push(atual); atual = p; }
  });
  if (atual) linhas.push(atual);
  const larg = Math.max(0, ...linhas.map(l => medidor.measureText(l).width));
  return { linhas, larg };
}
function caixaTexto(t, peso, tam, max, padX, padY, sub) {
  const fonte = `${peso} ${tam}px Inter, sans-serif`;
  const q = quebra(t, fonte, max);
  const lh = Math.round(tam * 1.32);
  let subs = [], larg = q.larg;
  if (sub && sub.length) {
    const fs = '400 12px Inter, sans-serif';
    sub.forEach(s => { const r = quebra('• ' + s, fs, max); subs.push(r.linhas); larg = Math.max(larg, r.larg); });
  }
  const nSub = subs.reduce((a, l) => a + l.length, 0);
  return { linhas: q.linhas, subs, tam, peso, lh, w: Math.ceil(larg) + padX * 2, h: q.linhas.length * lh + (nSub ? nSub * 16 + 6 : 0) + padY * 2, padX, padY };
}
function textoSvg(c, x, y, cor, alinhar) {
  let s = '', yy = y + c.padY + c.tam * 0.92;
  const ax = alinhar === 'meio' ? x + c.w / 2 : x + c.padX;
  const anc = alinhar === 'meio' ? 'middle' : 'start';
  c.linhas.forEach(l => { s += `<text x="${ax}" y="${yy}" font-size="${c.tam}" font-weight="${c.peso}" fill="${cor}" text-anchor="${anc}">${esc(l)}</text>`; yy += c.lh; });
  if (c.subs.length) {
    yy += 2;
    c.subs.forEach(ls => ls.forEach((l, i) => { s += `<text x="${x + c.padX + (i ? 9 : 0)}" y="${yy}" font-size="12" font-weight="400" fill="#3A4254">${esc(l)}</text>`; yy += 16; }));
  }
  return s;
}
function desenhaMapa(mapa, m) {
  const W = 1380, CX = W / 2, GAP_ITEM = 7, GAP_GRUPO = 18;
  const ramos = (mapa.ramos || []).map((r, i) => {
    const cor = CORES_RAMO[i % CORES_RAMO.length];
    const caixa = caixaTexto(r.t, 700, 16, 168, 14, 9);
    const itens = (r.itens || []).map(it => typeof it === 'string' ? caixaTexto(it, 500, 14, 262, 12, 7) : caixaTexto(it.t, 600, 14, 262, 12, 7, it.itens || []));
    const hItens = itens.reduce((a, c) => a + c.h, 0) + Math.max(0, itens.length - 1) * GAP_ITEM;
    return { cor, caixa, itens, hItens, hGrupo: Math.max(caixa.h, hItens) };
  });
  const nDir = Math.ceil(ramos.length / 2);
  const lados = [ramos.slice(0, nDir), ramos.slice(nDir)];
  const hLado = l => l.reduce((a, r) => a + r.hGrupo, 0) + Math.max(0, l.length - 1) * GAP_GRUPO;
  const centro = caixaTexto(mapa.centro || mapa.titulo, 700, 22, 200, 20, 16);
  const H = Math.max(hLado(lados[0]), hLado(lados[1]), centro.h) + 24;
  const cy = H / 2, cx0 = CX - centro.w / 2, cy0 = cy - centro.h / 2;
  let fios = '', nos = '';
  lados.forEach((lado, li) => {
    const dir = li === 0;
    let y = (H - hLado(lado)) / 2;
    lado.forEach(r => {
      const gy = y, rc = r.caixa;
      const rx = dir ? CX + 150 : CX - 150 - rc.w;
      const ry = gy + (r.hGrupo - rc.h) / 2, rmy = ry + rc.h / 2;
      const sx = dir ? CX + centro.w / 2 - 6 : CX - centro.w / 2 + 6, ex = dir ? rx : rx + rc.w;
      fios += `<path d="M${sx} ${cy} C${(sx + ex) / 2} ${cy}, ${(sx + ex) / 2} ${rmy}, ${ex} ${rmy}" stroke="${r.cor}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
      nos += `<rect x="${rx}" y="${ry}" width="${rc.w}" height="${rc.h}" rx="16" fill="${r.cor}"/>` + textoSvg(rc, rx, ry, '#FFFFFF', 'meio');
      let iy = gy + (r.hGrupo - r.hItens) / 2;
      const colItem = dir ? CX + 150 + 196 + 24 : CX - 150 - 196 - 24;
      r.itens.forEach(c => {
        const ix = dir ? colItem : colItem - c.w, imy = iy + c.h / 2;
        const ox = dir ? rx + rc.w : rx, fx = dir ? ix : ix + c.w;
        fios += `<path d="M${ox} ${rmy} C${(ox + fx) / 2} ${rmy}, ${(ox + fx) / 2} ${imy}, ${fx} ${imy}" stroke="${r.cor}" stroke-width="2" fill="none" stroke-opacity=".75"/>`;
        nos += `<rect x="${ix}" y="${iy}" width="${c.w}" height="${c.h}" rx="10" fill="${r.cor}1A" stroke="${r.cor}" stroke-width="1.4"/>` +
          `<circle cx="${fx}" cy="${imy}" r="3.5" fill="${r.cor}"/>` + textoSvg(c, ix, iy, '#161B26');
        iy += c.h + GAP_ITEM;
      });
      y += r.hGrupo + GAP_GRUPO;
    });
  });
  nos += `<rect x="${cx0}" y="${cy0}" width="${centro.w}" height="${centro.h}" rx="24" fill="${m.cor}"/>` +
    `<rect x="${cx0 + 5}" y="${cy0 + 5}" width="${centro.w - 10}" height="${centro.h - 10}" rx="20" fill="none" stroke="#FFFFFF" stroke-opacity=".45" stroke-width="1.5"/>` +
    textoSvg(centro, cx0, cy0, '#FFFFFF', 'meio');
  return `<svg class="mapa-svg" viewBox="0 0 ${W} ${Math.ceil(H)}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(mapa.titulo)}" font-family="Inter, sans-serif">${fios}${nos}</svg>`;
}

/* ---------------- blocos de apoio ---------------- */
const TIPOS = {
  tabela: { nome: 'Tabela', ic: 'table' }, quadro: { nome: 'Quadro', ic: 'box' }, checklist: { nome: 'Checklist', ic: 'list-check' },
  fluxo: { nome: 'Fluxo', ic: 'git-fork' }, cartoes: { nome: 'Cartões de revisão', ic: 'cards' }, questoes: { nome: 'Questões', ic: 'help-circle' },
  receita: { nome: 'Modelo de receita', ic: 'prescription' }, pop: { nome: 'POP', ic: 'file-text' }
};
const LETRAS = 'ABCDE';
const inl = s => limpaHtml(String(s == null ? '' : s), true);

function blocoCorpo(b, imp) {
  switch (b.tipo) {
    case 'tabela':
      return `<div class="tab"><table><thead><tr>${(b.colunas || []).map(c => `<th>${inl(c)}</th>`).join('')}</tr></thead><tbody>` +
        (b.linhas || []).map(l => `<tr>${l.map(c => `<td>${inl(c)}</td>`).join('')}</tr>`).join('') + `</tbody></table></div>` +
        (b.nota ? `<p class="nota">${inl(b.nota)}</p>` : '');
    case 'quadro':
      return `<div class="texto" data-edit="bloco:${b.id}:html">${b.html || ''}</div>`;
    case 'checklist': {
      const marc = lerLS('check', {})[b.id] || [];
      return `<ul class="check">${(b.itens || []).map((t, i) => imp
        ? `<li><label><span class="cx-q"></span><span>${inl(t)}</span></label></li>`
        : `<li><label><input type="checkbox" data-check="${b.id}:${i}" ${marc.includes(i) ? 'checked' : ''}><span>${inl(t)}</span></label></li>`).join('')}</ul>`;
    }
    case 'fluxo':
      return `<div class="fluxo">${(b.passos || []).map((p, i) => (i ? '<div class="seta"></div>' : '') +
        `<div class="passo ${esc(p.tipo || 'acao')}">${inl(p.t)}${p.tipo === 'decisao' && (p.sim || p.nao) ? `<div class="saidas"><div class="sim"><b>Sim</b>${inl(p.sim)}</div><div class="nao"><b>Não</b>${inl(p.nao)}</div></div>` : ''}</div>`).join('')}</div>`;
    case 'cartoes':
      if (imp) return `<table class="t flash-imp"><thead><tr><th style="width:45%">Pergunta</th><th>Resposta</th></tr></thead><tbody>${(b.itens || []).map(c => `<tr><td>${inl(c.f)}</td><td>${inl(c.v)}</td></tr>`).join('')}</tbody></table>`;
      return `<div class="cartoes">${(b.itens || []).map((c, i) => `<button class="flash" type="button" data-flash><div class="in"><div class="f"><small>Cartão ${i + 1}</small>${inl(c.f)}</div><div class="v"><small>Resposta</small>${inl(c.v)}</div></div></button>`).join('')}</div>`;
    case 'questoes':
      return (b.itens || []).map((q, i) => `<div class="questao" data-q="${b.id}:${i}"><p class="enun"><b>${i + 1}.</b> ${inl(q.p)}</p><div class="alts">${(q.alt || []).map((a, j) =>
        imp ? `<div class="alt"><span class="l">${LETRAS[j]}</span><span>${inl(a)}</span></div>` : `<button type="button" class="alt" data-alt="${j}"><span class="l">${LETRAS[j]}</span><span>${inl(a)}</span></button>`).join('')}</div></div>`).join('') +
        (imp ? `<div class="gabarito"><b>Gabarito comentado</b><ol>${(b.itens || []).map(q => `<li><b>${LETRAS[q.c]}</b>. ${inl(q.com)}</li>`).join('')}</ol></div>` : '');
    case 'receita':
      return `<div class="receita ${esc(b.cor || 'branca')}"><div class="rc-topo"><div><b>${esc(b.titulo)}</b><span>${esc(b.subtitulo || '')}</span></div><div class="rc-num">Nº ________<br><small>${esc(b.numeracao || '')}</small></div></div>` +
        (b.secoes || []).map(s => `<div class="rc-sec"><b>${esc(s.t)}</b>${(s.campos || []).map(c => `<div class="rc-campo"><span>${esc(c)}:</span><i></i></div>`).join('')}</div>`).join('') + `</div>` +
        ((b.regras || []).length ? `<div class="tab rc-regras"><table><thead><tr><th>Regra</th><th>Como é</th></tr></thead><tbody>${b.regras.map(r => `<tr><td><b>${inl(r[0])}</b></td><td>${inl(r[1])}</td></tr>`).join('')}</tbody></table></div>` : '') +
        (b.obs ? `<p class="rc-obs">${inl(b.obs)}</p>` : '');
    case 'pop': {
      const lista = (rot, xs, ord) => (xs && xs.length) ? `<div class="pop-sec"><b>${rot}</b><${ord ? 'ol' : 'ul'}>${xs.map(x => `<li>${inl(x)}</li>`).join('')}</${ord ? 'ol' : 'ul'}></div>` : '';
      return `<div class="pop"><div class="pop-cab"><div class="logo">Logotipo e nome<br>do estabelecimento</div><div class="tit"><small>Procedimento operacional padrão</small><b>${esc(b.titulo)}</b></div>` +
        `<div class="meta">Código: <b>${esc(b.codigo || '')}</b><br>Versão: ____<br>Emissão: ___/___/____<br>Revisão: ___/___/____</div></div>` +
        (b.objetivo ? `<div class="pop-sec"><b>Objetivo</b>${inl(b.objetivo)}</div>` : '') +
        (b.abrangencia ? `<div class="pop-sec"><b>Abrangência</b>${inl(b.abrangencia)}</div>` : '') +
        lista('Responsáveis', b.responsaveis) + lista('Materiais', b.materiais) + lista('Procedimento', b.procedimento, true) +
        lista('Cuidados', b.cuidados) + lista('Registros', b.registros) + lista('Referências', b.referencias) +
        `<div class="pop-ass"><div>Elaborado por:</div><div>Revisado por:</div><div>Aprovado por (farmacêutico RT):</div></div></div>`;
    }
    default: return `<p>Tipo de bloco desconhecido.</p>`;
  }
}
function blocoHtml(b, m, i, n, imp) {
  const t = TIPOS[b.tipo] || { nome: b.tipo, ic: 'box' };
  return `<section class="bloco b-${esc(b.tipo)}" id="${esc(b.id)}"><header><span class="circ">${ic(t.ic)}</span><h2>${esc(b.titulo || t.nome)}</h2>` +
    (imp ? '' : `<span class="ed-ctl"><button title="Editar" data-acao="bloco-editar" data-id="${b.id}">${ic('pencil')}</button><button title="Subir" data-acao="bloco-subir" data-id="${b.id}" ${i ? '' : 'disabled'}>${ic('arrow-up')}</button><button title="Descer" data-acao="bloco-descer" data-id="${b.id}" ${i < n - 1 ? '' : 'disabled'}>${ic('arrow-down')}</button><button class="del" title="Excluir" data-acao="bloco-excluir" data-id="${b.id}">${ic('trash')}</button></span>`) +
    `</header>${blocoCorpo(b, imp)}</section>`;
}

/* ---------------- telas ---------------- */
const app = () => $('#conteudo');
function estudados() { return new Set(lerLS('estudado', [])); }
function progresso(m) { const e = estudados(); const n = m.topicos.length; return n ? Math.round(100 * m.topicos.filter(t => e.has(t.id)).length / n) : 0; }
function contaQuestoes(m) { return m.apoio.filter(b => b.tipo === 'questoes').reduce((a, b) => a + (b.itens || []).length, 0); }

function menuLateral(atual) {
  $('#lista-mod').innerHTML = DADOS.modulos.map(m => `<li><a href="#/${m.id}/resumo" class="${m.id === atual ? 'ativo' : ''}" style="${corVars(m)}"><span class="num">${m.num}</span><span>${esc(m.titulo)}</span></a></li>`).join('');
  $('#bt-editar').classList.toggle('on', editando);
  $('#bt-editar').querySelector('span').textContent = editando ? 'Sair da edição' : 'Modo edição';
  $('#bt-salvar').classList.toggle('pri', alterado);
}
function faixas() {
  let s = '';
  if (alterado) s += `<div class="faixa">${ic('alert-triangle')}<span>Há alterações guardadas só neste navegador. Para não perder, grave no arquivo.</span><button class="bt pri" data-acao="salvar">${ic('device-floppy')} Salvar arquivo</button></div>`;
  return s;
}

function telaInicio() {
  document.body.style.cssText = '';
  menuLateral(null);
  const totQ = DADOS.modulos.reduce((a, m) => a + contaQuestoes(m), 0);
  const totMapas = DADOS.modulos.reduce((a, m) => a + m.mapas.length, 0);
  app().innerHTML = faixas() + `<div class="capa-inicio"><div><h1>${esc(DADOS.titulo)}</h1><p>${esc(DADOS.subtitulo)}</p></div>` +
    `<div style="display:flex;gap:8px;flex-wrap:wrap"><span class="pilula">${DADOS.modulos.length} módulos</span><span class="pilula">${totMapas} mapas mentais</span><span class="pilula">${totQ} questões</span></div></div>` +
    `<div class="grade">${DADOS.modulos.map((m, i) => `<a class="cartao-mod" href="#/${m.id}/resumo" style="${corVars(m)};animation-delay:${i * 40}ms">` +
      `<div class="cab"><span class="circ">${ic(m.icone)}</span><div><div class="rot">Módulo ${m.num}</div><h3>${esc(m.titulo)}</h3></div></div>` +
      `<p>${esc(m.escopo)}</p><div class="rod"><span class="pilula">${plural(m.topicos.length, 'tópico', 'tópicos')}</span><span class="pilula">${plural(m.mapas.length, 'mapa', 'mapas')}</span><span class="pilula">${plural(contaQuestoes(m), 'questão', 'questões')}</span></div>` +
      `<div class="barra" title="Tópicos marcados como estudados"><i style="width:${progresso(m)}%"></i></div></a>`).join('')}</div>`;
}

function cabModulo(m, aba) {
  const n = { resumo: m.topicos.length, mapa: m.mapas.length, apoio: m.apoio.length };
  return faixas() + `<div class="cab-mod"><span class="circ">${ic(m.icone)}</span><div><div class="rot">Módulo ${m.num}</div>` +
    `<h1 data-edit="mod:${m.id}:titulo">${esc(m.titulo)}</h1><p class="escopo" data-edit="mod:${m.id}:escopo">${esc(m.escopo)}</p></div></div>` +
    `<nav class="abas">` +
    [['resumo', 'book', 'Resumo para leitura'], ['mapa', 'sitemap', 'Mapa mental'], ['apoio', 'folders', 'Material de apoio']].map(([k, i, r]) =>
      `<a class="aba ${aba === k ? 'ativa' : ''}" href="#/${m.id}/${k}">${ic(i)} ${r} <span class="cont">${n[k]}</span></a>`).join('') +
    `<span class="aba-dir"><button class="bt peq" data-acao="pdf">${ic('file-type-pdf')} PDF</button></span></nav>`;
}
function barraEdicao() {
  return `<div class="ed-barra" id="ed-barra">` +
    `<button data-cmd="bold" title="Negrito">${ic('bold')}</button><button data-cmd="italic" title="Itálico">${ic('italic')}</button>` +
    `<button data-cmd="h3" title="Subtítulo">${ic('heading')} Subtítulo</button><button data-cmd="p" title="Parágrafo">Parágrafo</button>` +
    `<button data-cmd="insertUnorderedList" title="Lista">${ic('list')}</button><button data-cmd="insertOrderedList" title="Lista numerada">${ic('list-numbers')}</button><span class="sep"></span>` +
    `<button data-cx="chave">Ponto-chave</button><button data-cx="alerta">Atenção</button><button data-cx="balcao">No balcão</button><button data-cx="lei">Norma</button><button data-cx="exemplo">Caso</button>` +
    `<span class="sep"></span><button data-cmd="tabela" title="Inserir tabela">${ic('table')} Tabela</button><button data-cmd="removeFormat" title="Limpar formatação">${ic('clear-formatting')}</button>` +
    `<span class="dica">Clique no texto para editar. As mudanças ficam guardadas no navegador até você salvar o arquivo.</span></div>`;
}

function telaResumo(m, alvo) {
  const e = estudados();
  app().innerHTML = cabModulo(m, 'resumo') + (editando ? barraEdicao() : '') +
    `<div class="resumo-grade"><div>` +
    m.topicos.map((t, i) => `<article class="topico" id="${esc(t.id)}"><header><h2 data-edit="top:${t.id}:titulo">${esc(t.titulo)}</h2>` +
      `<span class="ed-ctl"><button title="Subir" data-acao="top-subir" data-id="${t.id}" ${i ? '' : 'disabled'}>${ic('arrow-up')}</button><button title="Descer" data-acao="top-descer" data-id="${t.id}" ${i < m.topicos.length - 1 ? '' : 'disabled'}>${ic('arrow-down')}</button><button class="del" title="Excluir tópico" data-acao="top-excluir" data-id="${t.id}">${ic('trash')}</button></span>` +
      `<button class="estudado ${e.has(t.id) ? 'on' : ''}" data-acao="estudado" data-id="${t.id}">${ic(e.has(t.id) ? 'circle-check' : 'check')} ${e.has(t.id) ? 'Estudado' : 'Marcar estudado'}</button></header>` +
      `<div class="texto" data-edit="top:${t.id}:resumo">${t.resumo}</div></article>`).join('') +
    `<div class="ed-novo"><button class="bt" data-acao="top-novo">${ic('plus')} Novo tópico</button></div>` +
    (m.fontes.length ? `<section class="fontes-mod"><h2>Fontes consultadas</h2><ol>${m.fontes.map(f => `<li>${inl(f)}</li>`).join('')}</ol></section>` : '') +
    `</div><aside class="sumario"><b>Tópicos</b>${m.topicos.map(t => `<a href="#/${m.id}/resumo/${t.id}">${e.has(t.id) ? `<span class="ok">${ic('circle-check')}</span>` : '<span class="bol"></span>'}<span>${esc(t.titulo)}</span></a>`).join('')}</aside></div>`;
  ativaEdicao();
  if (alvo) { const el = document.getElementById(alvo); if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30); }
}
function figuraMapa(mp, m, i, n, imp) {
  return `<figure class="mapa-fig" id="${esc(mp.id)}"><figcaption><span class="circ" style="width:36px;height:36px;font-size:18px">${ic('sitemap')}</span><h2>${esc(mp.titulo)}</h2>` +
    (imp ? '' : `<span class="ed-ctl"><button title="Editar mapa" data-acao="mapa-editar" data-id="${mp.id}">${ic('pencil')}</button><button title="Subir" data-acao="mapa-subir" data-id="${mp.id}" ${i ? '' : 'disabled'}>${ic('arrow-up')}</button><button title="Descer" data-acao="mapa-descer" data-id="${mp.id}" ${i < n - 1 ? '' : 'disabled'}>${ic('arrow-down')}</button><button class="del" title="Excluir mapa" data-acao="mapa-excluir" data-id="${mp.id}">${ic('trash')}</button></span>`) +
    `</figcaption><div class="mapa-rolo">${desenhaMapa(mp, m)}</div></figure>`;
}
function telaMapa(m) {
  app().innerHTML = cabModulo(m, 'mapa') + m.mapas.map((mp, i) => figuraMapa(mp, m, i, m.mapas.length)).join('') +
    `<div class="ed-novo"><button class="bt" data-acao="mapa-novo">${ic('plus')} Novo mapa mental</button></div>`;
  ativaEdicao();
}
function telaApoio(m, alvo) {
  app().innerHTML = cabModulo(m, 'apoio') + (editando ? barraEdicao() : '') +
    `<div class="indice-apoio">${m.apoio.map(b => `<a class="pilula" href="#/${m.id}/apoio/${b.id}">${ic(TIPOS[b.tipo] ? TIPOS[b.tipo].ic : 'box')} ${esc(b.titulo)}</a>`).join('')}</div>` +
    m.apoio.map((b, i) => blocoHtml(b, m, i, m.apoio.length)).join('') +
    `<div class="ed-novo"><select id="novo-tipo" class="bt">${Object.entries(TIPOS).map(([k, v]) => `<option value="${k}">${v.nome}</option>`).join('')}</select><button class="bt" data-acao="bloco-novo">${ic('plus')} Novo bloco</button></div>`;
  ativaEdicao();
  if (alvo) { const el = document.getElementById(alvo); if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30); }
}

/* ---------------- busca ---------------- */
let indice = null;
function textoPuro(html) { const d = document.createElement('div'); d.innerHTML = html; return d.textContent.replace(/\s+/g, ' ').trim(); }
function valores(o) { if (o == null) return ''; if (typeof o === 'string') return textoPuro(o); if (Array.isArray(o)) return o.map(valores).join(' '); if (typeof o === 'object') return Object.entries(o).filter(([k]) => !['id', 'tipo', 'cor', 'c'].includes(k)).map(([, v]) => valores(v)).join(' '); return ''; }
function montaIndice() {
  indice = [];
  DADOS.modulos.forEach(m => {
    m.topicos.forEach(t => { const tx = textoPuro(t.resumo); indice.push({ m, rota: `#/${m.id}/resumo/${t.id}`, titulo: t.titulo, tipo: 'Resumo', tx, n: semAcento(t.titulo + ' ' + tx) }); });
    m.mapas.forEach(mp => { const tx = valores(mp.ramos); indice.push({ m, rota: `#/${m.id}/mapa`, titulo: mp.titulo, tipo: 'Mapa mental', tx, n: semAcento(mp.titulo + ' ' + tx) }); });
    m.apoio.forEach(b => { const tx = valores(b); indice.push({ m, rota: `#/${m.id}/apoio/${b.id}`, titulo: b.titulo, tipo: (TIPOS[b.tipo] || {}).nome || 'Apoio', tx, n: semAcento(tx) }); });
  });
}
function telaBusca(q) {
  document.body.style.cssText = '';
  menuLateral(null);
  if (!indice) montaIndice();
  const termos = semAcento(q).split(/\s+/).filter(t => t.length > 1);
  const achados = termos.length ? indice.filter(r => termos.every(t => r.n.includes(t))) : [];
  const trecho = r => {
    const n = semAcento(r.tx), p = Math.max(0, n.indexOf(termos[0]) - 80);
    let s = esc((p ? '… ' : '') + r.tx.slice(p, p + 240) + '…');
    termos.forEach(t => { s = s.replace(new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>'); });
    return s;
  };
  app().innerHTML = `<div class="capa-inicio"><div><h1>Busca</h1><p>${achados.length} resultado(s) para “${esc(q)}”.</p></div></div>` +
    achados.slice(0, 80).map(r => `<a class="resultado" href="${r.rota}" style="${corVars(r.m)}"><small>Módulo ${r.m.num} · ${esc(r.tipo)}</small><b>${esc(r.titulo)}</b><p>${trecho(r)}</p></a>`).join('');
}

/* ---------------- rotas ---------------- */
function rota() {
  if (imprimindo) return;
  document.body.classList.remove('menu');
  const h = decodeURIComponent(location.hash.slice(1) || '/');
  const p = h.split('/').filter(Boolean);
  if (p[0] === 'busca') { telaBusca(p.slice(1).join('/')); window.scrollTo(0, 0); return; }
  const m = p[0] && mod(p[0]);
  if (!m) { telaInicio(); $('#titulo-movel').textContent = DADOS.titulo; window.scrollTo(0, 0); return; }
  document.body.style.cssText = corVars(m);
  menuLateral(m.id);
  $('#titulo-movel').textContent = `${m.num}. ${m.titulo}`;
  const aba = p[1] || 'resumo';
  if (aba === 'mapa') telaMapa(m); else if (aba === 'apoio') telaApoio(m, p[2]); else telaResumo(m, p[2]);
  if (!p[2]) window.scrollTo(0, 0);
}
function moduloAtual() { const p = location.hash.slice(2).split('/'); return mod(p[0]); }

/* ---------------- edição ---------------- */
function ativaEdicao() {
  $$('[data-edit]').forEach(el => {
    el.contentEditable = editando ? 'true' : 'false';
    if (!editando) el.removeAttribute('contenteditable');
  });
}
function marcaAlterado() {
  alterado = true;
  indice = null;
  const ok = gravarLS('rascunho', { base: DADOS.versao, quando: new Date().toISOString(), dados: DADOS });
  if (!ok) toast('O navegador não guardou o rascunho (sem espaço). Salve o arquivo agora.');
  if (!$('.faixa')) app().insertAdjacentHTML('afterbegin', faixas());
  $('#bt-salvar').classList.add('pri');
}
const pendentes = new Map();
function agendaCommit(el) { clearTimeout(pendentes.get(el)); pendentes.set(el, setTimeout(() => commit(el), 500)); }
function commitTodos() { pendentes.forEach((t, el) => { clearTimeout(t); commit(el); }); pendentes.clear(); }
function commit(el) {
  pendentes.delete(el);
  const [tipo, id, campo] = el.dataset.edit.split(':');
  if (tipo === 'mod') { const m = mod(id); m[campo] = el.innerText.replace(/\s+/g, ' ').trim(); }
  else if (tipo === 'top') {
    const m = moduloAtual(), t = m && m.topicos.find(x => x.id === id); if (!t) return;
    t[campo] = campo === 'titulo' ? el.innerText.replace(/\s+/g, ' ').trim() : limpaHtml(el.innerHTML);
  } else if (tipo === 'bloco') {
    const m = moduloAtual(), b = m && m.apoio.find(x => x.id === id); if (!b) return;
    b.html = limpaHtml(el.innerHTML);
  }
  marcaAlterado();
}
function moveItem(lista, id, d) { const i = lista.findIndex(x => x.id === id), j = i + d; if (i < 0 || j < 0 || j >= lista.length) return; [lista[i], lista[j]] = [lista[j], lista[i]]; marcaAlterado(); rota(); }
function excluiItem(lista, id, nome) { const i = lista.findIndex(x => x.id === id); if (i < 0) return; if (!confirm(`Excluir ${nome} “${lista[i].titulo}”? Dá para desfazer só recarregando sem salvar.`)) return; lista.splice(i, 1); marcaAlterado(); rota(); }

function fechaModal() { $$('.modal').forEach(x => x.remove()); }
function abreModal(html) {
  fechaModal();
  const d = document.createElement('div');
  d.className = 'modal';
  d.innerHTML = `<div class="caixa" role="dialog" aria-modal="true">${html}</div>`;
  d.addEventListener('mousedown', e => { if (e.target === d) fechaModal(); });
  document.body.appendChild(d);
  const f = d.querySelector('input,textarea,select'); if (f) f.focus();
  return d;
}

/* conversões texto <-> dados dos blocos estruturados */
const FORMATOS = {
  tabela: {
    ajuda: 'Primeira linha: nomes das colunas. Demais linhas: uma linha da tabela.\nSepare as células com  |  (barra vertical).\nPode usar <b>negrito</b>, <i>itálico</i> e <br> dentro da célula.',
    para: b => [b.colunas || [], ...(b.linhas || [])].map(l => l.join(' | ')).join('\n'),
    de: (t, b) => { const ls = t.split('\n').map(l => l.trim()).filter(Boolean).map(l => l.split('|').map(c => c.trim())); if (!ls.length) throw new Error('A tabela ficou vazia.'); const n = ls[0].length; b.colunas = ls[0]; b.linhas = ls.slice(1).map(l => { while (l.length < n) l.push(''); return l.slice(0, n); }); }
  },
  checklist: {
    ajuda: 'Um item por linha.',
    para: b => (b.itens || []).join('\n'),
    de: (t, b) => { b.itens = t.split('\n').map(l => l.trim()).filter(Boolean); }
  },
  fluxo: {
    ajuda: 'Um passo por linha, começando pelo tipo:\ninicio: Cliente chega com a receita\nacao: Conferir a data de emissão\ndecisao: A receita está no prazo? | sim: seguir para a conferência | nao: não dispensar e orientar\nalerta: Sinal de gravidade: encaminhar\nfim: Registrar e entregar',
    para: b => (b.passos || []).map(p => `${p.tipo || 'acao'}: ${p.t}` + (p.tipo === 'decisao' ? ` | sim: ${p.sim || ''} | nao: ${p.nao || ''}` : '')).join('\n'),
    de: (t, b) => {
      b.passos = t.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
        const m = semAcento(l).match(/^(inicio|acao|decisao|alerta|fim)\s*:/);
        const tipo = m ? m[1] : 'acao';
        let resto = m ? l.slice(l.indexOf(':') + 1).trim() : l;
        const p = { tipo };
        if (tipo === 'decisao') {
          const partes = resto.split('|').map(x => x.trim());
          resto = partes.shift();
          partes.forEach(x => { const k = semAcento(x.split(':')[0]).trim(); const v = x.slice(x.indexOf(':') + 1).trim(); if (k === 'sim') p.sim = v; if (k === 'nao') p.nao = v; });
        }
        p.t = resto; return p;
      });
    }
  },
  cartoes: {
    ajuda: 'Um cartão por linha:  frente || verso',
    para: b => (b.itens || []).map(c => `${c.f} || ${c.v}`).join('\n'),
    de: (t, b) => { b.itens = t.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [f, ...v] = l.split('||'); if (!v.length) throw new Error(`Falta "||" no cartão: ${l.slice(0, 50)}`); return { f: f.trim(), v: v.join('||').trim() }; }); }
  },
  questoes: {
    ajuda: 'Questões separadas por uma linha em branco. Em cada questão:\nP: enunciado\n* alternativa correta\n- alternativa errada\n- alternativa errada\n- alternativa errada\nC: comentário',
    para: b => (b.itens || []).map(q => [`P: ${q.p}`, ...q.alt.map((a, i) => (i === q.c ? '* ' : '- ') + a), `C: ${q.com || ''}`].join('\n')).join('\n\n'),
    de: (t, b) => {
      b.itens = t.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean).map((bl, n) => {
        const q = { p: '', alt: [], c: -1, com: '' }; let ult = 'p';
        bl.split('\n').forEach(l => {
          l = l.trim(); if (!l) return;
          if (/^P:/i.test(l)) { q.p = l.slice(2).trim(); ult = 'p'; }
          else if (/^C:/i.test(l)) { q.com = l.slice(2).trim(); ult = 'com'; }
          else if (l[0] === '*') { q.c = q.alt.length; q.alt.push(l.slice(1).trim()); ult = 'alt'; }
          else if (l[0] === '-') { q.alt.push(l.slice(1).trim()); ult = 'alt'; }
          else if (ult === 'alt') q.alt[q.alt.length - 1] += ' ' + l; else q[ult] += ' ' + l;
        });
        if (q.alt.length < 2 || q.c < 0) throw new Error(`Questão ${n + 1}: precisa de alternativas e de uma marcada com *.`);
        return q;
      });
    }
  },
  pop: {
    ajuda: 'Campos de uma linha:  Título: …  Código: …  Objetivo: …  Abrangência: …\nCampos em lista (uma linha "Nome:" e depois itens começando com "- "):\nResponsáveis:  Materiais:  Procedimento:  Cuidados:  Registros:  Referências:',
    para: b => [`Título: ${b.titulo || ''}`, `Código: ${b.codigo || ''}`, `Objetivo: ${b.objetivo || ''}`, `Abrangência: ${b.abrangencia || ''}`,
      ...[['Responsáveis', 'responsaveis'], ['Materiais', 'materiais'], ['Procedimento', 'procedimento'], ['Cuidados', 'cuidados'], ['Registros', 'registros'], ['Referências', 'referencias']]
        .map(([r, k]) => `\n${r}:\n` + (b[k] || []).map(x => '- ' + x).join('\n'))].join('\n'),
    de: (t, b) => {
      const simples = { titulo: 'titulo', codigo: 'codigo', objetivo: 'objetivo', abrangencia: 'abrangencia' };
      const listas = { responsaveis: 1, materiais: 1, procedimento: 1, cuidados: 1, registros: 1, referencias: 1 };
      Object.keys(listas).forEach(k => { b[k] = []; });
      let atual = null;
      t.split('\n').forEach(l => {
        l = l.trim(); if (!l) return;
        const m = l.match(/^([^:-][^:]{1,20}):\s*(.*)$/), k = m && semAcento(m[1]).replace(/\s+/g, '');
        if (m && simples[k]) { b[simples[k]] = m[2]; atual = null; }
        else if (m && listas[k]) { atual = k; if (m[2]) b[k].push(m[2]); }
        else if (l[0] === '-' && atual) b[atual].push(l.slice(1).trim());
        else if (atual) b[atual].push(l);
      });
    }
  },
  receita: {
    ajuda: 'Título: …\nCor: amarela | azul | branca\nSubtítulo: …\nNumeração: …\nSeção: Identificação do emitente\n- Nome\n- Inscrição no conselho\nSeção: Paciente\n- Nome\nRegra: Validade = 30 dias\nObs: …',
    para: b => [`Título: ${b.titulo || ''}`, `Cor: ${b.cor || 'branca'}`, `Subtítulo: ${b.subtitulo || ''}`, `Numeração: ${b.numeracao || ''}`,
      ...(b.secoes || []).map(s => `Seção: ${s.t}\n` + (s.campos || []).map(c => '- ' + c).join('\n')),
      ...(b.regras || []).map(r => `Regra: ${r[0]} = ${r[1]}`), `Obs: ${b.obs || ''}`].join('\n'),
    de: (t, b) => {
      b.secoes = []; b.regras = []; let sec = null;
      t.split('\n').forEach(l => {
        l = l.trim(); if (!l) return;
        const m = l.match(/^([^:-][^:]{1,15}):\s*(.*)$/), k = m && semAcento(m[1]).trim();
        if (m && k === 'titulo') b.titulo = m[2]; else if (m && k === 'cor') b.cor = semAcento(m[2]).trim();
        else if (m && k === 'subtitulo') b.subtitulo = m[2]; else if (m && k === 'numeracao') b.numeracao = m[2];
        else if (m && k === 'obs') b.obs = m[2];
        else if (m && k === 'secao') { sec = { t: m[2], campos: [] }; b.secoes.push(sec); }
        else if (m && k === 'regra') { const [a, ...v] = m[2].split('='); b.regras.push([a.trim(), v.join('=').trim()]); }
        else if (l[0] === '-' && sec) sec.campos.push(l.slice(1).trim());
      });
    }
  }
};
function editaBloco(m, b, novo) {
  const f = FORMATOS[b.tipo];
  const d = abreModal(`<h2>${novo ? 'Novo bloco' : 'Editar bloco'}: ${esc(TIPOS[b.tipo].nome)}</h2>` +
    `<label class="campo"><span>Título</span><input type="text" id="ed-tit" value="${esc(b.titulo || '')}"></label>` +
    (b.tipo === 'quadro' ? `<p class="sub">O conteúdo do quadro é editado direto na página, no modo edição.</p>` :
      `<pre class="ajuda">${esc(f.ajuda)}</pre><label class="campo"><span>Conteúdo</span><textarea id="ed-txt" spellcheck="true">${esc(f.para(b))}</textarea></label>`) +
    (b.tipo === 'tabela' ? `<label class="campo"><span>Nota abaixo da tabela (opcional)</span><input type="text" id="ed-nota" value="${esc(b.nota || '')}"></label>` : '') +
    `<p class="erro-ed" id="ed-erro"></p><div class="rod"><button class="bt" data-fecha>Cancelar</button><button class="bt pri" id="ed-ok">${ic('check')} Aplicar</button></div>`);
  d.querySelector('[data-fecha]').onclick = () => { if (novo) { m.apoio.splice(m.apoio.indexOf(b), 1); } fechaModal(); };
  d.querySelector('#ed-ok').onclick = () => {
    try {
      const copia = JSON.parse(JSON.stringify(b));
      copia.titulo = $('#ed-tit', d).value.trim() || TIPOS[b.tipo].nome;
      if (f) f.de($('#ed-txt', d).value, copia);
      if (b.tipo === 'tabela') copia.nota = $('#ed-nota', d).value.trim();
      Object.assign(b, copia);
      fechaModal(); marcaAlterado(); rota();
    } catch (e) { $('#ed-erro', d).textContent = e.message; }
  };
}
function editaMapa(m, mp, novo) {
  const txt = (mp.ramos || []).map(r => r.t + '\n' + (r.itens || []).map(it => typeof it === 'string' ? '- ' + it : '- ' + it.t + '\n' + (it.itens || []).map(s => '-- ' + s).join('\n')).join('\n')).join('\n');
  const d = abreModal(`<h2>${novo ? 'Novo mapa mental' : 'Editar mapa mental'}</h2>` +
    `<div class="duas"><label class="campo"><span>Título</span><input type="text" id="mp-tit" value="${esc(mp.titulo || '')}"></label><label class="campo"><span>Centro do mapa</span><input type="text" id="mp-cen" value="${esc(mp.centro || '')}"></label></div>` +
    `<pre class="ajuda">Linha sem traço = ramo (4 a 6 ramos).\n- item do ramo (até ~60 caracteres)\n-- subitem do item (opcional)</pre>` +
    `<label class="campo"><span>Ramos e itens</span><textarea id="mp-txt">${esc(txt)}</textarea></label>` +
    `<p class="erro-ed" id="ed-erro"></p><div class="rod"><button class="bt" data-fecha>Cancelar</button><button class="bt pri" id="ed-ok">${ic('check')} Aplicar</button></div>`);
  d.querySelector('[data-fecha]').onclick = () => { if (novo) m.mapas.splice(m.mapas.indexOf(mp), 1); fechaModal(); };
  d.querySelector('#ed-ok').onclick = () => {
    const ramos = []; let r = null, it = null;
    $('#mp-txt', d).value.split('\n').forEach(l => {
      const t = l.trim(); if (!t) return;
      if (t.startsWith('--') && it) { if (typeof it.ref === 'string') { const o = { t: it.ref, itens: [] }; r.itens[it.i] = o; it.ref = o; } it.ref.itens.push(t.slice(2).trim()); }
      else if (t.startsWith('-') && r) { r.itens.push(t.slice(1).trim()); it = { i: r.itens.length - 1, ref: t.slice(1).trim() }; }
      else { r = { t, itens: [] }; ramos.push(r); it = null; }
    });
    if (!ramos.length) { $('#ed-erro', d).textContent = 'O mapa precisa de ao menos um ramo.'; return; }
    mp.titulo = $('#mp-tit', d).value.trim() || 'Mapa mental'; mp.centro = $('#mp-cen', d).value.trim() || mp.titulo; mp.ramos = ramos;
    fechaModal(); marcaAlterado(); rota();
  };
}

/* ---------------- salvar arquivo, backup e rascunho ---------------- */
function htmlComDados() {
  const json = JSON.stringify(DADOS).replace(/</g, '\\u003c');
  const abre = '<' + 'script id="sos-dados" type="application/json">';
  const ini = ORIGEM.indexOf(abre);
  const fim = ORIGEM.indexOf('<' + '/script>', ini);
  if (ini < 0 || fim < 0) throw new Error('Não achei o bloco de dados no arquivo.');
  return ORIGEM.slice(0, ini) + abre + json + ORIGEM.slice(fim);
}
async function salvarArquivo() {
  commitTodos();
  const anterior = DADOS.versao;
  DADOS.versao = new Date().toISOString();
  let html;
  try { html = htmlComDados(); } catch (e) { DADOS.versao = anterior; alert(e.message); return; }
  const nome = 'SOS-Farmacia-Comercial.html';
  try {
    if (window.showSaveFilePicker) {
      const fh = await window.showSaveFilePicker({ suggestedName: nome, types: [{ description: 'Página HTML', accept: { 'text/html': ['.html'] } }] });
      const w = await fh.createWritable(); await w.write(html); await w.close();
    } else baixar(new Blob([html], { type: 'text/html' }), nome);
  } catch (e) { DADOS.versao = anterior; if (e.name !== 'AbortError') alert('Não foi possível salvar: ' + e.message); return; }
  alterado = false; apagarLS('rascunho');
  toast('Arquivo salvo. Abra sempre a versão nova.');
  rota();
}
function baixar(blob, nome) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
function verificaRascunho() {
  const r = lerLS('rascunho', null);
  if (!r || !r.dados) return;
  const quando = new Date(r.quando).toLocaleString('pt-BR');
  const outra = r.base !== DADOS.versao;
  const d = abreModal(`<h2>Alterações não salvas</h2><p class="sub">Este navegador guardou alterações feitas em ${esc(quando)} que não foram gravadas no arquivo.` +
    (outra ? ' Elas foram feitas sobre outra versão do arquivo; recuperar substitui o conteúdo atual por aquele rascunho.' : '') + `</p>` +
    `<div class="rod"><button class="bt perigo" id="rs-desc">Descartar rascunho</button><button class="bt pri" id="rs-rec">${ic('restore')} Recuperar alterações</button></div>`);
  $('#rs-desc', d).onclick = () => { if (confirm('Descartar as alterações guardadas no navegador?')) { apagarLS('rascunho'); fechaModal(); } };
  $('#rs-rec', d).onclick = () => { Object.assign(DADOS, r.dados); alterado = true; fechaModal(); indice = null; rota(); };
}
function ajustes() {
  const cfg = DADOS.config;
  const d = abreModal(`<h2>Ajustes</h2><p class="sub">Marca-d'água padrão dos PDFs e cópias de segurança do conteúdo.</p>` +
    `<div class="duas"><label class="campo"><span>Marca-d'água (linha principal)</span><input type="text" id="aj-m1" value="${esc(cfg.marca)}"></label>` +
    `<label class="campo"><span>Segunda linha (opcional)</span><input type="text" id="aj-m2" value="${esc(cfg.marca2 || '')}" placeholder="Ex.: Licenciado para Fulano"></label></div>` +
    `<div class="rod" style="justify-content:flex-start"><button class="bt" id="aj-exp">${ic('download')} Exportar conteúdo (.json)</button><label class="bt">${ic('upload')} Importar conteúdo (.json)<input type="file" id="aj-imp" accept=".json,application/json" hidden></label></div>` +
    `<p class="sub" style="margin-top:12px">Versão do conteúdo: ${esc(new Date(DADOS.versao).toLocaleString('pt-BR'))}</p>` +
    `<div class="rod"><button class="bt" data-fecha>Fechar</button><button class="bt pri" id="aj-ok">${ic('check')} Aplicar</button></div>`);
  $('[data-fecha]', d).onclick = fechaModal;
  $('#aj-ok', d).onclick = () => { cfg.marca = $('#aj-m1', d).value.trim() || 'SOS Farmácia Comercial'; cfg.marca2 = $('#aj-m2', d).value.trim(); fechaModal(); marcaAlterado(); };
  $('#aj-exp', d).onclick = () => { commitTodos(); baixar(new Blob([JSON.stringify(DADOS, null, 1)], { type: 'application/json' }), `sos-farmacia-conteudo-${new Date().toISOString().slice(0, 10)}.json`); };
  $('#aj-imp', d).onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const novo = JSON.parse(await f.text());
      if (!novo.modulos || !Array.isArray(novo.modulos)) throw new Error('arquivo sem módulos');
      if (!confirm(`Substituir todo o conteúdo pelo do arquivo ${f.name}?`)) return;
      Object.keys(DADOS).forEach(k => delete DADOS[k]); Object.assign(DADOS, novo);
      fechaModal(); marcaAlterado(); rota(); toast('Conteúdo importado. Salve o arquivo para gravar.');
    } catch (err) { alert('Não consegui ler: ' + err.message); }
  };
}

/* ---------------- PDF ---------------- */
function janelaPdf() {
  commitTodos();
  const m = moduloAtual(), cfg = DADOS.config;
  const d = abreModal(`<h2>Gerar PDF</h2><p class="sub">Na janela de impressão que vai abrir, escolha <b>Salvar como PDF</b> no destino. Todo PDF sai com marca-d'água.</p>` +
    `<div class="opcoes">` +
    (m ? `<label><input type="radio" name="pdf-esc" value="${m.id}" checked> Este módulo: ${esc(m.num + '. ' + m.titulo)}</label>` : '') +
    `<label><input type="radio" name="pdf-esc" value="todos" ${m ? '' : 'checked'}> Todos os módulos (arquivo grande)</label>` +
    `<label><select id="pdf-um" class="bt peq" style="flex:1">${DADOS.modulos.map(x => `<option value="${x.id}">${x.num}. ${esc(x.titulo)}</option>`).join('')}</select><input type="radio" name="pdf-esc" value="um"> Outro módulo</label></div>` +
    `<div class="opcoes" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">` +
    `<label><input type="checkbox" id="pdf-capa" checked> Capa</label><label><input type="checkbox" id="pdf-resumo" checked> Resumo para leitura</label>` +
    `<label><input type="checkbox" id="pdf-mapa" checked> Mapas mentais</label><label><input type="checkbox" id="pdf-apoio" checked> Material de apoio</label>` +
    `<label><input type="checkbox" id="pdf-gab" checked> Gabarito das questões</label></div>` +
    `<div class="duas"><label class="campo"><span>Marca-d'água</span><input type="text" id="pdf-m1" value="${esc(cfg.marca)}"></label>` +
    `<label class="campo"><span>Segunda linha (opcional)</span><input type="text" id="pdf-m2" value="${esc(cfg.marca2 || '')}" placeholder="Ex.: Licenciado para Fulano"></label></div>` +
    `<div class="rod"><button class="bt" data-fecha>Cancelar</button><button class="bt pri" id="pdf-ok">${ic('file-type-pdf')} Gerar PDF</button></div>`);
  $('[data-fecha]', d).onclick = fechaModal;
  $('#pdf-um', d).onchange = () => { $('input[value=um]', d).checked = true; };
  $('#pdf-ok', d).onclick = () => {
    const esc_ = $('input[name=pdf-esc]:checked', d).value;
    const ids = esc_ === 'todos' ? DADOS.modulos.map(x => x.id) : [esc_ === 'um' ? $('#pdf-um', d).value : esc_];
    const o = { ids, capa: $('#pdf-capa', d).checked, resumo: $('#pdf-resumo', d).checked, mapa: $('#pdf-mapa', d).checked, apoio: $('#pdf-apoio', d).checked, gabarito: $('#pdf-gab', d).checked, marca: $('#pdf-m1', d).value.trim() || 'SOS Farmácia Comercial', marca2: $('#pdf-m2', d).value.trim() };
    if (!o.resumo && !o.mapa && !o.apoio) { alert('Escolha ao menos uma parte.'); return; }
    fechaModal();
    imprime(o);
  };
}
function montaMarcaDagua(o) {
  const md = $('.marca-dagua');
  const t = `<span>${esc(o.marca)}${o.marca2 ? `<small>${esc(o.marca2)}</small>` : ''}</span>`;
  md.innerHTML = `<div class="md-g">${t.repeat(24)}</div>`;
  md.style.setProperty('--md-cor', '#1E2A44');
  md.style.setProperty('--md-op', '0.075');
}
function montaImpressao(o) {
  const alvo = $('#impressao');
  montaMarcaDagua(o);
  let s = '';
  if (o.ids.length > 1 && o.capa) {
    s += `<section class="pi pi-capa pi-capa-geral" style="--mc:#D92D20;--mc-t:#FFFFFF"><div class="faixa-cor"></div><div class="rot">Material de apoio</div><h1>${esc(DADOS.titulo)}</h1><p class="escopo">${esc(DADOS.subtitulo)}</p>` +
      `<div class="sum">${DADOS.modulos.filter(m => o.ids.includes(m.id)).map(m => `<div><b>Módulo ${m.num}.</b> ${esc(m.titulo)}</div>`).join('')}</div>` +
      `<div class="pe"><span class="sos">SOS</span><span>${esc(o.marca)}${o.marca2 ? ' · ' + esc(o.marca2) : ''}</span></div></section>`;
  }
  o.ids.forEach(id => {
    const m = mod(id);
    s += `<div class="pi" style="${corVars(m)}">`;
    if (o.capa) s += `<section class="pi-capa"><div class="faixa-cor"></div><div class="rot">Módulo ${m.num}</div><h1>${esc(m.titulo)}</h1><p class="escopo">${esc(m.escopo)}</p>` +
      `<div class="sum">${m.topicos.map(t => `<div>${esc(t.titulo)}</div>`).join('')}</div><div class="pe"><span class="sos">SOS</span><span>${esc(DADOS.titulo)}</span></div></section>`;
    if (o.resumo && m.topicos.length) {
      s += `<div class="pi-parte">Resumo para leitura<small>Módulo ${m.num}</small></div>` +
        m.topicos.map(t => `<article class="topico"><h2>${esc(t.titulo)}</h2><div class="texto">${t.resumo}</div></article>`).join('') +
        (m.fontes.length ? `<section class="fontes-mod"><h2>Fontes consultadas</h2><ol>${m.fontes.map(f => `<li>${inl(f)}</li>`).join('')}</ol></section>` : '');
    }
    if (o.mapa && m.mapas.length) s += m.mapas.map(mp => figuraMapa(mp, m, 0, 1, true).replace('</h2>', `</h2><small>Mapa mental · Módulo ${m.num}</small>`)).join('');
    if (o.apoio && m.apoio.length) {
      s += `<div class="pi-parte">Material de apoio<small>Módulo ${m.num}</small></div>` +
        m.apoio.map((b, i) => blocoHtml(b, m, i, 1, true)).join('');
    }
    s += `</div>`;
  });
  alvo.innerHTML = s;
  if (!o.gabarito) $$('.gabarito', alvo).forEach(g => g.remove());
  const um = o.ids.length === 1 ? mod(o.ids[0]) : null;
  document.title = um ? `SOS Farmácia Comercial - Módulo ${String(um.num).padStart(2, '0')} - ${um.titulo}` : 'SOS Farmácia Comercial - Todos os módulos';
}
function imprime(o) {
  imprimindo = true;
  montaImpressao(o);
  setTimeout(() => { window.print(); }, 250);
}
window.addEventListener('beforeprint', () => {
  if (imprimindo) return;
  /* Impressão pelo menu do navegador: monta o módulo aberto (ou todos) com a marca-d'água padrão. */
  commitTodos();
  const m = moduloAtual();
  imprimindo = true;
  montaImpressao({ ids: m ? [m.id] : DADOS.modulos.map(x => x.id), capa: true, resumo: true, mapa: true, apoio: true, gabarito: true, marca: DADOS.config.marca, marca2: DADOS.config.marca2 });
});
window.addEventListener('afterprint', () => {
  if (new URLSearchParams(location.search).get('pdf')) return;
  imprimindo = false; document.title = tituloOriginal;
  setTimeout(() => { $('#impressao').innerHTML = ''; }, 500);
});

/* ---------------- eventos ---------------- */
document.addEventListener('click', e => {
  const a = e.target.closest('[data-acao]');
  if (a) {
    const ac = a.dataset.acao, id = a.dataset.id, m = moduloAtual();
    if (ac === 'salvar') salvarArquivo();
    else if (ac === 'pdf') janelaPdf();
    else if (ac === 'estudado') { const s = estudados(); s.has(id) ? s.delete(id) : s.add(id); gravarLS('estudado', [...s]); rota(); }
    else if (!m) return;
    else if (ac === 'top-subir') moveItem(m.topicos, id, -1);
    else if (ac === 'top-descer') moveItem(m.topicos, id, 1);
    else if (ac === 'top-excluir') excluiItem(m.topicos, id, 'o tópico');
    else if (ac === 'top-novo') { const t = prompt('Título do novo tópico:'); if (t) { const nid = novoId(m.id, 't'); m.topicos.push({ id: nid, titulo: t.trim(), resumo: '<p>Escreva aqui.</p>' }); marcaAlterado(); location.hash = `#/${m.id}/resumo/${nid}`; } }
    else if (ac === 'mapa-subir') moveItem(m.mapas, id, -1);
    else if (ac === 'mapa-descer') moveItem(m.mapas, id, 1);
    else if (ac === 'mapa-excluir') excluiItem(m.mapas, id, 'o mapa');
    else if (ac === 'mapa-editar') editaMapa(m, m.mapas.find(x => x.id === id));
    else if (ac === 'mapa-novo') { const mp = { id: novoId(m.id, 'mapa'), titulo: 'Novo mapa', centro: 'Tema', ramos: [{ t: 'Ramo', itens: ['Item'] }] }; m.mapas.push(mp); editaMapa(m, mp, true); }
    else if (ac === 'bloco-subir') moveItem(m.apoio, id, -1);
    else if (ac === 'bloco-descer') moveItem(m.apoio, id, 1);
    else if (ac === 'bloco-excluir') excluiItem(m.apoio, id, 'o bloco');
    else if (ac === 'bloco-editar') editaBloco(m, m.apoio.find(x => x.id === id));
    else if (ac === 'bloco-novo') {
      const tipo = $('#novo-tipo').value;
      const base = { tabela: { colunas: ['Coluna 1', 'Coluna 2'], linhas: [['', '']] }, quadro: { html: '<p>Escreva aqui.</p>' }, checklist: { itens: ['Item'] }, fluxo: { passos: [{ tipo: 'inicio', t: 'Início' }, { tipo: 'fim', t: 'Fim' }] }, cartoes: { itens: [{ f: 'Pergunta', v: 'Resposta' }] }, questoes: { itens: [{ p: 'Enunciado', alt: ['A', 'B', 'C', 'D'], c: 0, com: '' }] }, receita: { cor: 'branca', secoes: [{ t: 'Identificação do emitente', campos: ['Nome'] }], regras: [] }, pop: { codigo: 'POP-', procedimento: ['Passo'] } }[tipo];
      const b = Object.assign({ id: novoId(m.id, 'b'), tipo, titulo: TIPOS[tipo].nome }, base);
      m.apoio.push(b);
      if (tipo === 'quadro') { marcaAlterado(); rota(); } else editaBloco(m, b, true);
    }
    return;
  }
  const alt = e.target.closest('button.alt');
  if (alt) {
    const qd = alt.closest('.questao'); if (qd.dataset.resp) return;
    const [bid, i] = qd.dataset.q.split(':'); const m = moduloAtual(); const q = m.apoio.find(b => b.id === bid).itens[+i];
    qd.dataset.resp = '1';
    const j = +alt.dataset.alt;
    $$('.alt', qd).forEach((x, k) => { if (k === q.c) x.classList.add('certa'); });
    if (j !== q.c) alt.classList.add('errada');
    qd.insertAdjacentHTML('beforeend', `<div class="coment"><b>${j === q.c ? 'Correto.' : `Resposta: ${LETRAS[q.c]}.`}</b> ${inl(q.com)}</div>`);
    return;
  }
  const fl = e.target.closest('[data-flash]');
  if (fl) { fl.classList.toggle('virado'); return; }
  if (e.target.closest('#bt-menu')) { document.body.classList.toggle('menu'); return; }
  if (e.target === document.body && document.body.classList.contains('menu')) document.body.classList.remove('menu');
});
document.addEventListener('change', e => {
  const c = e.target.closest('[data-check]');
  if (c) { const [bid, i] = c.dataset.check.split(':'); const all = lerLS('check', {}); const s = new Set(all[bid] || []); c.checked ? s.add(+i) : s.delete(+i); all[bid] = [...s]; gravarLS('check', all); }
});
document.addEventListener('input', e => { const el = e.target.closest('[data-edit][contenteditable=true]'); if (el) agendaCommit(el); });
document.addEventListener('focusout', e => { const el = e.target.closest && e.target.closest('[data-edit][contenteditable=true]'); if (el && pendentes.has(el)) commit(el); });
document.addEventListener('paste', e => {
  const el = e.target.closest && e.target.closest('[data-edit][contenteditable=true]');
  if (!el) return;
  e.preventDefault();
  const t = (e.clipboardData || window.clipboardData).getData('text/plain');
  document.execCommand('insertText', false, t);
});
document.addEventListener('keydown', e => {
  const el = e.target.closest && e.target.closest('[data-edit^="mod:"],[data-edit$=":titulo"]');
  if (el && el.isContentEditable && e.key === 'Enter') { e.preventDefault(); el.blur(); }
  if (e.key === 'Escape') fechaModal();
});
document.addEventListener('mousedown', e => {
  const b = e.target.closest('#ed-barra button'); if (!b) return;
  e.preventDefault();
  const sel = window.getSelection(), alvo = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
  const ed = alvo && alvo.closest('.texto[contenteditable=true]');
  if (!ed) { toast('Clique primeiro dentro do texto que quer formatar.'); return; }
  const cmd = b.dataset.cmd, cx = b.dataset.cx;
  if (cx) {
    const rot = { chave: 'Ponto-chave', alerta: 'Atenção', balcao: 'No balcão', lei: 'O que diz a norma', exemplo: 'Caso' }[cx];
    document.execCommand('insertHTML', false, `<div class="cx ${cx}"><b>${rot}</b><p>Escreva aqui.</p></div><p><br></p>`);
  } else if (cmd === 'h3' || cmd === 'p') document.execCommand('formatBlock', false, cmd);
  else if (cmd === 'tabela') document.execCommand('insertHTML', false, '<div class="tab"><table><thead><tr><th>Coluna 1</th><th>Coluna 2</th><th>Coluna 3</th></tr></thead><tbody><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table></div><p><br></p>');
  else document.execCommand(cmd, false, null);
  agendaCommit(ed);
});
$('#bt-editar').onclick = () => { commitTodos(); editando = !editando; document.body.classList.toggle('editando', editando); try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* antigo */ } rota(); toast(editando ? 'Modo edição ligado: clique em um texto para alterar.' : 'Modo edição desligado.'); };
$('#bt-salvar').onclick = salvarArquivo;
$('#bt-pdf').onclick = janelaPdf;
$('#bt-ajustes').onclick = ajustes;
$('#busca').addEventListener('keydown', e => { if (e.key === 'Enter') { const q = e.target.value.trim(); if (q) location.hash = '#/busca/' + encodeURIComponent(q); } });
window.addEventListener('hashchange', () => { commitTodos(); rota(); });
window.addEventListener('beforeunload', e => { commitTodos(); if (alterado) { e.preventDefault(); e.returnValue = ''; } });

/* ---------------- início ---------------- */
async function inicia() {
  try { await Promise.all(['400 16px Inter', '500 16px Inter', '600 16px Inter', '700 16px Inter', '16px tabler-icons'].map(f => document.fonts.load(f))); } catch (e) { /* segue com a fonte do sistema */ }
  const q = new URLSearchParams(location.search);
  if (q.get('pdf')) {
    /* Geração automática (ferramentas/gera_pdfs.py): monta a impressão e avisa que terminou. */
    const ids = q.get('pdf') === 'todos' ? DADOS.modulos.map(x => x.id) : q.get('pdf').split(',');
    const partes = (q.get('partes') || 'resumo,mapa,apoio').split(',');
    imprimindo = true;
    montaImpressao({ ids, capa: q.get('capa') !== '0', resumo: partes.includes('resumo'), mapa: partes.includes('mapa'), apoio: partes.includes('apoio'), gabarito: q.get('gabarito') !== '0', marca: q.get('marca') || DADOS.config.marca, marca2: q.get('marca2') || DADOS.config.marca2 || '' });
    document.body.dataset.pronto = '1';
    return;
  }
  rota();
  verificaRascunho();
}
window.SOS = { dados: DADOS, htmlComDados }; /* para conferência e testes */
inicia();
})();
