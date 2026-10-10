(function () {
'use strict';

/* Conta MedTech (10/10/2026): no site (medtechbr.com.br/sos-farmacia/) o casca.html liga o portão de
   login e a checagem de compra (mtsync.js + /_mtacesso.js + conta-sos.js) e marca window.__sosPortao.
   Aberto do computador (file://) ou no localhost, nada disso entra e o app é a ferramenta do dono, como antes.
   No site, edição, "Salvar arquivo", importar/exportar conteúdo e marca-d'água livre ficam só para a
   conta de administração (SOS.liberarEdicao); o cliente lê, estuda e gera PDF com a marca-d'água
   travada em "Licenciado para <e-mail da conta>" (SOS.cliente). Nada do aparelho é apagado. */
const PORTAO = window.__sosPortao === true;
let podeEditar = !PORTAO, licenciado = '';
/* Cópia intacta do arquivo, tirada antes de qualquer desenho: é a base de "Salvar arquivo".
   Sai sem o que o portão de login pôs na página (classe, estilo e o script carregado por ele). */
const ORIGEM = (() => {
  const c = document.documentElement.cloneNode(true);
  c.classList.remove('mts-trava'); if (!c.classList.length) c.removeAttribute('class');
  c.querySelectorAll('#mtsCSS,#mtsPortao,#mta,#mta-css,#mtc,[data-sos-portao]').forEach(n => n.remove());
  [...c.style].filter(k => k.startsWith('--mts-')).forEach(k => c.style.removeProperty(k));
  if (!c.getAttribute('style')) c.removeAttribute('style');
  return '<!doctype html>\n' + c.outerHTML;
})();
const CHAVE = 'sos-farmacia:';
const DADOS = JSON.parse(document.getElementById('sos-dados').textContent);
const GLIFO = /*GLIFOS*/{};
let editando = false, alterado = false, imprimindo = false;
const tituloOriginal = document.title;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const novoId = (pre, tipo) => `${pre}-${tipo}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const mod = id => DADOS.modulos.find(m => m.id === id);
const ic = n => `<i class="ti ti-${n}" aria-hidden="true"></i>`;
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function lerLS(k, padrao) { try { const v = localStorage.getItem(CHAVE + k); return v ? JSON.parse(v) : padrao; } catch (e) { return padrao; } }
function gravarLS(k, v) { try { localStorage.setItem(CHAVE + k, JSON.stringify(v)); return true; } catch (e) { return false; } }
function apagarLS(k) { try { localStorage.removeItem(CHAVE + k); } catch (e) { /* sem armazenamento */ } }
function aviso(msg) {
  $$('.aviso').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'aviso'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

/* ---------------- tema ---------------- */
function aplicaTema() { const t = lerLS('tema', ''); if (t) document.documentElement.dataset.tema = t; else delete document.documentElement.dataset.tema; }
function trocaTema() {
  const escuroAgora = document.documentElement.dataset.tema === 'escuro' || (!document.documentElement.dataset.tema && matchMedia('(prefers-color-scheme: dark)').matches);
  gravarLS('tema', escuroAgora ? 'claro' : 'escuro'); aplicaTema();
}
aplicaTema();

/* ---------------- progresso ---------------- */
const estudados = () => new Set(lerLS('estudado', []));
const respostas = () => lerLS('resp', {});
const vistos = () => new Set(lerLS('vistos', []));
function progresso(m) { const e = estudados(); const n = m.topicos.length; return n ? Math.round(100 * m.topicos.filter(t => e.has(t.id)).length / n) : 0; }
const blocosDe = (m, tipo) => m.apoio.filter(b => b.tipo === tipo);
const contaQ = m => blocosDe(m, 'questoes').reduce((a, b) => a + (b.itens || []).length, 0);
const contaC = m => blocosDe(m, 'cartoes').reduce((a, b) => a + (b.itens || []).length, 0);

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
const inl = s => limpaHtml(String(s == null ? '' : s), true);

/* ---------------- mapa mental vivo (SVG) ----------------
   Galhos afunilados que saem do centro, cada ramo com cor e ícone; itens em coluna orgânica.
   Na tela: brota ao abrir, destaca o ramo sob o mouse, aproxima no clique, modo "Teste-se". */
const CORES_RAMO = ['#2F7BF6', '#E8468E', '#11A870', '#F76E1E', '#8E5AF2', '#0AA5C2', '#E89A00', '#E5484D'];
const ICONES_RAMO = [
  [/receit|prescri|notifica|talon/, 'prescription'], [/valid|prazo|dias|tempo|data|cronolog/, 'calendar-time'],
  [/dose|posolog|quantid|maxim/, 'scale'], [/intera|cyp|indutor|inibidor/, 'arrows-exchange'],
  [/alerta|risco|cuidado|grave|toxic|advert|evitar|contraind|perig/, 'alert-triangle'], [/\blei\b|norma|rdc|portaria|resolu|legal|regra|anvisa|cff|infra|penal/, 'gavel'],
  [/balc|orienta|dispens|atendimento|cliente|paciente/, 'building-store'], [/mecanism|como age|farmacodin|receptor/, 'atom'],
  [/efeito|advers|reac/, 'activity'], [/crian|pediatr|gestan|idoso|lacta|popula/, 'users'], [/lista|classe|grupo|tipos|exemplo/, 'list-details'],
  [/armazen|temperat|geladeira|frio|termol|conserva/, 'temperature-snow'], [/registro|escritura|sngpc|sncr|sistema|document/, 'file-text'],
  [/indica|uso|tratamento|escolha|terapia/, 'stethoscope'], [/sinal|sintoma|encaminh/, 'first-aid-kit'], [/\bpop\b|procedimento|etapa|passo|ciclo/, 'list-check'],
  [/guarda|armario|chave|seguran/, 'lock'], [/dispositiv|inala|tecnica/, 'spray'], [/rim|renal|diur/, 'droplet'], [/conceito|defini|o que e|base|principio/, 'bulb']
];
const ICONES_RESERVA = ['point', 'circle-dot', 'sparkles', 'bookmark', 'flag', 'star'];
const ICONES_EXTRA = ['book', 'notes', 'clipboard-text', 'pill', 'heartbeat', 'target-arrow', 'layers-intersect', 'puzzle', 'shield-check', 'eye'];
/* ícone por palavra-chave, sem repetir dentro do mesmo mapa */
function iconesMapa(ramos) {
  const usados = new Set();
  return ramos.map((r, i) => {
    const n = semAcento(r.t);
    const cand = ICONES_RAMO.filter(([re]) => re.test(n)).map(x => x[1]).concat(ICONES_EXTRA, ICONES_RESERVA);
    const ic_ = cand.find(c => !usados.has(c)) || ICONES_RESERVA[i % ICONES_RESERVA.length];
    usados.add(ic_); return ic_;
  });
}
const glifo = n => GLIFO[n] ? String.fromCharCode(parseInt(GLIFO[n], 16)) : '';
const medidor = document.createElement('canvas').getContext('2d');
function quebra(texto, fonte, max) {
  medidor.font = fonte;
  const palavras = String(texto).split(/\s+/).filter(Boolean), linhas = [];
  let atual = '';
  palavras.forEach(p => { const t = atual ? atual + ' ' + p : p; if (medidor.measureText(t).width <= max || !atual) atual = t; else { linhas.push(atual); atual = p; } });
  if (atual) linhas.push(atual);
  return { linhas, larg: Math.max(0, ...linhas.map(l => medidor.measureText(l).width)) };
}
function caixa(t, peso, tam, max, padX, padY, sub) {
  const q = quebra(t, `${peso} ${tam}px ${SANS}`, max);
  const lh = Math.round(tam * 1.3);
  let subs = [], larg = q.larg;
  (sub || []).forEach(s => { const r = quebra('• ' + s, `400 12.5px ${SANS}`, max); subs.push(r.linhas); larg = Math.max(larg, r.larg); });
  const nSub = subs.reduce((a, l) => a + l.length, 0);
  return { linhas: q.linhas, subs, tam, peso, lh, w: Math.ceil(larg) + padX * 2, h: q.linhas.length * lh + (nSub ? nSub * 16.5 + 5 : 0) + padY * 2, padX, padY };
}
function textos(c, x, y, cls, meio) {
  let s = '', yy = y + c.padY + c.tam * 0.9;
  const ax = meio ? x + c.w / 2 : x + c.padX;
  c.linhas.forEach(l => { s += `<text x="${ax.toFixed(1)}" y="${yy.toFixed(1)}" font-size="${c.tam}" font-weight="${c.peso}" class="${cls}"${meio ? ' text-anchor="middle"' : ''}>${esc(l)}</text>`; yy += c.lh; });
  if (c.subs.length) { yy += 3; c.subs.forEach(ls => ls.forEach((l, i) => { s += `<text x="${(x + c.padX + (i ? 10 : 0)).toFixed(1)}" y="${yy.toFixed(1)}" font-size="12.5" class="mm-sub">${esc(l)}</text>`; yy += 16.5; })); }
  return s;
}
function desenhaMapa(mapa, m, estatico) {
  const W = 1500, CX = W / 2, GAP_I = 8, GAP_G = 24, DMAX = 120, DMIN = 36;
  const icones = iconesMapa(mapa.ramos || []);
  const ramos = (mapa.ramos || []).map((r, i) => {
    const cor = CORES_RAMO[i % CORES_RAMO.length];
    const no = caixa(r.t, 700, 16.5, 158, 14, 10); no.w += 34; /* espaço do ícone */
    const itens = (r.itens || []).map(it => typeof it === 'string' ? caixa(it, 520, 15, 204, 13, 8) : caixa(it.t, 650, 15, 204, 13, 8, it.itens || []));
    const hI = itens.reduce((a, c) => a + c.h, 0) + Math.max(0, itens.length - 1) * GAP_I;
    return { r, i, cor, no, itens, hI, hG: Math.max(no.h, hI), icone: icones[i] };
  });
  const nDir = Math.ceil(ramos.length / 2);
  const lados = [ramos.slice(0, nDir), ramos.slice(nDir)];
  const hLado = l => l.reduce((a, r) => a + r.hG, 0) + Math.max(0, l.length - 1) * GAP_G;
  const centro = caixa(mapa.centro || mapa.titulo, 750, 21, 210, 22, 16); centro.h += 34; centro.w = Math.max(centro.w, 150);
  const H = Math.max(hLado(lados[0]), hLado(lados[1]), centro.h + 60) + 50;
  const cy = H / 2, cx0 = CX - centro.w / 2, cy0 = cy - centro.h / 2, meiaH = Math.max(1, H / 2 - 30);
  let corpo = '', k = 0, x0 = CX - centro.w / 2, x1 = CX + centro.w / 2;
  const marca = (a, b) => { x0 = Math.min(x0, a); x1 = Math.max(x1, b); };
  lados.forEach((lado, li) => {
    const dir = li === 0, s = dir ? 1 : -1;
    let y = (H - hLado(lado)) / 2;
    lado.forEach(R => {
      const nc = R.no, gy = y;
      const ny = gy + (R.hG - nc.h) / 2, nmy = ny + nc.h / 2;
      const rel = Math.min(1, Math.abs(nmy - cy) / meiaH);
      const dist = DMIN + (DMAX - DMIN) * Math.sqrt(1 - rel * rel); /* contorno de elipse: ramos do alto e de baixo ficam mais perto */
      const nxIn = CX + s * (centro.w / 2 + dist);
      const nx = dir ? nxIn : nxIn - nc.w;
      const p0x = CX + s * centro.w * 0.36, p0y = cy + (nmy - cy) * 0.18, p3x = nxIn, p3y = nmy, mx = (p0x + p3x) / 2;
      const w0 = 9, w1 = 2.5;
      const galho = `M${p0x} ${p0y - w0} C${mx} ${p0y - w0} ${mx} ${p3y - w1} ${p3x} ${p3y - w1} L${p3x} ${p3y + w1} C${mx} ${p3y + w1} ${mx} ${p0y + w0} ${p0x} ${p0y + w0} Z`;
      let fios = '', itens = '';
      let iy = gy + (R.hG - R.hI) / 2;
      const ox = dir ? nx + nc.w : nx, colX = ox + s * 30;
      R.itens.forEach((c, j) => {
        const ix = dir ? colX : colX - c.w, imy = iy + c.h / 2, fx = dir ? ix : ix + c.w, mx2 = (ox + fx) / 2;
        marca(ix, ix + c.w);
        fios += `<path class="mm-fio" d="M${ox} ${nmy} C${mx2} ${nmy} ${mx2} ${imy} ${fx} ${imy}" stroke="${R.cor}"/>`;
        itens += `<g class="mm-item" style="--d:${j}"><rect class="mm-it" x="${ix.toFixed(1)}" y="${iy.toFixed(1)}" width="${c.w}" height="${c.h}" rx="12"/>` +
          `<rect x="${(dir ? ix : ix + c.w - 4).toFixed(1)}" y="${(iy + 7).toFixed(1)}" width="4" height="${Math.max(6, c.h - 14)}" rx="2" fill="${R.cor}"/>` +
          `<circle cx="${fx.toFixed(1)}" cy="${imy.toFixed(1)}" r="4" fill="${R.cor}"/>` + textos(c, ix, iy, 'mm-txt') + `</g>`;
        iy += c.h + GAP_I;
      });
      const icx = nx + 22, icy = nmy, bx = dir ? nx + nc.w : nx;
      marca(nx - 12, nx + nc.w + 12);
      const no = `<g class="mm-no" tabindex="0" role="button" aria-label="${esc(R.r.t)}"><rect x="${nx.toFixed(1)}" y="${ny.toFixed(1)}" width="${nc.w}" height="${nc.h}" rx="${Math.min(22, nc.h / 2)}" fill="${R.cor}"/>` +
        `<circle cx="${icx.toFixed(1)}" cy="${icy.toFixed(1)}" r="14" fill="#fff" fill-opacity=".22"/>` +
        `<text x="${icx.toFixed(1)}" y="${(icy + 6.5).toFixed(1)}" font-size="17" text-anchor="middle" fill="#fff" class="mm-ico">${glifo(R.icone)}</text>` +
        textos({ ...nc, padX: nc.padX + 34 }, nx, ny, 'mm-rotulo') +
        (R.itens.length ? `<g class="mm-conta"><circle cx="${bx.toFixed(1)}" cy="${ny.toFixed(1)}" r="11" class="mm-contaFundo" stroke="${R.cor}" stroke-width="2"/><text x="${bx.toFixed(1)}" y="${(ny + 4.3).toFixed(1)}" font-size="12" font-weight="800" text-anchor="middle" fill="${R.cor}">${R.itens.length}</text></g>` : '') + `</g>`;
      corpo += `<g class="mm-ramo" data-r="${R.i}" style="--k:${R.cor};--i:${k++}"><path class="mm-galho" d="${galho}" fill="${R.cor}"/><g class="mm-itens">${fios}${itens}</g>${no}</g>`;
      y += R.hG + GAP_G;
    });
  });
  const centroSvg = `<g class="mm-centro"><rect x="${cx0}" y="${cy0}" width="${centro.w}" height="${centro.h}" rx="30" fill="${m.cor}"/>` +
    `<rect x="${cx0 + 6}" y="${cy0 + 6}" width="${centro.w - 12}" height="${centro.h - 12}" rx="25" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1.5" stroke-dasharray="3 5"/>` +
    `<text x="${CX}" y="${cy0 + 38}" font-size="24" text-anchor="middle" fill="#fff" class="mm-ico">${glifo(m.icone)}</text>` +
    textos({ ...centro, padY: centro.padY + 28 }, cx0, cy0, 'mm-centroTxt', true) + `</g>`;
  const vx = Math.floor(x0 - 26), vw = Math.ceil(x1 - x0 + 52), vb = `${vx} 0 ${vw} ${Math.ceil(H)}`;
  return `<svg class="mapa-svg${estatico ? ' estatico' : ''}" viewBox="${vb}" data-vb="${vb}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(mapa.titulo)}" style="--cx:${CX - vx}px;--cy:${cy}px">${corpo}${centroSvg}</svg>`;
}
function cartoesMapa(mapa) {
  const icones = iconesMapa(mapa.ramos || []);
  return `<div class="mmCartoes">${(mapa.ramos || []).map((r, i) => {
    const cor = CORES_RAMO[i % CORES_RAMO.length];
    return `<section class="mmCartao" style="--k:${cor};--i:${i}"><header><span class="ic">${ic(icones[i])}</span><h4>${esc(r.t)}</h4><em>${(r.itens || []).length}</em></header><ul>` +
      (r.itens || []).map(it => typeof it === 'string' ? `<li>${esc(it)}</li>` : `<li><b>${esc(it.t)}</b>${(it.itens || []).length ? `<span class="subs">${it.itens.map(s => `<span>${esc(s)}</span>`).join('')}</span>` : ''}</li>`).join('') + `</ul></section>`;
  }).join('')}</div>`;
}
/* zoom, arraste, foco e modo Teste-se */
function animaVB(svg, alvo, ms) {
  const ini = svg.getAttribute('viewBox').split(' ').map(Number), t0 = performance.now();
  const passo = t => { const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3); svg.setAttribute('viewBox', ini.map((v, i) => (v + (alvo[i] - v) * e).toFixed(1)).join(' ')); if (p < 1) requestAnimationFrame(passo); };
  requestAnimationFrame(passo);
  setTimeout(() => svg.setAttribute('viewBox', alvo.map(v => v.toFixed(1)).join(' ')), ms + 120); /* garante o fim mesmo com a aba em segundo plano */
}
const vbBase = svg => svg.dataset.vb.split(' ').map(Number);
function zoom(svg, f, px, py) {
  const vb = svg.getAttribute('viewBox').split(' ').map(Number), base = vbBase(svg);
  const w = Math.min(base[2] * 1.05, Math.max(base[2] / 6, vb[2] * f)), r = w / vb[2], h = vb[3] * r;
  const ax = px == null ? vb[0] + vb[2] / 2 : px, ay = py == null ? vb[1] + vb[3] / 2 : py;
  svg.setAttribute('viewBox', [ax - (ax - vb[0]) * r, ay - (ay - vb[1]) * r, w, h].map(v => v.toFixed(1)).join(' '));
}
function pontoSvg(svg, e) { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); }
function solta(svg) { $$('.mm-ramo.fixo', svg).forEach(r => r.classList.remove('fixo')); svg.classList.remove('foco'); animaVB(svg, vbBase(svg), 600); }
function ativaMapa(fig) {
  const svg = $('svg.mapa-svg', fig); if (!svg) return;
  let arr = null, moveu = false;
  svg.addEventListener('pointerdown', e => { if (e.button) return; arr = { x: e.clientX, y: e.clientY, vb: svg.getAttribute('viewBox').split(' ').map(Number) }; moveu = false; });
  svg.addEventListener('pointermove', e => {
    if (!arr) return;
    const dx = e.clientX - arr.x, dy = e.clientY - arr.y;
    if (!moveu && Math.hypot(dx, dy) < 6) return;
    if (!moveu) { moveu = true; svg.classList.add('arrastando'); try { svg.setPointerCapture(e.pointerId); } catch (x) { /* ok */ } }
    const f = arr.vb[2] / svg.clientWidth;
    svg.setAttribute('viewBox', [arr.vb[0] - dx * f, arr.vb[1] - dy * f, arr.vb[2], arr.vb[3]].join(' '));
  });
  const fim = () => { arr = null; svg.classList.remove('arrastando'); };
  svg.addEventListener('pointerup', fim); svg.addEventListener('pointercancel', fim);
  svg.addEventListener('wheel', e => { if (!(e.ctrlKey || e.metaKey || fig.closest('.veu'))) return; e.preventDefault(); const p = pontoSvg(svg, e); zoom(svg, e.deltaY > 0 ? 1.12 : 1 / 1.12, p.x, p.y); }, { passive: false });
  svg.addEventListener('click', e => {
    if (moveu) { moveu = false; return; }
    const ramo = e.target.closest('.mm-ramo'), no = e.target.closest('.mm-no');
    if (no && ramo) {
      if (svg.classList.contains('revisao') && !ramo.classList.contains('revelado')) { ramo.classList.add('revelado'); return; }
      const ja = ramo.classList.contains('fixo');
      if (ja) { solta(svg); return; }
      $$('.mm-ramo.fixo', svg).forEach(r => r.classList.remove('fixo'));
      ramo.classList.add('fixo'); svg.classList.add('foco');
      const b = ramo.getBBox(), pad = 40, base = vbBase(svg), asp = base[3] / base[2];
      let w = Math.max(b.width + pad * 2, 720), h = w * asp; if (h < b.height + pad * 2) { h = b.height + pad * 2; w = h / asp; }
      animaVB(svg, [b.x + b.width / 2 - w / 2, b.y + b.height / 2 - h / 2, w, h], 650);
    } else if (svg.classList.contains('foco')) solta(svg);
  });
  svg.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.mm-no')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
}
function acaoMapa(fig, ac) {
  const svg = $('svg.mapa-svg', fig);
  if (ac === 'mais') zoom(svg, 1 / 1.3);
  else if (ac === 'menos') zoom(svg, 1.3);
  else if (ac === 'ajusta') solta(svg);
  else if (ac === 'teste') {
    const on = !svg.classList.contains('revisao');
    svg.classList.toggle('revisao', on); fig.classList.toggle('revisao', on);
    $$('.mm-ramo', svg).forEach(r => r.classList.remove('revelado')); $$('.mmCartao', fig).forEach(r => r.classList.remove('revelado'));
    $('[data-mapa="teste"]', fig).setAttribute('aria-pressed', on);
    if (on) aviso('Itens escondidos. Lembre o que vem em cada ramo e toque nele para conferir.');
  } else if (ac === 'vista') {
    const cartoes = fig.classList.toggle('vistaCartoes');
    $('[data-mapa="vista"]', fig).innerHTML = cartoes ? `${ic('sitemap')}<span>Ver como mapa</span>` : `${ic('layout-cards')}<span>Ver em cartões</span>`;
    gravarLS('vistaMapa', cartoes ? 'cartoes' : 'mapa');
  } else if (ac === 'cheio') abreMapaCheio(fig);
}
function abreMapaCheio(fig) {
  const m = moduloAtual(), mp = m.mapas.find(x => x.id === fig.id);
  fechaCamadas();
  const v = document.createElement('div');
  v.className = 'veu cheio';
  v.innerHTML = `<div class="mapaGrande mapaCard" id="${esc(mp.id)}"><div class="barraG"><span class="ic">${ic('sitemap')}</span><h2>${esc(mp.titulo)}</h2>${botoesMapa(true)}<button class="bt sec mini" data-fecha>${ic('x')} Fechar</button></div>` +
    `<div class="area">${desenhaMapa(mp, m)}</div><p class="dicaMapa">Roda do mouse aproxima, arraste para mover, clique num ramo para focar.</p></div>`;
  document.body.appendChild(v);
  ativaMapa($('.mapaGrande', v));
  $('[data-fecha]', v).onclick = () => v.remove();
}
function botoesMapa(cheio, cartoes) {
  return `<div class="mmBotoes"><button data-mapa="teste" aria-pressed="false" title="Esconde os itens: tente lembrar e toque no ramo">${ic('eye-off')}<span>Teste-se</span></button>` +
    `<span class="soMapa"><button data-mapa="menos" title="Afastar">${ic('zoom-out')}</button><button data-mapa="mais" title="Aproximar">${ic('zoom-in')}</button><button data-mapa="ajusta" title="Ver o mapa inteiro">${ic('focus-centered')}</button>` +
    (cheio ? '' : `<button data-mapa="cheio" title="Tela cheia">${ic('arrows-maximize')}<span>Tela cheia</span></button>`) + `</span>` +
    (cheio ? '' : `<button data-mapa="vista">${cartoes ? `${ic('sitemap')}<span>Ver como mapa</span>` : `${ic('layout-cards')}<span>Ver em cartões</span>`}</button>`) + `</div>`;
}

