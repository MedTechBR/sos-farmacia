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
   - REGRA DO DONO: nada salvo no aparelho é apagado por causa da conta (limparLocal vazio). */
(function () {
  "use strict";
  const APP = "sosgestao", NOME = "Gestão da farmácia · SOS Farmácia Comercial", PREF = "sos-gestao:";
  if (!window.MTS) { console.warn("Gestão: módulo da conta não carregou; aberta só no aparelho"); return }

  const FRASE = "Entre com sua conta MedTech. Seu progresso fica salvo nela e aparece em qualquer aparelho.";
  const corrige = () => { const s = document.querySelector("#mtsPortao .sub"); if (s && s.textContent === FRASE) s.textContent = "Entre com sua conta MedTech para abrir a Gestão da farmácia. Escala, estoque e validades ficam salvos na conta e aparecem em qualquer aparelho." };
  new MutationObserver(corrige).observe(document.documentElement, { childList: true, subtree: true });

  const LISTAS = ["funcs", "trocas", "banco", "receb", "recdoc", "diverg", "mensal", "validade", "turnos", "cats"];
  const colecoes = {};
  LISTAS.forEach(c => colecoes[c] = { tipo: "lista", id: "id" });
  colecoes.feriados = { tipo: "lista", id: "data" };
  colecoes.minimos = { tipo: "doc" };
  colecoes.valcfg = { tipo: "doc" };

  function inicia() {
    const FG = window.FG;
    if (!FG) { console.warn("Gestão: app não expôs window.FG"); return }
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
      async limparLocal() { /* nada é apagado (regra do dono) */ },
      aoEntrar(u) {
        try { FG.naConta(u.email || u.displayName || "") } catch (e) {}
        const M = window.MTAcesso;
        if (!M) return;   /* falha aberta, como nos outros apps */
        M.verificar({ appId: "sosfarmacia", user: u, signOut: () => MTS.sair() }).catch(() => {});
      }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inicia, { once: true });
  else inicia();
})();
