/* conta-gestao.js — conta MedTech na Gestão da farmácia (área do SOS Farmácia Comercial), 15/10/2026.
   Carregado só pelo site (o <head> de gestao/index.html escreve ../mtsync.js, /_mtacesso.js e este arquivo).
   Aberto do computador (file://) ou na prévia do localhost, nada disso entra e a gestão funciona só no aparelho.

   - Mesmo portão do SOS: entra com a conta MedTech e a compra do produto "sosfarmacia" (MTAcesso).
   - Diferente do SOS, aqui os dados SOBEM para a conta: são registros de trabalho da farmácia (escala, trocas,
     banco de horas, recebimento, divergências, validade), e perder isso foi o que aconteceu no FarmáciaGest
     quando ele vivia só no aparelho. Motor do mtsync: um documento por item em users/{uid}/apps/sosgestao/sync,
     último que editou vence POR ITEM, exclusão vira lápide, fila offline do próprio Firestore.
   - Uma vez por conta (só enquanto a área nova está vazia), antes de o motor começar, traz o que estava no FarmáciaGest antigo
     (users/{uid}/apps/farmaciagest, documento único com o JSON) e junta por id com o que já está aqui.
   - SAIR / TROCA DE CONTA (22/10/2026, decisão do dono, substitui a regra antiga "nada salvo no aparelho é
     apagado"): "o progresso em todos os apps tem que ser na conta, não no aparelho". O mtsync primeiro espera a
     fila subir para a nuvem; aqui todas as chaves fg_* e sos-gestao:* (texto cru) vão para uma reserva no
     IndexedDB "sos-gestao-reserva" ("saida-<uid>-<momento>", conferida lendo de volta) e só então as chaves fg_*
     (dados, cópias fg_bak*, e as fg_lapides/fg_carimbos do FarmáciaGest antigo, mesma origem) saem do aparelho.
     Se a reserva não confirmar, NADA é apagado. Ficam: tema (sos-farmacia:tema) e a última aba (sos-gestao:aba).
     Antes do primeiro login do aparelho, outra reserva "antes-da-conta" (uma vez só). Nada aqui apaga reservas.
     Efeito colateral conhecido: o FarmáciaGest antigo (medtechbr.com.br/farmaciagest/) lê as mesmas chaves fg_*;
     depois de sair aqui, ele abre vazio no aparelho (os dados estão na conta, área sosgestao). */