/* ---------------- blocos de apoio ---------------- */
const TIPOS = {
  tabela: { nome: 'Tabela', plural: 'Tabelas', ic: 'table' }, quadro: { nome: 'Quadro', plural: 'Quadros', ic: 'layout-list' },
  checklist: { nome: 'Checklist', plural: 'Checklists', ic: 'list-check' }, fluxo: { nome: 'Fluxo', plural: 'Fluxos', ic: 'git-fork' },
  cartoes: { nome: 'Cartões de revisão', plural: 'Cartões', ic: 'cards' }, questoes: { nome: 'Questões', plural: 'Questões', ic: 'help-circle' },
  receita: { nome: 'Modelo de receita', plural: 'Receitas', ic: 'prescription' }, pop: { nome: 'POP', plural: 'POPs', ic: 'file-text' }
};
const LETRAS = 'ABCDE';
const posQ = {}, posC = {};
function blocoCorpo(b, imp) {
  switch (b.tipo) {
    case 'tabela':
      return `<div class="tab"><table><thead><tr>${(b.colunas || []).map(c => `<th>${inl(c)}</th>`).join('')}</tr></thead><tbody>` +
        (b.linhas || []).map(l => `<tr>${l.map(c => `<td>${inl(c)}</td>`).join('')}</tr>`).join('') + `</tbody></table></div>` + (b.nota ? `<p class="nota">${inl(b.nota)}</p>` : '');
    case 'quadro': return `<div class="conteudo" data-edit="bloco:${b.id}:html">${b.html || ''}</div>`;
    case 'checklist': {
      const marc = lerLS('check', {})[b.id] || [];
      return `<ul class="check">${(b.itens || []).map((t, i) => imp ? `<li><label><span class="cx-q"></span><span>${inl(t)}</span></label></li>`
        : `<li><label><input type="checkbox" data-check="${b.id}:${i}" ${marc.includes(i) ? 'checked' : ''}><span>${inl(t)}</span></label></li>`).join('')}</ul>`;
    }
    case 'fluxo':
      return `<div class="fluxo">${(b.passos || []).map((p, i) => (i ? '<div class="seta"></div>' : '') + `<div class="passo ${esc(p.tipo || 'acao')}">${inl(p.t)}` +
        (p.tipo === 'decisao' && (p.sim || p.nao) ? `<div class="saidas"><div class="sim"><b>Sim</b>${inl(p.sim)}</div><div class="nao"><b>Não</b>${inl(p.nao)}</div></div>` : '') + `</div>`).join('')}</div>`;
    case 'cartoes':
      if (imp) return `<table class="t flash-imp"><thead><tr><th style="width:45%">Pergunta</th><th>Resposta</th></tr></thead><tbody>${(b.itens || []).map(c => `<tr><td>${inl(c.f)}</td><td>${inl(c.v)}</td></tr>`).join('')}</tbody></table>`;
      return `<div class="flash" data-flash="${b.id}">${cartaHtml(b)}</div>`;
    case 'questoes':
      if (imp) return (b.itens || []).map((q, i) => `<div class="questao"><p class="enun"><b>${i + 1}.</b> ${inl(q.p)}</p><div class="alts">${(q.alt || []).map((a, j) => `<div class="alt"><span class="let">${LETRAS[j]}</span><span class="tx">${inl(a)}</span></div>`).join('')}</div></div>`).join('') +
        `<div class="gabarito"><b>Gabarito comentado</b><ol>${(b.itens || []).map(q => `<li><b>${LETRAS[q.c]}</b>. ${inl(q.com)}</li>`).join('')}</ol></div>`;
      return `<div class="quiz" data-quiz="${b.id}">${questaoHtml(b)}</div>`;
    case 'receita':
      return `<div class="receita ${esc(b.cor || 'branca')}"><div class="rc-topo"><div><b>${esc(b.titulo)}</b><span>${esc(b.subtitulo || '')}</span></div><div class="rc-num">Nº ________<br><small>${esc(b.numeracao || '')}</small></div></div>` +
        (b.secoes || []).map(s => `<div class="rc-sec"><b>${esc(s.t)}</b>${(s.campos || []).map(c => `<div class="rc-campo"><span>${esc(c)}:</span><i></i></div>`).join('')}</div>`).join('') + `</div>` +
        ((b.regras || []).length ? `<div class="tab rc-regras"><table><thead><tr><th>Regra</th><th>Como é</th></tr></thead><tbody>${b.regras.map(r => `<tr><td><b>${inl(r[0])}</b></td><td>${inl(r[1])}</td></tr>`).join('')}</tbody></table></div>` : '') +
        (b.obs ? `<p class="rc-obs">${inl(b.obs)}</p>` : '');
    case 'pop': {
      const lista = (rot, xs, ord) => (xs && xs.length) ? `<div class="pop-sec"><b>${rot}</b><${ord ? 'ol' : 'ul'}>${xs.map(x => `<li>${inl(x)}</li>`).join('')}</${ord ? 'ol' : 'ul'}></div>` : '';
      return `<div class="pop"><div class="pop-cab"><div class="logo">Logotipo e nome<br>do estabelecimento</div><div class="tit"><small>Procedimento operacional padrão</small><b>${esc(b.titulo)}</b></div>` +
        `<div class="meta">Código: <b>${esc(b.codigo || '')}</b><br>Versão: ____<br>Emissão: ___/___/____<br>Revisão: ___/___/____</div></div>` +
        (b.objetivo ? `<div class="pop-sec"><b>Objetivo</b>${inl(b.objetivo)}</div>` : '') + (b.abrangencia ? `<div class="pop-sec"><b>Abrangência</b>${inl(b.abrangencia)}</div>` : '') +
        lista('Responsáveis', b.responsaveis) + lista('Materiais', b.materiais) + lista('Procedimento', b.procedimento, true) + lista('Cuidados', b.cuidados) + lista('Registros', b.registros) + lista('Referências', b.referencias) +
        `<div class="pop-ass"><div>Elaborado por:</div><div>Revisado por:</div><div>Aprovado por (farmacêutico RT):</div></div></div>`;
    }
    default: return `<p>Tipo de bloco desconhecido.</p>`;
  }
}
function pontos(n, at, cls) { return `<div class="pontos">${Array.from({ length: n }, (_, i) => `<i class="${cls(i)}${i === at ? ' at' : ''}"></i>`).join('')}</div>`; }
function cartaHtml(b) {
  const n = (b.itens || []).length; if (!n) return '';
  const i = Math.min(posC[b.id] || 0, n - 1), c = b.itens[i], vis = vistos();
  return `<div class="flashTopo"><span>Cartão ${i + 1} de ${n}</span><span>${[...vis].filter(x => x.startsWith(b.id + ':')).length} revisados</span></div>` +
    `<button class="carta" type="button" data-virar><div class="in"><div class="face frente"><div class="rot">Pergunta</div><div class="cont">${inl(c.f)}</div><div class="dica">Toque para ver a resposta</div></div>` +
    `<div class="face verso"><div class="rot">Resposta</div><div class="cont">${inl(c.v)}</div><div class="dica">Toque para voltar</div></div></div></button>` +
    `<div class="navQ"><button class="bt sec mini" data-cnav="-1" ${i ? '' : 'disabled'}>${ic('arrow-left')} Anterior</button>${pontos(n, i, k => vis.has(b.id + ':' + k) ? 'v' : '')}<button class="bt mini" data-cnav="1" ${i < n - 1 ? '' : 'disabled'}>Próximo ${ic('arrow-right')}</button></div>`;
}
function questaoHtml(b) {
  const n = (b.itens || []).length; if (!n) return '';
  const i = Math.min(posQ[b.id] || 0, n - 1), q = b.itens[i], R = respostas(), r = R[b.id + ':' + i];
  const feitas = Object.keys(R).filter(k => k.startsWith(b.id + ':')), certas = feitas.filter(k => { const x = b.itens[+k.split(':')[1]]; return x && R[k] === x.c; }).length;
  return `<div class="qTopo"><span class="qNum">Questão ${i + 1} de ${n}</span><span class="qPlacar">${feitas.length ? `${certas} de ${feitas.length} certas` : 'Responda para ver o comentário'}</span></div>` +
    `<p class="enun">${inl(q.p)}</p><div class="alts">${q.alt.map((a, j) => {
      const cls = r == null ? '' : j === q.c ? ' certa' : j === r ? ' errada' : '';
      return `<button type="button" class="alt${cls}" data-alt="${j}" ${r == null ? '' : 'disabled'}><span class="let">${LETRAS[j]}</span><span class="tx">${inl(a)}</span></button>`;
    }).join('')}</div>` +
    (r == null ? '' : `<div class="coment ${r === q.c ? 'ok' : 'er'}"><b>${r === q.c ? 'Resposta certa.' : `Resposta: ${LETRAS[q.c]}.`}</b>${inl(q.com)}</div>`) +
    `<div class="navQ"><button class="bt sec mini" data-qnav="-1" ${i ? '' : 'disabled'}>${ic('arrow-left')} Anterior</button>${pontos(n, i, k => { const x = R[b.id + ':' + k]; return x == null ? '' : x === b.itens[k].c ? 'ok' : 'er'; })}<button class="bt mini" data-qnav="1" ${i < n - 1 ? '' : 'disabled'}>Próxima ${ic('arrow-right')}</button></div>`;
}
function blocoHtml(b, i, n, imp) {
  const t = TIPOS[b.tipo] || { nome: b.tipo, ic: 'box' };
  return `<section class="bloco b-${esc(b.tipo)}" id="${esc(b.id)}" data-tipo="${esc(b.tipo)}"><header><span class="ic">${ic(t.ic)}</span><h2>${esc(b.titulo || t.nome)}</h2>` +
    (imp ? '' : `<span class="tipo">${esc(t.nome)}</span><span class="ctl"><button title="Editar" data-acao="bloco-editar" data-id="${b.id}">${ic('pencil')}</button><button title="Subir" data-acao="bloco-subir" data-id="${b.id}" ${i ? '' : 'disabled'}>${ic('arrow-up')}</button><button title="Descer" data-acao="bloco-descer" data-id="${b.id}" ${i < n - 1 ? '' : 'disabled'}>${ic('arrow-down')}</button><button class="del" title="Excluir" data-acao="bloco-excluir" data-id="${b.id}">${ic('trash')}</button></span>`) +
    `</header>${blocoCorpo(b, imp)}</section>`;
}

