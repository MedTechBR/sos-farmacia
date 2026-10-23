/* conta-sos.js — conta MedTech, compra e progresso na conta do SOS Farmácia Comercial.
   O SOS é vendido no MedTech (produto "sosfarmacia" do planos.json, linha provas, R$ 49,90/mês ou R$ 397/ano).
   Só entra quando o app é aberto pelo site: o casca.html escreve mtsync.js (portão de login), /_mtacesso.js
   (compra e tela de assinatura) e este arquivo. Aberto do computador (file://) ou no localhost, nada disso
   carrega e o app é a ferramenta do dono (progresso só no aparelho, como antes).

   - Login obrigatório com a conta MedTech (mtsync.js, cópia sem mudança de ~/Documents/Claude/_mtsync/).
   - Depois do login, MTAcesso.verificar: conta sem CPF completa o cadastro; sem compra, tela de assinatura
     com os preços do planos.json; administração entra liberada.
   - Administração (claim mt.adm): modo edição, "Salvar arquivo", importar/exportar e marca-d'água livres
     (SOS.liberarEdicao). Cliente: leitura, estudo e PDF com marca-d'água "Licenciado para <e-mail>".

   PROGRESSO NA CONTA (22/10/2026, decisão do dono, substitui a regra antiga "nada salvo no aparelho é apagado"):
   "o progresso em todos os apps tem que ser na conta, não no aparelho".
     - Sobe e sincroniza (users/{uid}/apps/sosfarmacia/sync/<coleção>~<id>, um documento por item, último que
       editou vence por item): estudado (tópicos), resp (respostas), vistos (cartões), check (checklists).
       Tudo como "mapa"; as listas estudado/vistos viram {id: 1}. O valor vai como texto JSON no campo "j" e o
       id vai no nome do documento (o motor troca "." por %2E): nenhuma chave com ponto em nome de campo.
     - Primeiro login: o que já está no aparelho SOBE para a conta. Antes de o motor começar, todas as chaves
       "sos-farmacia:*" (texto cru) vão para uma RESERVA imutável no IndexedDB "sos-farmacia-reserva"
       (chave "antes-da-conta", só se ainda não existir, conferida lendo de volta). Nada aqui apaga a reserva.
       O que estava no aparelho antes da conta entra com carimbo "antigo": perde para o que a nuvem já tiver.
     - Sair / troca de conta: o mtsync primeiro espera a fila subir; aqui o progresso vai para a reserva
       ("saida-<uid>-<momento>") e DEPOIS as quatro chaves saem do aparelho com o removeItem ORIGINAL (não vira
       lápide na nuvem). Quem entrar em seguida vê só o que é da conta dela.
     - Fica no aparelho (não é progresso): tema, vista do mapa e o rascunho de edição da administração.
     - Chave com JSON ilegível: a coleção fica FORA da sincronização (nem sobe vazia, nem é regravada).
     - Trava de esvaziamento: coleção com 3+ itens que fica vazia de uma vez sem o botão "Zerar meu progresso"
       (window.__sosZerou) é lida como antes, para não mandar apagar tudo na nuvem. */