(function () {
  "use strict";
  const APP = "sosgestao", NOME = "Gestão da farmácia · SOS Farmácia Comercial", PREF = "sos-gestao:";
  if (!window.MTS) { console.warn("Gestão: módulo da conta não carregou; aberta só no aparelho"); return }

  const IDB_RESERVA = "sos-gestao-reserva";
  const getRaw = k => { try { return localStorage.getItem(k) } catch (e) { return null } };
  const nossa = k => k && (k.startsWith("fg_") || (k.startsWith(PREF) && k !== PREF + "mts" && k !== PREF + "mts_uid"));
  function abreReserva() {
    return new Promise(ok => {
      let rq; try { rq = indexedDB.open(IDB_RESERVA, 1) } catch (e) { return ok(null) }
      rq.onupgradeneeded = () => { if (!rq.result.objectStoreNames.contains("reserva")) rq.result.createObjectStore("reserva") };
      rq.onsuccess = () => ok(rq.result); rq.onerror = rq.onblocked = () => ok(null);
    });
  }
  function foto() {
    const chaves = {};
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (nossa(k)) chaves[k] = localStorage.getItem(k) } } catch (e) {}
    return { em: new Date().toISOString(), origem: location.href, chaves };
  }
  /* grava `chave` (add: nunca sobrescreve) e confere lendo de volta; true = a reserva existe */
  async function reserva(chave, so_se_nao_existe) {
    const db = await abreReserva(); if (!db) return false;
    const tx = (m, f) => new Promise(ok => { try { const t = db.transaction("reserva", m), r = f(t.objectStore("reserva")); r.onsuccess = () => ok(r.result); r.onerror = () => ok(undefined) } catch (e) { ok(undefined) } });
    try {
      if (so_se_nao_existe && (await tx("readonly", st => st.get(chave))) !== undefined) return true;
      const f = foto();
      await tx("readwrite", st => st.add(f, chave));
      const volta = await tx("readonly", st => st.get(chave));
      return !!volta && JSON.stringify(volta.chaves) === JSON.stringify(f.chaves);
    } finally { try { db.close() } catch (e) {} }
  }
  async function limparLocal() {
    const uid = getRaw(PREF + "mts_uid") || "sem-uid";
    let ok = false; try { ok = await reserva("saida-" + uid + "-" + new Date().toISOString(), false) } catch (e) {}
    if (!ok) { console.warn("Gestão: reserva da saída não confirmada; nada foi apagado do aparelho"); return }
    try {
      const ks = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith("fg_")) ks.push(k) }
      ks.forEach(k => localStorage.removeItem(k));
    } catch (e) {}
  }

  const FRASE = "Entre com sua conta MedTech. Seu progresso fica salvo nela e aparece em qualquer aparelho.";
  const corrige = () => { const s = document.querySelector("#mtsPortao .sub"); if (s && s.textContent === FRASE) s.textContent = "Entre com sua conta MedTech para abrir a Gestão da farmácia. Escala, estoque e validades ficam salvos na conta e aparecem em qualquer aparelho." };
  new MutationObserver(corrige).observe(document.documentElement, { childList: true, subtree: true });

  const LISTAS = ["funcs", "trocas", "banco", "receb", "recdoc", "diverg", "mensal", "validade", "turnos", "cats"];
  const colecoes = {};
  LISTAS.forEach(c => colecoes[c] = { tipo: "lista", id: "id" });
  colecoes.feriados = { tipo: "lista", id: "data" };
  colecoes.minimos = { tipo: "doc" };
  colecoes.valcfg = { tipo: "doc" };

  async function inicia() {
    const FG = window.FG;
    try { if (!(await reserva("antes-da-conta", true))) console.warn("Gestão: não consegui confirmar a reserva no IndexedDB") } catch (e) {}
    if (!FG) { console.warn("Gestão: app não expôs window.FG"); return }
    MTS.aoMudarSituacao(s => { const el = document.getElementById("fgContaSit"); if (el) el.textContent = MTS.descreve(s).txt });
    const cs = getComputedStyle(document.documentElement), g = n => cs.getPropertyValue(n).trim();
    const t = document.documentElement.dataset.tema;
    const escuro = t === "escuro" || (!t && matchMedia("(prefers-color-scheme: dark)").matches);
    MTS.iniciar({
      app: APP, nome: NOME, pref: PREF, vendor: "/vendor/firebase/",
      cores: { cor: escuro ? "#FF9A9D" : "#C8373C", fundo: g("--papel") || (escuro ? "#0D1017" : "#F5F6FB"), texto: g("--ink") || (escuro ? "#EDF0F7" : "#141827"),
        suave: g("--ink2") || (escuro ? "#A3ABBE" : "#5D6579"), borda: g("--linhaF") || (escuro ? "#343D51" : "#D3D8E5"), campo: g("--sup") || (escuro ? "#161B26" : "#fff"),
        erro: escuro ? "#FF9B9B" : "#B42318", ok: escuro ? "#5EE6A8" : "#067647" },
      colecoes,
      ler: c => FG.ler(c),
      gravar: (c, v) => FG.gravar(c, v),
      aoReceber: () => FG.aoReceber(),
      async legado({ uid, db }) {
        /* só na PRIMEIRA vez da conta: se a área nova já tem dados, quem manda é ela. Importar de novo num
           segundo aparelho ressuscitaria o que já foi excluído aqui (o item antigo ganharia carimbo novo). */
        const col = db.collection("users").doc(uid).collection("apps").doc(APP).collection("sync");
        const ja = await (col.limit ? col.limit(1) : col).get();
        if (ja.size > 0) return true;
        const snap = await db.collection("users").doc(uid).collection("apps").doc("farmaciagest").get();
        if (!snap.exists) return true;
        let p = null; try { const raw = snap.data(); p = raw && raw.json ? JSON.parse(raw.json) : null } catch (e) { p = null }
        const n = FG.juntarAntigo(p);
        if (n) console.info("Gestão: " + n + " registro(s) trazidos do FarmáciaGest antigo");
        return true;
      },
      limparLocal,
      aoEntrar(u) {
        try { FG.naConta(u.email || u.displayName || "") } catch (e) {}
        try { if (typeof window.render === "function") window.render() } catch (e) {}   /* Configurações ganha o cartão da conta */
        const M = window.MTAcesso;
        if (!M) return;   /* falha aberta, como nos outros apps */
        M.verificar({ appId: "sosfarmacia", user: u, signOut: () => MTS.sair() }).catch(() => {});
      }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inicia, { once: true });
  else inicia();
})();