/* ---------------- moldura: barra lateral, celular ---------------- */
const app = () => $('#conteudo');
function moduloAtual() { const p = location.hash.slice(2).split('/'); return mod(p[0]); }
function itemModulo(m, atual) {
  const p = progresso(m);
  return `<a class="aba" href="#/${m.id}/resumo" style="--c:${m.cor}" ${m.id === atual ? 'aria-current="true"' : ''}>${ic(m.icone)}<span>${esc(m.curto || m.titulo)}</span><em class="pct">${p ? p + '%' : ''}</em></a>`;
}
function moldura(atual) {
  $('#abas').innerHTML = `<a class="aba" href="#/" style="--c:var(--marca)" ${atual ? '' : 'aria-current="true"'}>${ic('home')}<span>Início</span></a>` +
    `<div class="navGrupo">Módulos</div>` + DADOS.modulos.map(m => itemModulo(m, atual)).join('');
  document.body.classList.toggle('sos-leitura', !podeEditar);
  $('#bt-editar').classList.toggle('on', editando);
  $('#bt-editar span').textContent = editando ? 'Editando' : 'Editar';
  $('#bt-salvar').classList.toggle('alerta', alterado);
  $('#bt-salvar .ponto').hidden = !alterado;
  const m = atual && mod(atual);
  $$('#barra button').forEach(b => b.removeAttribute('aria-current'));
  $(`#barra [data-b="${m ? 'modulos' : 'inicio'}"]`).setAttribute('aria-current', 'true');
  $('#barra [data-b="modulos"]').style.setProperty('--c', m ? m.cor : 'var(--c-indigo)');
}
function faixaAlterado() { return alterado ? `<div class="faixa">${ic('alert-triangle')}<span>Há alterações guardadas só neste navegador. Grave no arquivo para não perder.</span><button class="bt mini" data-acao="salvar">${ic('device-floppy')} Salvar arquivo</button></div>` : ''; }
function gaveta(tipo) {
  fechaCamadas();
  const veu = document.createElement('div'); veu.className = 'veu'; veu.style.zIndex = 85;
  const g = document.createElement('div'); g.className = 'gaveta';
  const fecha = () => { veu.remove(); g.remove(); };
  veu.onclick = fecha;
  g.innerHTML = `<div class="puxa"></div>` + (tipo === 'modulos'
    ? `<a class="aba" href="#/" style="--c:var(--marca)">${ic('home')}<span>Início</span></a>` + DADOS.modulos.map(m => itemModulo(m, (moduloAtual() || {}).id)).join('')
    : `<div class="gradeMais">${[['pdf', 'file-type-pdf', 'Gerar PDF'], ['editar', 'pencil', editando ? 'Sair da edição' : 'Editar'], ['salvar', 'device-floppy', 'Salvar arquivo'], ['tema', 'moon', 'Tema'], ['ajustes', 'settings', 'Ajustes'], ['buscar', 'search', 'Buscar']]
      .filter(([a]) => podeEditar || (a !== 'editar' && a !== 'salvar')).map(([a, i, r]) => `<button data-mais="${a}">${ic(i)}${r}</button>`).join('')}</div>`);
  g.addEventListener('click', e => { if (e.target.closest('a')) fecha(); const b = e.target.closest('[data-mais]'); if (b) { fecha(); acaoGeral(b.dataset.mais); } });
  document.body.append(veu, g);
}
function acaoGeral(a) {
  if (a === 'pdf') janelaPdf(); else if (a === 'editar') alternaEdicao(); else if (a === 'salvar') salvarArquivo();
  else if (a === 'tema') trocaTema(); else if (a === 'ajustes') ajustes(); else if (a === 'buscar') abreBusca();
}