(function () {
  "use strict";
  const APP = "sosfarmacia", NOME = "SOS Farmácia Comercial", PREF = "sos-farmacia:";
  const IDB_RESERVA = "sos-farmacia-reserva";
  if (!window.MTS) { console.warn("SOS: módulo da conta não carregou; app aberto sem conta"); return }

  /* chave do app -> coleção */
  const CHAVE = { estudado: PREF + "estudado", resp: PREF + "resp", vistos: PREF + "vistos", check: PREF + "check" };
  const LISTA = { estudado: 1, vistos: 1 };            /* guardadas como lista de ids no app */
  const TODAS = { estudado: { tipo: "mapa" }, resp: { tipo: "mapa" }, vistos: { tipo: "mapa" }, check: { tipo: "mapa" } };
  let COLECOES = TODAS;
  const PORCHAVE = {}; Object.keys(CHAVE).forEach(c => PORCHAVE[CHAVE[c]] = c);
  const colDe = k => (typeof k === "string" && PORCHAVE[k]) || null;
  const MARCA = PREF + "mts_cols";                     /* estado do motor já sabe das coleções (ver inicia) */

  const SP = Storage.prototype, oSet = SP.setItem, oRem = SP.removeItem, oClr = SP.clear;
  const getRaw = k => { try { return localStorage.getItem(k) } catch (e) { return null } };
  const parse = s => { if (s === null || s === undefined || s === "") return { ok: true, v: null }; try { return { ok: true, v: JSON.parse(s) } } catch (e) { return { ok: false } } };
  const obj = v => (v && typeof v === "object" && !Array.isArray(v)) ? v : {};
  function achata(c, v) {
    if (LISTA[c]) { const m = {}; (Array.isArray(v) ? v : []).forEach(id => { if ((typeof id === "string" && id) || typeof id === "number") m[String(id)] = 1 }); return m }
    const m = {}, o = obj(v); Object.keys(o).forEach(k => { if (o[k] !== undefined) m[k] = o[k] }); return m;
  }
  function monta(c, m) {
    if (!LISTA[c]) return m;
    let ant = []; const p = parse(getRaw(CHAVE[c])); if (p.ok && Array.isArray(p.v)) ant = p.v.map(String);
    const out = ant.filter(id => id in m); Object.keys(m).forEach(id => { if (!out.includes(id)) out.push(id) });
    return out;
  }

  /* ---------- ler (cache pelo texto cru; JSON quebrado devolve o último bom, nunca vazio) ---------- */
  const cache = {}, ultimoBom = {}, ultimoCheio = {};
  const nIt = v => Object.keys(v || {}).length;
  const zerouAgora = () => { const z = window.__sosZerou; return !!z && Date.now() - z < 120000 };
  function lerCru(c) {
    const r = getRaw(CHAVE[c]);
    if (cache[c] && cache[c].r === r) return cache[c].v;
    const p = parse(r);
    if (!p.ok) return ultimoBom[c] !== undefined ? ultimoBom[c] : {};
    const v = achata(c, p.v);
    cache[c] = { r, v }; ultimoBom[c] = v;
    return v;
  }
  function ler(c) {
    const v = lerCru(c), n = nIt(v);
    if (n === 0 && ultimoCheio[c] && nIt(ultimoCheio[c]) >= 3 && !zerouAgora()) {
      if (!ler.avisado) { ler.avisado = 1; console.warn("conta-sos: \"" + c + "\" ficou vazio de uma vez sem o botão de zerar; nada é apagado na nuvem") }
      return ultimoCheio[c];
    }
    if (n > 0 || zerouAgora()) ultimoCheio[c] = n > 0 ? v : null;
    return v;
  }

  /* ---------- gravar: escreve o que o motor montou (veio da nuvem) ---------- */
  let gravando = false;
  function setRaw(k, s) { gravando = true; try { localStorage.setItem(k, s) } finally { gravando = false } }
  const legivel = k => { const r = getRaw(k); return r === null || parse(r).ok };
  function gravar(c, v) {
    const k = CHAVE[c]; if (!k || !legivel(k)) return;
    if (!v || typeof v !== "object") return;
    const valor = monta(c, v);
    setRaw(k, JSON.stringify(valor));
    delete cache[c];
    ultimoCheio[c] = nIt(v) ? v : null;      /* zerado em outro aparelho: o vazio passa a valer aqui também */
    visto[c] = getRaw(k);
  }

  /* ---------- reserva imutável (IndexedDB) ---------- */
  function abreReserva() {
    return new Promise(ok => {
      let rq; try { rq = indexedDB.open(IDB_RESERVA, 1) } catch (e) { return ok(null) }
      rq.onupgradeneeded = () => { if (!rq.result.objectStoreNames.contains("reserva")) rq.result.createObjectStore("reserva") };
      rq.onsuccess = () => ok(rq.result); rq.onerror = rq.onblocked = () => ok(null);
    });
  }
  /* todas = todas as chaves do app (antes da conta); senão só as de progresso (saída: sem o rascunho, que fica) */
  function foto(todas) {
    const chaves = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(PREF) || k === PREF + "mts" || k === PREF + "mts_uid") continue;
        if (todas || colDe(k)) chaves[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    return { em: new Date().toISOString(), origem: location.href, chaves };
  }
  async function reserva(chave, so_se_nao_existe, todas) {
    const db = await abreReserva(); if (!db) return false;
    const tx = (m, f) => new Promise(ok => { try { const t = db.transaction("reserva", m), r = f(t.objectStore("reserva")); r.onsuccess = () => ok(r.result); r.onerror = () => ok(undefined) } catch (e) { ok(undefined) } });
    try {
      if (so_se_nao_existe && (await tx("readonly", st => st.get(chave))) !== undefined) return true;
      const f = foto(todas);
      await tx("readwrite", st => st.add(f, chave));          /* add: nunca sobrescreve */
      const volta = await tx("readonly", st => st.get(chave));
      return !!volta && JSON.stringify(volta.chaves) === JSON.stringify(f.chaves);
    } finally { try { db.close() } catch (e) {} }
  }

  /* ---------- sair / troca de conta: o progresso é da conta, não do aparelho ---------- */
  async function limparLocal() {
    const uid = getRaw(PREF + "mts_uid") || "sem-uid";
    let ok = false; try { ok = await reserva("saida-" + uid + "-" + new Date().toISOString(), false, false) } catch (e) {}
    if (!ok) console.warn("conta-sos: reserva da saída não confirmada; o progresso já está na conta");
    try { Object.keys(CHAVE).forEach(c => oRem.call(localStorage, CHAVE[c])); oRem.call(localStorage, MARCA) } catch (e) {}   /* direto: não vira lápide */
  }

  function semCorrompidos() {
    const fora = Object.keys(CHAVE).filter(c => !legivel(CHAVE[c]));
    fora.forEach(c => console.warn("conta-sos: dados de \"" + c + "\" ilegíveis neste aparelho; ficam como estão e fora da sincronização"));
    const out = {}; Object.keys(TODAS).forEach(c => { if (!fora.includes(c)) out[c] = TODAS[c] });
    window.__sosFora = fora;
    return out;
  }
  /* coleção vazia aqui que o motor já conhecia com itens (aparelho limpo com a sessão viva): esquece a base
     dela e relê a nuvem, em vez de mandar apagar tudo lá */
  function reponhaVazias() {
    let E = null; try { E = JSON.parse(getRaw(PREF + "mts")) } catch (e) {}
    if (!E || !E.base) return;
    let mexeu = false;
    Object.keys(COLECOES).forEach(c => {
      const b = E.base[c] || {}, vivos = Object.keys(b).filter(id => b[id] !== "x").length;
      if (vivos && nIt(lerCru(c)) === 0) { ["base", "ed", "bt", "bh"].forEach(p => { if (E[p]) delete E[p][c] }); mexeu = true; console.warn("conta-sos: \"" + c + "\" vazio aqui; volta da nuvem") }
    });
    if (mexeu) { E.cursor = 0; try { oSet.call(localStorage, PREF + "mts", JSON.stringify(E)) } catch (e) {} }
  }

  /* ---------- detecção de mudança ---------- */
  const visto = {};
  const toca = c => { if (!c) return; visto[c] = getRaw(CHAVE[c]); if (!gravando && COLECOES[c]) MTS.mudou(c) };
  SP.setItem = function (k) { const r = oSet.apply(this, arguments); try { if (this === localStorage) toca(colDe(String(k))) } catch (e) {} return r };
  SP.removeItem = function (k) { const r = oRem.apply(this, arguments); try { if (this === localStorage) toca(colDe(String(k))) } catch (e) {} return r };
  SP.clear = function () { const r = oClr.apply(this, arguments); try { if (this === localStorage) Object.keys(COLECOES).forEach(toca) } catch (e) {} return r };
  addEventListener("storage", e => { if (e.storageArea && e.storageArea !== localStorage) return; if (e.key === null) Object.keys(COLECOES).forEach(toca); else toca(colDe(e.key)) });
  let varreT = null;
  function varredura() { Object.keys(COLECOES).forEach(c => { if (visto[c] !== getRaw(CHAVE[c])) toca(c) }) }

  function aoReceber() { try { window.SOS && SOS.recarrega && SOS.recarrega() } catch (e) { console.warn("conta-sos: redesenho", e) } }

  async function inicia() {
    /* primeira coisa, antes de qualquer login: a reserva do que o aparelho já tem */
    let ok = false; try { ok = await reserva("antes-da-conta", true, true) } catch (e) {}
    window.__sosReserva = ok;
    if (!ok) console.warn("conta-sos: não consegui confirmar a reserva no IndexedDB (sigo só copiando, sem apagar nada)");
    COLECOES = semCorrompidos();
    reponhaVazias();
    /* até 22/10 o motor rodava sem coleções e já marcou "inicio": o progresso que estava no aparelho entraria
       com carimbo de agora e venceria a nuvem. Uma vez só, tira o "inicio" para ele entrar como antigo. */
    if (getRaw(MARCA) !== "1") {
      try { const E = JSON.parse(getRaw(PREF + "mts")); if (E && E.inicio) { delete E.inicio; oSet.call(localStorage, PREF + "mts", JSON.stringify(E)) } } catch (e) {}
      try { oSet.call(localStorage, MARCA, "1") } catch (e) {}
    }
    Object.keys(COLECOES).forEach(c => { visto[c] = getRaw(CHAVE[c]) });
    MTS.aoMudarSituacao(s => { const el = document.getElementById("contaSit"); if (el) el.textContent = MTS.descreve(s).txt });
    const cs = getComputedStyle(document.documentElement), g = n => cs.getPropertyValue(n).trim();
    const t = document.documentElement.dataset.tema;
    const escuro = t === "escuro" || (!t && matchMedia("(prefers-color-scheme: dark)").matches);
    MTS.iniciar({
      app: APP, nome: NOME, pref: PREF, vendor: "/vendor/firebase/",
      /* vermelho da marca do SOS escurecido para o botão: #C8373C dá 5,3:1 com texto branco; no escuro,
         #FF9A9D com texto preto. O mtsync escolhe a cor do texto do botão pelo contraste. */
      cores: { cor: escuro ? "#FF9A9D" : "#C8373C", fundo: g("--papel") || (escuro ? "#0D1017" : "#F5F6FB"), texto: g("--ink") || (escuro ? "#EDF0F7" : "#141827"),
        suave: g("--ink2") || (escuro ? "#A3ABBE" : "#5D6579"), borda: g("--linhaF") || (escuro ? "#343D51" : "#D3D8E5"), campo: g("--sup") || (escuro ? "#161B26" : "#fff"),
        erro: escuro ? "#FF9B9B" : "#B42318", ok: escuro ? "#5EE6A8" : "#067647" },
      colecoes: COLECOES,
      ler, gravar, aoReceber, limparLocal,
      aoEntrar(u) {
        if (!varreT) varreT = setInterval(varredura, 4000);
        const S = window.SOS, M = window.MTAcesso;
        if (!S) return;
        S.cliente(u.email || u.displayName || "");
        if (!M) return;   /* falha aberta, como nos outros apps: sem o módulo de compra, só leitura */
        const libera = () => S.liberarEdicao();
        M.lerMt(u, false).then(mt => { if (mt && mt.adm) libera() }).catch(() => {});
        M.verificar({ appId: APP, user: u, signOut: () => MTS.sair() })
          .then(r => { if (r && r.motivo === "admin") libera() })
          .catch(() => {});
      }
    });
  }
  window.__contaSOS = { ler, colDe, CHAVE, get COLECOES() { return COLECOES } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inicia, { once: true });
  else inicia();
})();
