# SOS Farmácia Comercial

Material didático (11 módulos) para alunos do 9º/10º semestre de Farmácia e recém-formados, criado em 08/10/2026.
Público de farmácia. No ar desde 08/10/2026 em https://medtechbr.com.br/sos-farmacia/ (repo público
MedTechBR/sos-farmacia, Pages da main na raiz). **Desde 10/10/2026 é vendido no MedTech** (produto `sosfarmacia` do
`planos.json` do site, linha provas, publico farmacia, R$ 49,90/mês ou R$ 397/ano; aparece no portal Provas, na
vitrine e nas liberações do admin) e, **no site, só abre com conta MedTech e compra** (ver "Conta e venda").
Publicar: `python3 monta.py && cp SOS-Farmacia-Comercial.html index.html`, commit e push; conferir por hash.

- Entregável: `SOS-Farmacia-Comercial.html` (arquivo único, offline, editável no próprio app, "Salvar arquivo"
  regrava o HTML com os dados novos). PDFs em `pdf/` (marca-d'água em toda página, mapas em página paisagem).
- Fonte: `conteudo/mNN[a|b].json` (partes juntadas pelo `monta.py` na ordem da letra) + `fonte/` (casca, CSS, JS).
- Fluxo: `python3 ferramentas/checa.py conteudo/*.json` → `python3 monta.py` → `python3 ferramentas/gera_pdfs.py`.
  Se o dono editou e salvou pelo app: `python3 ferramentas/importa.py` ANTES do monta (o monta recusa sem isso).
- Teste: `SOS_CONTEUDO=_teste SOS_SAIDA=_teste/teste.html python3 monta.py` (fixture com todos os tipos de bloco).
  Preview: entrada `sos-farmacia` (porta 8795) no ~/.claude/launch.json.
- Regras de conteúdo e escrita: `docs/BRIEF.md`. Pendências de conferência: `docs/REVISAO.md`.

Armadilhas: o app.js é embutido inline, então nunca pode conter `</script` literal (o monta recusa); o
"Salvar arquivo" usa uma cópia do DOM tirada antes do primeiro desenho (ORIGEM) e troca só o bloco
`<script id="sos-dados">`. Chrome headless grava o PDF e às vezes não encerra: o gera_pdfs espera o arquivo
estabilizar e mata o processo. Na grade do resumo, coluna única precisa ser `minmax(0,1fr)` (tabela larga
empurrava o layout do celular para 600 px).

Visual (08/10/2026, após reprovação da 1ª versão "cara de IA"): sistema do FarmaUTI (tokens, barra lateral agrupada,
início com destaque e anel, leitura com sumário lateral, questões e cartões um por vez, fonte do sistema, modo
escuro). Mapa mental vivo em `desenhaMapa()`: galhos afunilados, ícone por ramo via `iconesMapa()` (sem repetir no
mapa; glifos injetados pelo monta em `/*GLIFOS*/`), viewBox ajustado aos limites, brota ao abrir, foco/zoom no
clique, "Teste-se", vista em cartões (padrão no celular). Armadilhas: CSS `text{font-family}` sobrepõe o atributo do
SVG (ícone vira quadrado; usar classe `mm-ico`); aba em segundo plano congela requestAnimationFrame e animações
(animaVB tem setTimeout de garantia; prints de aba oculta saem transparentes); Chrome headless não fica abaixo de
~500 px de largura (testar celular no navegador embutido); `ferramentas/foto.py URL saida.png L A --claro`.

## Conta e venda (10/10/2026)
- `fonte/casca.html` tem no `<head>` um carregador: só em http(s) fora do localhost (ou no localhost com `?portao=1`,
  para teste) ele marca `window.__sosPortao` e escreve `mtsync.js` (portão de login, cópia SEM mudança de
  `~/Documents/Claude/_mtsync/`), `/_mtacesso.js?v=N` (compra/tela de assinatura do site; subir o `?v=` junto com o
  site) e `conta-sos.js`. Aberto do computador (file://), no `gera_pdfs.py` ou na prévia do localhost: nada disso
  carrega e o app é a ferramenta do dono, igual a antes.
- `conta-sos.js`: `MTS.iniciar` sem coleções (o progresso do SOS NÃO sobe para a nuvem; fica nas chaves
  `sos-farmacia:*` do aparelho) e, depois do login, `MTAcesso.verificar({appId:'sosfarmacia'})`. Administração
  (claim `mt.adm`) chama `SOS.liberarEdicao()`: modo edição, "Salvar arquivo", importar/exportar e marca-d'água livres,
  e o aviso do rascunho. Cliente (`SOS.cliente(email)`): só leitura e estudo; botões Editar/Salvar escondidos
  (`body.sos-leitura`), Ajustes só com a conta e "Zerar meu progresso", PDF e Ctrl+P com a marca-d'água travada em
  "Licenciado para <e-mail>", `?pdf=` desligado. O rascunho de edição antigo que estiver no navegador do cliente fica
  guardado, sem aviso.
- REGRA DO DONO: nada salvo no aparelho é apagado por causa da conta (limparLocal vazio; o mtsync só mexe em
  `sos-farmacia:mts` e `sos-farmacia:mts_uid`).
- `ORIGEM` (base do "Salvar arquivo") sai limpa do que o portão põe na página (classe `mts-trava`, `#mtsCSS`, `--mts-*`
  e os scripts `[data-sos-portao]`); o carregador do `<head>` fica no arquivo salvo (é inofensivo no file://).
- Teste sem backend: cópia do index com `fake-firebase.js` (de `_mtsync`, com `getIdTokenResult` lendo
  `localStorage.__fakeClaims`) antes do carregador, servida junto de uma cópia do site, URL com `?portao=1`.


## Módulo 12: Passo a passo do SNGPC (10/10/2026)
`m12.json` (parte a, normas e rotina, por agente com fontes) + `m12b.json` (tela a tela, mapa, tabela, cartões,
questões). Bloco novo `simulador` (réplica de sistema com dados fictícios: menu clicável, elementos
titulo/texto/campo/select/tabela/botoes/aviso/arquivo/links com marcador `n`, notas numeradas; edição em JSON;
no PDF uma tela por página). Telas do SNGPC levantadas com a conta do dono só por GET, sem enviar formulário:
`docs/sngpc_visita.md` (sem dado real). Mesmo procedimento para outros sistemas: o dono entra, eu leio as páginas por
fetch GET, mascaro números e nomes, nunca submeto formulário nem clico em ação (confirmar, finalizar, enviar).