/* ---------------- início ---------------- */
function anel(pct, tam) {
  const r = (tam - 16) / 2, c = 2 * Math.PI * r;
  return `<svg width="${tam}" height="${tam}" viewBox="0 0 ${tam} ${tam}"><circle cx="${tam / 2}" cy="${tam / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="12"/>` +
    `<circle class="arco" cx="${tam / 2}" cy="${tam / 2}" r="${r}" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${c.toFixed(1)}" data-alvo="${(c * (1 - pct / 100)).toFixed(1)}"/></svg>`;
}
function telaInicio() {
  document.body.style.cssText = '';
  moldura(null);
  const e = estudados(), R = respostas(), V = vistos();
  const totT = DADOS.modulos.reduce((a, m) => a + m.topicos.length, 0), feitosT = DADOS.modulos.reduce((a, m) => a + m.topicos.filter(t => e.has(t.id)).length, 0);
  const totQ = DADOS.modulos.reduce((a, m) => a + contaQ(m), 0), totC = DADOS.modulos.reduce((a, m) => a + contaC(m), 0);
  let nResp = 0, certas = 0;
  DADOS.modulos.forEach(m => blocosDe(m, 'questoes').forEach(b => (b.itens || []).forEach((q, i) => { const x = R[b.id + ':' + i]; if (x != null) { nResp++; if (x === q.c) certas++; } })));
  const nV = DADOS.modulos.reduce((a, m) => a + blocosDe(m, 'cartoes').reduce((s, b) => s + (b.itens || []).filter((_, i) => V.has(b.id + ':' + i)).length, 0), 0);
  const nMapas = DADOS.modulos.reduce((a, m) => a + m.mapas.length, 0);
  const nModelos = DADOS.modulos.reduce((a, m) => a + blocosDe(m, 'receita').length + blocosDe(m, 'pop').length, 0);
  const proxM = DADOS.modulos.find(m => m.topicos.some(t => !e.has(t.id))) || DADOS.modulos[0];
  const proxT = proxM.topicos.find(t => !e.has(t.id)) || proxM.topicos[0];
  const pct = totT ? Math.round(100 * feitosT / totT) : 0, comecou = feitosT > 0;
  const faltam = proxM.topicos.filter(t => !e.has(t.id)).length;
  const modModelo = DADOS.modulos.find(m => blocosDe(m, 'receita').length) || DADOS.modulos[0];
  app().innerHTML = faixaAlterado() + `<div class="vIni anima">` +
    `<section class="vHero" style="--k:${proxM.cor}"><span class="bola b1"></span><span class="bola b2"></span><span class="bola b3"></span>` +
    `<div class="txt"><small>${ic(proxM.icone)} ${comecou ? 'Continue de onde parou' : 'Comece por aqui'} · Módulo ${proxM.num}</small><h2>${esc(proxT.titulo)}</h2>` +
    `<p>${esc(proxM.titulo)}: ${faltam === 1 ? 'falta 1 tópico' : `faltam ${faltam} tópicos`} neste módulo.</p>` +
    `<div class="linhaBt"><a class="bt" href="#/${proxM.id}/resumo/${proxT.id}">${ic('book')} ${comecou ? 'Continuar leitura' : 'Começar leitura'}</a><a class="bt sec" href="#/${proxM.id}/mapa">${ic('sitemap')} Mapa mental</a></div></div>` +
    `<div class="vAnel">${anel(pct, 150)}<div class="val"><b>${pct}%</b><span>do material</span></div></div></section>` +
    `<section class="vMeta"><h3>Seu progresso</h3>` +
    [['var(--c-violeta)', 'book', 'Tópicos estudados', feitosT, totT], ['var(--c-azul)', 'help-circle', 'Questões respondidas', nResp, totQ], ['var(--c-ambar)', 'cards', 'Cartões revisados', nV, totC]]
      .map(([k, i, r, a, b]) => `<div class="metaItem" style="--k:${k}"><span class="ic">${ic(i)}</span><div><b>${r}</b><div class="barra"><i style="width:${b ? Math.round(100 * a / b) : 0}%"></i></div></div><em>${a}/${b}</em></div>`).join('') +
    `<p class="rodape">${ic('device-mobile')} O progresso fica salvo neste aparelho.</p></section>` +
    `<div class="vStats">` +
    `<a class="vStat" href="#/${proxM.id}/resumo" style="--k:var(--c-violeta)"><span class="ic">${ic('book')}</span><div><b>${totT}</b><span>tópicos de leitura</span></div></a>` +
    `<a class="vStat" href="#/${proxM.id}/mapa" style="--k:var(--c-rosa)"><span class="ic">${ic('sitemap')}</span><div><b>${nMapas}</b><span>mapas mentais</span></div></a>` +
    `<a class="vStat" href="#/${proxM.id}/apoio" style="--k:var(--c-azul)"><span class="ic">${ic('target-arrow')}</span><div><b>${nResp ? Math.round(100 * certas / nResp) + '%' : totQ}</b><span>${nResp ? `de acerto em ${nResp} respostas` : 'questões comentadas'}</span></div></a>` +
    `<a class="vStat" href="#/${modModelo.id}/apoio" style="--k:var(--c-verde)"><span class="ic">${ic('prescription')}</span><div><b>${nModelos}</b><span>modelos de receita e POPs</span></div></a></div>` +
    `<div class="vTit"><span class="ti ti-layout-grid"></span><h3>Módulos</h3><small>resumo, mapas mentais e material de apoio em cada um</small></div>` +
    `<div class="listaL">${DADOS.modulos.map(m => `<a class="itemL" href="#/${m.id}/resumo" style="--k:${m.cor}"><div class="topo"><span class="ic">${ic(m.icone)}</span><div><div class="num">Módulo ${m.num}</div><h3>${esc(m.titulo)}</h3></div></div>` +
      `<div class="conta"><span class="pil" title="Tópicos">${ic('book')} ${m.topicos.length}</span><span class="pil" title="Mapas mentais">${ic('sitemap')} ${m.mapas.length}</span><span class="pil" title="Questões">${ic('help-circle')} ${contaQ(m)}</span><span class="pil" title="Cartões">${ic('cards')} ${contaC(m)}</span></div>` +
      `<div class="rod"><div class="barra"><i style="width:${progresso(m)}%"></i></div>${progresso(m)}%</div></a>`).join('')}</div></div>`;
  $$('.vIni > *').forEach((el, i) => el.style.setProperty('--i', i));
  $$('.listaL > *').forEach((el, i) => { el.style.animation = `sobe .5s var(--suave) ${200 + i * 35}ms both`; });
  requestAnimationFrame(() => requestAnimationFrame(() => { $$('.arco[data-alvo]').forEach(a => a.setAttribute('stroke-dashoffset', a.dataset.alvo)); }));
}

