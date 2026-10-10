/* conta-sos.js — conta MedTech e compra no SOS Farmácia Comercial (10/10/2026).
   O SOS passou a ser vendido no MedTech (produto "sosfarmacia" do planos.json, linha provas,
   R$ 49,90/mês ou R$ 397/ano). Só entra quando o app é aberto pelo site: o casca.html escreve
   mtsync.js (portão de login), /_mtacesso.js (compra e tela de assinatura) e este arquivo.
   Aberto do computador (file://) ou no localhost, nada disso carrega e o app é a ferramenta do dono.

   - Login obrigatório com a conta MedTech (mtsync.js, cópia sem mudança de ~/Documents/Claude/_mtsync/).
   - Depois do login, MTAcesso.verificar: conta sem CPF completa o cadastro; sem compra, tela de assinatura
     com os preços do planos.json; administração entra liberada.
   - Administração (claim mt.adm): modo edição, "Salvar arquivo", importar/exportar e marca-d'água livres
     (SOS.liberarEdicao). Cliente: leitura, estudo e PDF com marca-d'água "Licenciado para <e-mail>".

   REGRA DO DONO (10/10/2026): nada que está salvo no aparelho é apagado por causa da conta. O progresso
   do SOS (tópicos estudados, respostas, cartões, checklists, tema, rascunho de edição) continua só no
   aparelho, nas chaves "sos-farmacia:*" do localStorage, e não sobe para a nuvem: o motor de sincronização
   roda sem coleções. Sair da conta e troca de conta não limpam nada (limparLocal vazio); o mtsync só mexe
   nas chaves dele, "sos-farmacia:mts" e "sos-farmacia:mts_uid". */
(function () {
  "use strict";
  const APP = "sosfarmacia", NOME = "SOS Farmácia Comercial", PREF = "sos-farmacia:";
  if (!window.MTS) { console.warn("SOS: módulo da conta não carregou; app aberto sem conta"); return }

  /* A tela de entrar do mtsync diz que o progresso fica salvo na conta; no SOS ele fica só no aparelho.
     Troca só essa frase, sem mexer na cópia do mtsync.js. */
  const FRASE = "Entre com sua conta MedTech. Seu progresso fica salvo nela e aparece em qualquer aparelho.";
  const corrige = () => { const s = document.querySelector("#mtsPortao .sub"); if (s && s.textContent === FRASE) s.textContent = "Entre com sua conta MedTech para abrir o SOS Farmácia Comercial." };
  new MutationObserver(corrige).observe(document.documentElement, { childList: true, subtree: true });

  function inicia() {
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
      colecoes: {},
      ler() { return undefined },
      gravar() {},
      aoReceber() {},
      async limparLocal() { /* nada é apagado (regra do dono) */ },
      aoEntrar(u) {
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
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inicia, { once: true });
  else inicia();
})();