/* ---------------- módulo ---------------- */
function cabModulo(m, aba) {
  const n = { resumo: m.topicos.length, mapa: m.mapas.length, apoio: m.apoio.length };
  return faixaAlterado() + `<header id="pgTitulo"><span class="selo">${ic(m.icone)}</span><h1 data-edit="mod:${m.id}:titulo">${esc(m.titulo)}</h1>` +
    `<p>Módulo ${m.num} · ${plural(m.topicos.length, 'tópico', 'tópicos')} · ${plural(m.mapas.length, 'mapa mental', 'mapas mentais')} · ${plural(contaQ(m), 'questão', 'questões')}</p>` +
    `<div class="acoes"><button class="bt sec mini" data-acao="pdf">${ic('file-type-pdf')} PDF</button></div></header>` +
    `<div class="barraMod"><nav class="tabs2">` + [['resumo', 'book', 'Resumo', 'Resumo'], ['mapa', 'sitemap', 'Mapas mentais', 'Mapas'], ['apoio', 'folders', 'Material de apoio', 'Apoio']].map(([k, i, r, c]) =>
      `<a href="#/${m.id}/${k}" ${aba === k ? 'aria-current="true"' : ''}>${ic(i)} <span class="lg">${r}</span><span class="ct">${c}</span> <span class="n">${n[k]}</span></a>`).join('') + `</nav></div>`;
}
function barraEdicao() {
  return `<div class="edBarra" id="ed-barra"><button data-cmd="bold" title="Negrito">${ic('bold')}</button><button data-cmd="italic" title="Itálico">${ic('italic')}</button>` +
    `<button data-cmd="h3">${ic('heading')} Subtítulo</button><button data-cmd="p">Parágrafo</button><button data-cmd="insertUnorderedList" title="Lista">${ic('list')}</button><button data-cmd="insertOrderedList" title="Lista numerada">${ic('list-numbers')}</button><span class="sep"></span>` +
    `<button data-cx="chave">Ponto-chave</button><button data-cx="alerta">Atenção</button><button data-cx="balcao">No balcão</button><button data-cx="lei">Norma</button><button data-cx="exemplo">Caso</button><span class="sep"></span>` +
    `<button data-cmd="tabela">${ic('table')} Tabela</button><button data-cmd="removeFormat" title="Limpar formatação">${ic('clear-formatting')}</button><span class="dica">Clique no texto para editar</span></div>`;
}
function telaResumo(m, alvo) {
  const e = estudados(), nQ = contaQ(m), nC = contaC(m);
  const blocoQ = blocosDe(m, 'questoes')[0], blocoC = blocosDe(m, 'cartoes')[0];
  app().innerHTML = cabModulo(m, 'resumo') + (editando ? barraEdicao() : '') +
    `<div class="leitor"><article class="folha"><p class="dek" data-edit="mod:${m.id}:escopo">${esc(m.escopo)}</p>` +
    m.topicos.map((t, i) => `<section class="topico" id="${esc(t.id)}"><header><h2 data-edit="top:${t.id}:titulo">${esc(t.titulo)}</h2>` +
      `<span class="ctl"><button title="Subir" data-acao="top-subir" data-id="${t.id}" ${i ? '' : 'disabled'}>${ic('arrow-up')}</button><button title="Descer" data-acao="top-descer" data-id="${t.id}" ${i < m.topicos.length - 1 ? '' : 'disabled'}>${ic('arrow-down')}</button><button class="del" title="Excluir tópico" data-acao="top-excluir" data-id="${t.id}">${ic('trash')}</button></span></header>` +
      `<div class="conteudo" data-edit="top:${t.id}:resumo">${t.resumo}</div>` +
      `<div class="fimTop"><button class="estudado ${e.has(t.id) ? 'on' : ''}" data-acao="estudado" data-id="${t.id}">${ic(e.has(t.id) ? 'circle-check' : 'check')} ${e.has(t.id) ? 'Estudado' : 'Marcar como estudado'}</button></div></section>`).join('') +
    `<div class="edNovo"><button class="bt sec" data-acao="top-novo">${ic('plus')} Novo tópico</button></div>` +
    (m.fontes.length ? `<section class="fontesL"><h4>Fontes consultadas</h4><ol>${m.fontes.map(f => `<li>${inl(f)}</li>`).join('')}</ol></section>` : '') + `</article>` +
    `<aside class="lado"><section class="card"><h3>${ic('chart-donut')} Progresso do módulo</h3><div class="progMini"><div class="barra"><i style="width:${progresso(m)}%"></i></div><span>${progresso(m)}%</span></div></section>` +
    `<section class="card tocCard"><h3>${ic('list')} Neste módulo</h3><nav class="toc">${m.topicos.map(t => `<a href="#/${m.id}/resumo/${t.id}" data-toc="${t.id}">${e.has(t.id) ? ic('circle-check') : ''}<span>${esc(t.titulo)}</span></a>`).join('')}</nav></section>` +
    `<section class="card"><h3>${ic('bolt')} Praticar o tema</h3><div class="praticar">` +
    (m.mapas.length ? `<a href="#/${m.id}/mapa" style="--k:var(--c-rosa)">${ic('sitemap')} ${plural(m.mapas.length, 'mapa mental', 'mapas mentais')}</a>` : '') +
    (blocoQ ? `<a href="#/${m.id}/apoio/${blocoQ.id}" style="--k:var(--c-azul)">${ic('help-circle')} ${plural(nQ, 'questão', 'questões')}</a>` : '') +
    (blocoC ? `<a href="#/${m.id}/apoio/${blocoC.id}" style="--k:color-mix(in srgb,var(--c-ambar) 80%,#000)">${ic('cards')} ${plural(nC, 'cartão', 'cartões')}</a>` : '') +
    `</div></section></aside></div><div class="progTopo"><i></i></div>`;
  ativaEdicao(); espiaLeitura();
  if (alvo) { const el = document.getElementById(alvo); if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40); }
}
let espia = null;
function espiaLeitura() {
  if (espia) espia.disconnect();
  const secs = $$('.topico'); if (!secs.length || !window.IntersectionObserver) return;
  espia = new IntersectionObserver(ents => ents.forEach(en => { if (en.isIntersecting) $$('.toc a').forEach(a => a.classList.toggle('on', a.dataset.toc === en.target.id)); }), { rootMargin: '-15% 0px -75% 0px' });
  secs.forEach(s => espia.observe(s));
}
window.addEventListener('scroll', () => { const b = $('.progTopo i'); if (!b) return; const h = document.documentElement; b.style.width = Math.min(100, 100 * h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)) + '%'; }, { passive: true });

function figuraMapa(mp, m, i, n, imp) {
  const pref = lerLS('vistaMapa', '');
  const cartoes = !imp && (pref === 'cartoes' || (pref === '' && innerWidth < 700));
  const nItens = (mp.ramos || []).reduce((a, r) => a + (r.itens || []).length, 0);
  return `<figure class="mapaCard${cartoes ? ' vistaCartoes' : ''}" id="${esc(mp.id)}"><header><span class="ic">${ic('sitemap')}</span><div class="tit"><h2>${esc(mp.titulo)}</h2><small>${plural((mp.ramos || []).length, 'ramo', 'ramos')} · ${plural(nItens, 'item', 'itens')}</small></div>` +
    (imp ? '' : `<span class="ctl"><button title="Editar mapa" data-acao="mapa-editar" data-id="${mp.id}">${ic('pencil')}</button><button title="Subir" data-acao="mapa-subir" data-id="${mp.id}" ${i ? '' : 'disabled'}>${ic('arrow-up')}</button><button title="Descer" data-acao="mapa-descer" data-id="${mp.id}" ${i < n - 1 ? '' : 'disabled'}>${ic('arrow-down')}</button><button class="del" title="Excluir mapa" data-acao="mapa-excluir" data-id="${mp.id}">${ic('trash')}</button></span>`) +
    `</header>` + (imp ? '' : botoesMapa(false, cartoes)) +
    `<div class="mapa-rolo">${desenhaMapa(mp, m, imp)}</div>${imp ? '' : cartoesMapa(mp) + `<p class="dicaMapa">Clique num ramo para aproximar; Ctrl ou Cmd com a roda do mouse dá zoom; arraste para mover.</p>`}</figure>`;
}
function telaMapa(m) {
  app().innerHTML = cabModulo(m, 'mapa') + (m.mapas.length > 1 ? `<div class="chips pulaMapa">${m.mapas.map(mp => `<button class="chip" data-pula="${mp.id}">${ic('sitemap')} ${esc(mp.titulo)}</button>`).join('')}</div>` : '') +
    m.mapas.map((mp, i) => figuraMapa(mp, m, i, m.mapas.length)).join('') +
    `<div class="edNovo"><button class="bt sec" data-acao="mapa-novo">${ic('plus')} Novo mapa mental</button></div>`;
  $$('.mapaCard').forEach(ativaMapa);
  ativaEdicao();
}
let filtroApoio = 'todos';
function telaApoio(m, alvo) {
  const tipos = [...new Set(m.apoio.map(b => b.tipo))];
  if (filtroApoio !== 'todos' && !tipos.includes(filtroApoio)) filtroApoio = 'todos';
  if (alvo) { const b = m.apoio.find(x => x.id === alvo); if (b && b.tipo !== filtroApoio) filtroApoio = 'todos'; }
  app().innerHTML = cabModulo(m, 'apoio') + (editando ? barraEdicao() : '') +
    `<div class="chips filtroA"><button class="chip" data-filtro="todos" aria-pressed="${filtroApoio === 'todos'}">Tudo <span class="n">${m.apoio.length}</span></button>` +
    tipos.map(t => `<button class="chip" data-filtro="${t}" aria-pressed="${filtroApoio === t}">${ic(TIPOS[t].ic)} ${TIPOS[t].plural} <span class="n">${m.apoio.filter(b => b.tipo === t).length}</span></button>`).join('') + `</div>` +
    `<div class="anima">` + m.apoio.map((b, i) => (filtroApoio === 'todos' || b.tipo === filtroApoio) ? blocoHtml(b, i, m.apoio.length) : '').join('') + `</div>` +
    `<div class="edNovo"><select id="novo-tipo">${Object.entries(TIPOS).map(([k, v]) => `<option value="${k}">${v.nome}</option>`).join('')}</select><button class="bt sec" data-acao="bloco-novo">${ic('plus')} Novo bloco</button></div>`;
  $$('.anima > *').forEach((el, i) => el.style.setProperty('--i', Math.min(i, 8)));
  ativaEdicao();
  if (alvo) { const el = document.getElementById(alvo); if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40); }
}

/* ---------------- busca ---------------- */
let indice = null;
function textoPuro(html) { const d = document.createElement('div'); d.innerHTML = html; return d.textContent.replace(/\s+/g, ' ').trim(); }
function valores(o) { if (o == null) return ''; if (typeof o === 'string') return textoPuro(o); if (Array.isArray(o)) return o.map(valores).join(' '); if (typeof o === 'object') return Object.entries(o).filter(([k]) => !['id', 'tipo', 'cor', 'c'].includes(k)).map(([, v]) => valores(v)).join(' '); return ''; }
function montaIndice() {
  indice = [];
  DADOS.modulos.forEach(m => {
    m.topicos.forEach(t => { const tx = textoPuro(t.resumo); indice.push({ m, rota: `#/${m.id}/resumo/${t.id}`, titulo: t.titulo, tipo: 'Resumo', ic: 'book', tx, n: semAcento(t.titulo + ' ' + tx) }); });
    m.mapas.forEach(mp => { const tx = valores(mp.ramos); indice.push({ m, rota: `#/${m.id}/mapa`, titulo: mp.titulo, tipo: 'Mapa mental', ic: 'sitemap', tx, n: semAcento(mp.titulo + ' ' + tx) }); });
    m.apoio.forEach(b => { const tx = valores(b); indice.push({ m, rota: `#/${m.id}/apoio/${b.id}`, titulo: b.titulo, tipo: (TIPOS[b.tipo] || {}).nome || 'Apoio', ic: (TIPOS[b.tipo] || {}).ic || 'box', tx, n: semAcento(tx) }); });
  });
}
function abreBusca() {
  fechaCamadas();
  if (!indice) montaIndice();
  const v = document.createElement('div'); v.className = 'veu';
  v.innerHTML = `<div class="caixaBusca"><div class="campoB">${ic('search')}<input type="search" placeholder="Buscar no material: fármaco, norma, tema" autocomplete="off"><kbd>Esc</kbd></div><div class="res"><p class="vazioB">Digite ao menos duas letras.</p></div></div>`;
  v.addEventListener('mousedown', e => { if (e.target === v) v.remove(); });
  document.body.appendChild(v);
  const inp = $('input', v), res = $('.res', v);
  inp.focus();
  inp.addEventListener('input', () => {
    const termos = semAcento(inp.value).split(/\s+/).filter(t => t.length > 1);
    if (!termos.length) { res.innerHTML = `<p class="vazioB">Digite ao menos duas letras.</p>`; return; }
    const ach = indice.filter(r => termos.every(t => r.n.includes(t))).slice(0, 40);
    const trecho = r => { const n = semAcento(r.tx), p = Math.max(0, n.indexOf(termos[0]) - 60); let s = esc((p ? '… ' : '') + r.tx.slice(p, p + 170) + '…'); termos.forEach(t => { s = s.replace(new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>'); }); return s; };
    res.innerHTML = ach.length ? ach.map((r, i) => `<a class="itR${i ? '' : ' sel'}" href="${r.rota}" style="--k:${r.m.cor}"><span class="ic">${ic(r.ic)}</span><div><small>Módulo ${r.m.num} · ${esc(r.tipo)}</small><b>${esc(r.titulo)}</b><p>${trecho(r)}</p></div></a>`).join('') : `<p class="vazioB">Nada encontrado.</p>`;
  });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { const a = $('.itR', res); if (a) { v.remove(); location.hash = a.getAttribute('href'); } } });
  res.addEventListener('click', e => { if (e.target.closest('a')) v.remove(); });
}
function fechaCamadas() { $$('.veu,.gaveta').forEach(x => x.remove()); }

/* ---------------- rotas ---------------- */
function rota() {
  if (imprimindo) return;
  fechaCamadas();
  const h = decodeURIComponent(location.hash.slice(1) || '/');
  const p = h.split('/').filter(Boolean);
  const m = p[0] && mod(p[0]);
  if (!m) { telaInicio(); $('#titulo-movel').textContent = DADOS.titulo; window.scrollTo(0, 0); return; }
  document.body.style.cssText = `--ac:${m.cor}`;
  moldura(m.id);
  $('#titulo-movel').textContent = m.curto || m.titulo;
  const aba = p[1] || 'resumo';
  if (aba === 'mapa') telaMapa(m); else if (aba === 'apoio') telaApoio(m, p[2]); else telaResumo(m, p[2]);
  if (!p[2]) window.scrollTo(0, 0);
}

/* ---------------- edição ---------------- */
function ativaEdicao() { $$('[data-edit]').forEach(el => { if (editando) el.contentEditable = 'true'; else el.removeAttribute('contenteditable'); }); }
function alternaEdicao() { if (!podeEditar) return; commitTodos(); editando = !editando; document.body.classList.toggle('editando', editando); try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* antigo */ } rota(); aviso(editando ? 'Modo edição ligado: clique em um texto para alterar.' : 'Modo edição desligado.'); }
function marcaAlterado() {
  alterado = true; indice = null;
  if (!gravarLS('rascunho', { base: DADOS.versao, quando: new Date().toISOString(), dados: DADOS })) aviso('O navegador não guardou o rascunho (sem espaço). Salve o arquivo agora.');
  if (!$('.faixa')) app().insertAdjacentHTML('afterbegin', faixaAlterado());
  $('#bt-salvar').classList.add('alerta'); $('#bt-salvar .ponto').hidden = false;
}
const pendentes = new Map();
function agendaCommit(el) { clearTimeout(pendentes.get(el)); pendentes.set(el, setTimeout(() => commit(el), 500)); }
function commitTodos() { pendentes.forEach((t, el) => { clearTimeout(t); commit(el); }); pendentes.clear(); }
function commit(el) {
  pendentes.delete(el);
  const [tipo, id, campo] = el.dataset.edit.split(':');
  if (tipo === 'mod') { mod(id)[campo] = el.innerText.replace(/\s+/g, ' ').trim(); }
  else if (tipo === 'top') { const m = moduloAtual(), t = m && m.topicos.find(x => x.id === id); if (!t) return; t[campo] = campo === 'titulo' ? el.innerText.replace(/\s+/g, ' ').trim() : limpaHtml(el.innerHTML); }
  else if (tipo === 'bloco') { const m = moduloAtual(), b = m && m.apoio.find(x => x.id === id); if (!b) return; b.html = limpaHtml(el.innerHTML); }
  marcaAlterado();
}
function moveItem(lista, id, d) { const i = lista.findIndex(x => x.id === id), j = i + d; if (i < 0 || j < 0 || j >= lista.length) return; [lista[i], lista[j]] = [lista[j], lista[i]]; marcaAlterado(); rota(); }
function excluiItem(lista, id, nome) { const i = lista.findIndex(x => x.id === id); if (i < 0) return; if (!confirm(`Excluir ${nome} “${lista[i].titulo}”?`)) return; lista.splice(i, 1); marcaAlterado(); rota(); }
function abreModal(html) {
  fechaCamadas();
  const v = document.createElement('div'); v.className = 'veu';
  v.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  v.addEventListener('mousedown', e => { if (e.target === v) v.remove(); });
  document.body.appendChild(v);
  const f = v.querySelector('input,textarea,select'); if (f) f.focus();
  return v;
}

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
    `<label class="campo">Título<input type="text" id="ed-tit" value="${esc(b.titulo || '')}"></label>` +
    (b.tipo === 'quadro' ? `<p class="sub">O conteúdo do quadro é editado direto na página, no modo edição.</p>` :
      `<pre class="ajuda">${esc(f.ajuda)}</pre><label class="campo">Conteúdo<textarea id="ed-txt" spellcheck="true">${esc(f.para(b))}</textarea></label>`) +
    (b.tipo === 'tabela' ? `<label class="campo">Nota abaixo da tabela (opcional)<input type="text" id="ed-nota" value="${esc(b.nota || '')}"></label>` : '') +
    `<p class="erro-ed" id="ed-erro"></p><div class="rodM"><button class="bt sec" data-fecha>Cancelar</button><button class="bt" id="ed-ok">${ic('check')} Aplicar</button></div>`);
  $('[data-fecha]', d).onclick = () => { if (novo) m.apoio.splice(m.apoio.indexOf(b), 1); d.remove(); };
  $('#ed-ok', d).onclick = () => {
    try {
      const copia = JSON.parse(JSON.stringify(b));
      copia.titulo = $('#ed-tit', d).value.trim() || TIPOS[b.tipo].nome;
      if (f) f.de($('#ed-txt', d).value, copia);
      if (b.tipo === 'tabela') copia.nota = $('#ed-nota', d).value.trim();
      Object.assign(b, copia); d.remove(); marcaAlterado(); rota();
    } catch (e) { $('#ed-erro', d).textContent = e.message; }
  };
}
function editaMapa(m, mp, novo) {
  const txt = (mp.ramos || []).map(r => r.t + '\n' + (r.itens || []).map(it => typeof it === 'string' ? '- ' + it : '- ' + it.t + '\n' + (it.itens || []).map(s => '-- ' + s).join('\n')).join('\n')).join('\n');
  const d = abreModal(`<h2>${novo ? 'Novo mapa mental' : 'Editar mapa mental'}</h2>` +
    `<div class="duas"><label class="campo">Título<input type="text" id="mp-tit" value="${esc(mp.titulo || '')}"></label><label class="campo">Centro do mapa<input type="text" id="mp-cen" value="${esc(mp.centro || '')}"></label></div>` +
    `<pre class="ajuda">Linha sem traço = ramo (4 a 6 ramos).\n- item do ramo (até ~60 caracteres)\n-- subitem do item (opcional)</pre>` +
    `<label class="campo">Ramos e itens<textarea id="mp-txt">${esc(txt)}</textarea></label>` +
    `<p class="erro-ed" id="ed-erro"></p><div class="rodM"><button class="bt sec" data-fecha>Cancelar</button><button class="bt" id="ed-ok">${ic('check')} Aplicar</button></div>`);
  $('[data-fecha]', d).onclick = () => { if (novo) m.mapas.splice(m.mapas.indexOf(mp), 1); d.remove(); };
  $('#ed-ok', d).onclick = () => {
    const ramos = []; let r = null, it = null;
    $('#mp-txt', d).value.split('\n').forEach(l => {
      const t = l.trim(); if (!t) return;
      if (t.startsWith('--') && it) { if (typeof it.ref === 'string') { const o = { t: it.ref, itens: [] }; r.itens[it.i] = o; it.ref = o; } it.ref.itens.push(t.slice(2).trim()); }
      else if (t.startsWith('-') && r) { r.itens.push(t.slice(1).trim()); it = { i: r.itens.length - 1, ref: t.slice(1).trim() }; }
      else { r = { t, itens: [] }; ramos.push(r); it = null; }
    });
    if (!ramos.length) { $('#ed-erro', d).textContent = 'O mapa precisa de ao menos um ramo.'; return; }
    mp.titulo = $('#mp-tit', d).value.trim() || 'Mapa mental'; mp.centro = $('#mp-cen', d).value.trim() || mp.titulo; mp.ramos = ramos;
    d.remove(); marcaAlterado(); rota();
  };
}

/* ---------------- salvar arquivo, backup e rascunho ---------------- */
function htmlComDados() {
  const json = JSON.stringify(DADOS).replace(/</g, '\\u003c');
  const abre = '<' + 'script id="sos-dados" type="application/json">';
  const ini = ORIGEM.indexOf(abre), fim = ORIGEM.indexOf('<' + '/script>', ini);
  if (ini < 0 || fim < 0) throw new Error('Não achei o bloco de dados no arquivo.');
  return ORIGEM.slice(0, ini) + abre + json + ORIGEM.slice(fim);
}
async function salvarArquivo() {
  if (!podeEditar) return;
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
  alterado = false; apagarLS('rascunho'); aviso('Arquivo salvo. Abra sempre a versão nova.'); rota();
}
function baixar(blob, nome) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
function verificaRascunho() {
  const r = lerLS('rascunho', null);
  if (!r || !r.dados) return;
  const quando = new Date(r.quando).toLocaleString('pt-BR');
  const d = abreModal(`<h2>Alterações não salvas</h2><p class="sub">Este navegador guardou alterações feitas em ${esc(quando)} que não foram gravadas no arquivo.` +
    (r.base !== DADOS.versao ? ' Elas foram feitas sobre outra versão do arquivo; recuperar substitui o conteúdo atual por aquele rascunho.' : '') + `</p>` +
    `<div class="rodM"><button class="bt sec" id="rs-desc">Descartar</button><button class="bt" id="rs-rec">${ic('restore')} Recuperar alterações</button></div>`);
  $('#rs-desc', d).onclick = () => { if (confirm('Descartar as alterações guardadas no navegador?')) { apagarLS('rascunho'); d.remove(); } };
  $('#rs-rec', d).onclick = () => { Object.assign(DADOS, r.dados); alterado = true; d.remove(); indice = null; rota(); };
}
/* Conta MedTech (só no site): quem está conectado e o botão de sair. Sair não apaga nada do aparelho. */
function blocoConta() {
  const u = PORTAO && window.MTS && MTS.usuario;
  if (!u) return '';
  return `<div class="contaAj"><h3>${ic('user-circle')} Conta MedTech</h3><p class="sub">Conectado como <b>${esc(u.email || u.displayName || '')}</b>. ` +
    `O progresso (tópicos estudados, respostas e cartões) fica neste aparelho.</p><div class="linhaBt"><button class="bt sec mini" id="aj-sair">${ic('logout')} Sair da conta</button></div></div>`;
}
function ligaConta(d) {
  const b = $('#aj-sair', d);
  if (b) b.onclick = () => { if (confirm('Sair da conta? O SOS Farmácia Comercial pede login, então a tela de entrada volta. Seu progresso continua neste aparelho.')) MTS.sair(); };
}
function ajustes() {
  const cfg = DADOS.config;
  if (!podeEditar) {
    /* cliente do site: sem edição de conteúdo nem de marca-d'água */
    const d = abreModal(`<h2>Ajustes</h2>` + blocoConta() +
      `<div class="linhaBt"><button class="bt sec mini" id="aj-zera">${ic('restore')} Zerar meu progresso</button></div>` +
      `<p class="sub" style="margin-top:14px">Versão do conteúdo: ${esc(new Date(DADOS.versao).toLocaleString('pt-BR'))}</p>` +
      `<div class="rodM"><button class="bt sec" data-fecha>Fechar</button></div>`);
    $('[data-fecha]', d).onclick = () => d.remove();
    $('#aj-zera', d).onclick = () => { if (confirm('Apagar tópicos estudados, respostas e cartões revisados deste aparelho?')) { ['estudado', 'resp', 'vistos', 'check'].forEach(apagarLS); d.remove(); rota(); } };
    ligaConta(d);
    return;
  }
  const d = abreModal(`<h2>Ajustes</h2><p class="sub">Marca-d'água padrão dos PDFs e cópia de segurança do conteúdo.</p>` +
    `<div class="duas"><label class="campo">Marca-d'água (linha principal)<input type="text" id="aj-m1" value="${esc(cfg.marca)}"></label>` +
    `<label class="campo">Segunda linha (opcional)<input type="text" id="aj-m2" value="${esc(cfg.marca2 || '')}" placeholder="Ex.: Licenciado para Fulano"></label></div>` +
    `<div class="linhaBt"><button class="bt sec mini" id="aj-exp">${ic('download')} Exportar conteúdo (.json)</button><label class="bt sec mini">${ic('upload')} Importar conteúdo (.json)<input type="file" id="aj-imp" accept=".json,application/json" hidden></label>` +
    `<button class="bt sec mini" id="aj-zera">${ic('restore')} Zerar meu progresso</button></div>` +
    `<p class="sub" style="margin-top:14px">Versão do conteúdo: ${esc(new Date(DADOS.versao).toLocaleString('pt-BR'))}</p>` + blocoConta() +
    `<div class="rodM"><button class="bt sec" data-fecha>Fechar</button><button class="bt" id="aj-ok">${ic('check')} Aplicar</button></div>`);
  $('[data-fecha]', d).onclick = () => d.remove();
  ligaConta(d);
  $('#aj-ok', d).onclick = () => { cfg.marca = $('#aj-m1', d).value.trim() || 'SOS Farmácia Comercial'; cfg.marca2 = $('#aj-m2', d).value.trim(); d.remove(); marcaAlterado(); };
  $('#aj-exp', d).onclick = () => { commitTodos(); baixar(new Blob([JSON.stringify(DADOS, null, 1)], { type: 'application/json' }), `sos-farmacia-conteudo-${new Date().toISOString().slice(0, 10)}.json`); };
  $('#aj-zera', d).onclick = () => { if (confirm('Apagar tópicos estudados, respostas e cartões revisados deste aparelho?')) { ['estudado', 'resp', 'vistos', 'check'].forEach(apagarLS); d.remove(); rota(); } };
  $('#aj-imp', d).onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const novo = JSON.parse(await f.text());
      if (!novo.modulos || !Array.isArray(novo.modulos)) throw new Error('arquivo sem módulos');
      if (!confirm(`Substituir todo o conteúdo pelo do arquivo ${f.name}?`)) return;
      Object.keys(DADOS).forEach(k => delete DADOS[k]); Object.assign(DADOS, novo);
      d.remove(); marcaAlterado(); rota(); aviso('Conteúdo importado. Salve o arquivo para gravar.');
    } catch (err) { alert('Não consegui ler: ' + err.message); }
  };
}

/* ---------------- PDF ---------------- */
/* marca-d'água que vale agora: a dos Ajustes para o dono; para o cliente do site, travada com a licença */
function marcaVigente() {
  const cfg = DADOS.config;
  if (podeEditar) return { marca: cfg.marca, marca2: cfg.marca2 || '' };
  return { marca: cfg.marca || 'SOS Farmácia Comercial', marca2: licenciado ? 'Licenciado para ' + licenciado : (cfg.marca2 || '') };
}
function janelaPdf() {
  commitTodos();
  const m = moduloAtual(), cfg = Object.assign({}, DADOS.config, marcaVigente()), trava = podeEditar ? '' : ' disabled';
  const d = abreModal(`<h2>Gerar PDF</h2><p class="sub">Na janela de impressão, escolha <b>Salvar como PDF</b> no destino. Todo PDF sai com marca-d'água em todas as páginas.</p>` +
    `<div class="opcoes">` + (m ? `<label><input type="radio" name="pdf-esc" value="${m.id}" checked> Este módulo: ${esc(m.num + '. ' + m.titulo)}</label>` : '') +
    `<label><input type="radio" name="pdf-esc" value="todos" ${m ? '' : 'checked'}> Todos os módulos (arquivo grande)</label>` +
    `<label><input type="radio" name="pdf-esc" value="um"> Outro módulo <select id="pdf-um" style="flex:1;width:auto">${DADOS.modulos.map(x => `<option value="${x.id}">${x.num}. ${esc(x.titulo)}</option>`).join('')}</select></label></div>` +
    `<div class="opcoes" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))"><label><input type="checkbox" id="pdf-capa" checked> Capa</label><label><input type="checkbox" id="pdf-resumo" checked> Resumo</label>` +
    `<label><input type="checkbox" id="pdf-mapa" checked> Mapas mentais</label><label><input type="checkbox" id="pdf-apoio" checked> Material de apoio</label><label><input type="checkbox" id="pdf-gab" checked> Gabarito</label></div>` +
    `<div class="duas"><label class="campo">Marca-d'água<input type="text" id="pdf-m1" value="${esc(cfg.marca)}"${trava}></label><label class="campo">Segunda linha (opcional)<input type="text" id="pdf-m2" value="${esc(cfg.marca2 || '')}" placeholder="Ex.: Licenciado para Fulano"${trava}></label></div>` +
    `<div class="rodM"><button class="bt sec" data-fecha>Cancelar</button><button class="bt" id="pdf-ok">${ic('file-type-pdf')} Gerar PDF</button></div>`);
  $('[data-fecha]', d).onclick = () => d.remove();
  $('#pdf-um', d).onchange = () => { $('input[value=um]', d).checked = true; };
  $('#pdf-ok', d).onclick = () => {
    const e = $('input[name=pdf-esc]:checked', d).value;
    const ids = e === 'todos' ? DADOS.modulos.map(x => x.id) : [e === 'um' ? $('#pdf-um', d).value : e];
    const o = { ids, capa: $('#pdf-capa', d).checked, resumo: $('#pdf-resumo', d).checked, mapa: $('#pdf-mapa', d).checked, apoio: $('#pdf-apoio', d).checked, gabarito: $('#pdf-gab', d).checked, marca: $('#pdf-m1', d).value.trim() || 'SOS Farmácia Comercial', marca2: $('#pdf-m2', d).value.trim() };
    if (!podeEditar) Object.assign(o, marcaVigente());
    if (!o.resumo && !o.mapa && !o.apoio) { alert('Escolha ao menos uma parte.'); return; }
    d.remove(); imprimindo = true; montaImpressao(o); setTimeout(() => window.print(), 300);
  };
}
function montaImpressao(o) {
  $('.marca-dagua').innerHTML = `<div class="md-g">${`<span>${esc(o.marca)}${o.marca2 ? `<small>${esc(o.marca2)}</small>` : ''}</span>`.repeat(24)}</div>`;
  let s = '';
  if (o.ids.length > 1 && o.capa) s += `<section class="pi pi-capa" style="--ac:#E5484D"><span class="bola b1"></span><span class="bola b2"></span><span class="selo">${ic('first-aid-kit')}</span><div class="rot">Material de estudo e consulta</div><h1>${esc(DADOS.titulo)}</h1><p class="escopo">${esc(DADOS.subtitulo)}</p>` +
    `<div class="sum">${DADOS.modulos.filter(m => o.ids.includes(m.id)).map(m => `<div><b>${m.num}.</b> ${esc(m.titulo)}</div>`).join('')}</div><div class="pe"><span class="logo">${ic('first-aid-kit')}</span><span>${esc(o.marca)}${o.marca2 ? ' · ' + esc(o.marca2) : ''}</span></div></section>`;
  o.ids.forEach(id => {
    const m = mod(id);
    s += `<div class="pi" style="--ac:${m.cor}">`;
    if (o.capa) s += `<section class="pi-capa"><span class="bola b1"></span><span class="bola b2"></span><span class="selo">${ic(m.icone)}</span><div class="rot">Módulo ${m.num}</div><h1>${esc(m.titulo)}</h1><p class="escopo">${esc(m.escopo)}</p>` +
      `<div class="sum">${m.topicos.map(t => `<div>${esc(t.titulo)}</div>`).join('')}</div><div class="pe"><span class="logo">${ic('first-aid-kit')}</span><span>${esc(DADOS.titulo)}</span></div></section>`;
    if (o.resumo && m.topicos.length) s += `<div class="pi-parte">${ic('book')} Resumo para leitura<small>Módulo ${m.num}</small></div>` +
      m.topicos.map(t => `<article class="topico"><h2>${esc(t.titulo)}</h2><div class="conteudo">${t.resumo}</div></article>`).join('') +
      (m.fontes.length ? `<section class="fontesL"><h4>Fontes consultadas</h4><ol>${m.fontes.map(f => `<li>${inl(f)}</li>`).join('')}</ol></section>` : '');
    if (o.mapa && m.mapas.length) s += m.mapas.map(mp => figuraMapa(mp, m, 0, 1, true).replace('</small></div>', ` · mapa mental do módulo ${m.num}</small></div>`)).join('');
    if (o.apoio && m.apoio.length) s += `<div class="pi-parte">${ic('folders')} Material de apoio<small>Módulo ${m.num}</small></div>` + m.apoio.map((b, i) => blocoHtml(b, i, 1, true)).join('');
    s += `</div>`;
  });
  $('#impressao').innerHTML = s;
  if (!o.gabarito) $$('#impressao .gabarito').forEach(g => g.remove());
  const um = o.ids.length === 1 ? mod(o.ids[0]) : null;
  document.title = um ? `SOS Farmácia Comercial - Módulo ${String(um.num).padStart(2, '0')} - ${um.titulo}` : 'SOS Farmácia Comercial - Todos os módulos';
}
window.addEventListener('beforeprint', () => {
  if (imprimindo) return;
  commitTodos();
  const m = moduloAtual();
  imprimindo = true;
  montaImpressao(Object.assign({ ids: m ? [m.id] : DADOS.modulos.map(x => x.id), capa: true, resumo: true, mapa: true, apoio: true, gabarito: true }, marcaVigente()));
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
    else if (ac === 'estudado') {
      const s = estudados(), on = !s.has(id); on ? s.add(id) : s.delete(id); gravarLS('estudado', [...s]);
      a.classList.toggle('on', on); a.innerHTML = `${ic(on ? 'circle-check' : 'check')} ${on ? 'Estudado' : 'Marcar como estudado'}`;
      const t = $(`.toc a[data-toc="${id}"]`); if (t) t.innerHTML = (on ? ic('circle-check') : '') + `<span>${esc(m.topicos.find(x => x.id === id).titulo)}</span>`;
      $$('.progMini').forEach(p => { p.innerHTML = `<div class="barra"><i style="width:${progresso(m)}%"></i></div><span>${progresso(m)}%</span>`; });
      moldura(m.id);
      if (on) aviso('Tópico marcado como estudado.');
    }
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
  const mb = e.target.closest('[data-mapa]'); if (mb) { acaoMapa(mb.closest('.mapaCard'), mb.dataset.mapa); return; }
  const mc = e.target.closest('.revisao .mmCartao'); if (mc) { mc.classList.add('revelado'); return; }
  const pula = e.target.closest('[data-pula]'); if (pula) { document.getElementById(pula.dataset.pula).scrollIntoView({ behavior: 'smooth' }); return; }
  const fl = e.target.closest('[data-filtro]'); if (fl) { filtroApoio = fl.dataset.filtro; telaApoio(moduloAtual()); return; }
  const alt = e.target.closest('button.alt');
  if (alt) {
    const qz = alt.closest('[data-quiz]'), bid = qz.dataset.quiz, b = moduloAtual().apoio.find(x => x.id === bid), i = Math.min(posQ[bid] || 0, b.itens.length - 1);
    const R = respostas(); R[bid + ':' + i] = +alt.dataset.alt; gravarLS('resp', R);
    qz.innerHTML = questaoHtml(b); return;
  }
  const qn = e.target.closest('[data-qnav]');
  if (qn) { const qz = qn.closest('[data-quiz]'), b = moduloAtual().apoio.find(x => x.id === qz.dataset.quiz); posQ[b.id] = Math.max(0, Math.min(b.itens.length - 1, (posQ[b.id] || 0) + +qn.dataset.qnav)); qz.innerHTML = questaoHtml(b); return; }
  const vr = e.target.closest('[data-virar]');
  if (vr) {
    const f2 = vr.closest('[data-flash]'), bid = f2.dataset.flash, i = posC[bid] || 0;
    vr.classList.toggle('virada');
    if (vr.classList.contains('virada')) { const V = vistos(); if (!V.has(bid + ':' + i)) { V.add(bid + ':' + i); gravarLS('vistos', [...V]); const p = $$('.pontos i', f2)[i]; if (p) p.classList.add('v'); } }
    return;
  }
  const cn = e.target.closest('[data-cnav]');
  if (cn) { const f2 = cn.closest('[data-flash]'), b = moduloAtual().apoio.find(x => x.id === f2.dataset.flash); posC[b.id] = Math.max(0, Math.min(b.itens.length - 1, (posC[b.id] || 0) + +cn.dataset.cnav)); f2.innerHTML = cartaHtml(b); return; }
  const bb = e.target.closest('#barra [data-b]');
  if (bb) { const k = bb.dataset.b; if (k === 'inicio') location.hash = '#/'; else if (k === 'buscar') abreBusca(); else gaveta(k); }
});
document.addEventListener('change', e => {
  const c = e.target.closest('[data-check]');
  if (c) { const [bid, i] = c.dataset.check.split(':'); const all = lerLS('check', {}); const s = new Set(all[bid] || []); c.checked ? s.add(+i) : s.delete(+i); all[bid] = [...s]; gravarLS('check', all); }
});
document.addEventListener('input', e => { const el = e.target.closest && e.target.closest('[data-edit][contenteditable=true]'); if (el) agendaCommit(el); });
document.addEventListener('focusout', e => { const el = e.target.closest && e.target.closest('[data-edit][contenteditable=true]'); if (el && pendentes.has(el)) commit(el); });
document.addEventListener('paste', e => {
  const el = e.target.closest && e.target.closest('[data-edit][contenteditable=true]'); if (!el) return;
  e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain'));
});
document.addEventListener('keydown', e => {
  const el = e.target.closest && e.target.closest('[data-edit^="mod:"],[data-edit$=":titulo"]');
  if (el && el.isContentEditable && e.key === 'Enter') { e.preventDefault(); el.blur(); }
  if (e.key === 'Escape') fechaCamadas();
  const digitando = e.target.closest && e.target.closest('input,textarea,select,[contenteditable=true]');
  if (!digitando && (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'))) { e.preventDefault(); abreBusca(); }
});
document.addEventListener('mousedown', e => {
  const b = e.target.closest('#ed-barra button'); if (!b) return;
  e.preventDefault();
  const sel = window.getSelection(), alvo = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
  const ed = alvo && alvo.closest('.conteudo[contenteditable=true]');
  if (!ed) { aviso('Clique primeiro dentro do texto que quer formatar.'); return; }
  const cmd = b.dataset.cmd, cx = b.dataset.cx;
  if (cx) document.execCommand('insertHTML', false, `<div class="cx ${cx}"><b>${{ chave: 'Ponto-chave', alerta: 'Atenção', balcao: 'No balcão', lei: 'O que diz a norma', exemplo: 'Caso' }[cx]}</b><p>Escreva aqui.</p></div><p><br></p>`);
  else if (cmd === 'h3' || cmd === 'p') document.execCommand('formatBlock', false, cmd);
  else if (cmd === 'tabela') document.execCommand('insertHTML', false, '<div class="tab"><table><thead><tr><th>Coluna 1</th><th>Coluna 2</th><th>Coluna 3</th></tr></thead><tbody><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table></div><p><br></p>');
  else document.execCommand(cmd, false, null);
  agendaCommit(ed);
});
$('#bt-editar').onclick = alternaEdicao;
$('#bt-salvar').onclick = salvarArquivo;
$('#bt-pdf').onclick = janelaPdf;
$('#bt-ajustes').onclick = ajustes;
$('#bt-tema').onclick = trocaTema;
$$('[data-buscar]').forEach(b => { b.onclick = abreBusca; });
$('#bt-mais').onclick = () => gaveta('mais');
window.addEventListener('hashchange', () => { commitTodos(); rota(); });
window.addEventListener('beforeunload', e => { commitTodos(); if (alterado) { e.preventDefault(); e.returnValue = ''; } });

/* ---------------- início ---------------- */
async function inicia() {
  try { await document.fonts.load('16px tabler-icons'); } catch (e) { /* segue */ }
  const q = new URLSearchParams(location.search);
  if (q.get('pdf') && !PORTAO) {
    /* Geração automática (ferramentas/gera_pdfs.py): monta a impressão e avisa que terminou. */
    const ids = q.get('pdf') === 'todos' ? DADOS.modulos.map(x => x.id) : q.get('pdf').split(',');
    const partes = (q.get('partes') || 'resumo,mapa,apoio').split(',');
    imprimindo = true;
    montaImpressao({ ids, capa: q.get('capa') !== '0', resumo: partes.includes('resumo'), mapa: partes.includes('mapa'), apoio: partes.includes('apoio'), gabarito: q.get('gabarito') !== '0', marca: q.get('marca') || DADOS.config.marca, marca2: q.get('marca2') || DADOS.config.marca2 || '' });
    document.body.dataset.pronto = '1';
    return;
  }
  rota();
  /* no site, o rascunho (edição antiga guardada neste navegador) só é oferecido à administração: para o
     cliente ele fica guardado como está, sem aviso e sem botão de descartar */
  if (!PORTAO) verificaRascunho();
}
/* Ganchos da conta (conta-sos.js). liberarEdicao: administração; cliente: leitura com marca-d'água licenciada. */
let rascunhoVisto = false;
function liberarEdicao() {
  if (podeEditar && rascunhoVisto) return;
  podeEditar = true; rota();
  if (!rascunhoVisto) { rascunhoVisto = true; verificaRascunho(); }
}
function cliente(email) { licenciado = String(email || '').trim(); }
window.SOS = { dados: DADOS, htmlComDados, liberarEdicao, cliente, get podeEditar() { return podeEditar; }, PORTAO }; /* conta e testes */
inicia();
})();
