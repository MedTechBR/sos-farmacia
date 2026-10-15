# SOS Farmácia Comercial

Material didático para alunos do 9º/10º semestre de Farmácia e recém-formados, criado em 08/10/2026 (11 módulos);
**reorganizado em 15/10/2026 em 14 módulos só da rotina da farmácia comercial** (ver "Reorganização" no fim).
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


## Gestão da farmácia (15/10/2026)
O FarmáciaGest (escala, trocas, banco de horas, recebimento, divergências, validade) entrou no SOS como área própria:
`gestao/index.html` (no ar em medtechbr.com.br/sos-farmacia/gestao/), com o visual do SOS (barra lateral agrupada,
cor por seção via `body[data-aba]`, título com selo; celular com barra de 4 + gaveta "Mais"). Gerado uma vez por
`ferramentas/monta_gestao.py` + `ferramentas/gestao_casca.css` a partir de `~/Documents/Claude/farmacia/index.html`;
**daqui em diante `gestao/index.html` é a fonte** (editar direto; não rodar o monta_gestao de novo sem reaplicar o que
mudou). `#secao` no endereço abre a seção (`#validade`, `#receb`…). Tema na chave `sos-farmacia:tema`.
- Conta: mesmo carregador do SOS (só no site; `?portao=1` no localhost) com `../mtsync.js`, `/_mtacesso.js` e
  `gestao/conta-gestao.js`: compra do produto `sosfarmacia`; dados SOBEM (diferente do SOS) pelo motor do mtsync em
  `users/{uid}/apps/sosgestao/sync`, uma coleção por chave `fg_*` (listas por `id`, feriados por `data`, minimos e
  valcfg como `doc`). App expõe `window.FG` (ler/gravar/aoReceber/juntarAntigo/naConta); `saveAll` chama `MTS.mudou`.
- Importação do FarmáciaGest antigo (`apps/farmaciagest`, documento único com JSON) no `legado` do mtsync, SÓ se a área
  nova da conta estiver vazia (senão ressuscitaria excluídos num segundo aparelho). Junta por id; o local vence.
- Mesma origem do app antigo (medtechbr.com.br/farmaciagest/): as chaves `fg_*` do aparelho são as mesmas, então quem
  usava lá abre com os dados aqui. O app antigo segue no ar, sem mudança.
- Teste sem conta real: copiar `gestao/index.html` para `gestao/teste-fake.html` com `<script src="fake-firebase.js">`
  (de `_mtsync`) antes do carregador, `localStorage.__fakeUser`, abrir com `?portao=1`; apagar a cópia depois.
- No SOS: `itemGestao()` na barra lateral (grupo Ferramentas) e na gaveta, faixa `.vGestao` com 4 atalhos no início,
  "Gestão da farmácia" no "Mais".

## Reorganização (15/10/2026)
Pedido do dono: ficar só com os temas da farmácia comercial. Ordem (num) e id do arquivo:
1 Legislação farmacêutica (m13) · 2 Portaria 344/98 (m02) · 3 RDC 471/2021 (m08) · 4 Termolábeis (m11) · 5 SNGPC (m12, m12b)
· 6 Vigilância sanitária: balanços, BMPO, RMNRA (m14) · 7 POPs (m10) · 8 Prateleiras, validade e etiquetagem (m15)
· 9 Código MS e DCB (m16) · 10 Trier Sistemas (m17, ex-m12c + simulador do Trier) · 11 Serviços clínicos (m18)
· 12 MIP (m01a, m01b) · 13 Calculadora de dose (m19) · 14 Bulário (m20).
**Ids antigos mantidos de propósito** (progresso salvo no aparelho é por id de módulo/tópico/bloco); a ordem vem do `num`.
Saíram m03a, m03b, m04, m05, m06, m07, m09 (farmacologia por sistemas e interações): copiados para
`~/Documents/Claude/sos-farmacologia/herdado/` (com PDFs e pendências) para o app novo **SOS Farmacologia**;
prompt de abertura em `~/Documents/Claude/sos-farmacologia/PROMPT-INICIAL.md`.
Blocos novos: `calculadora` (fármacos por peso, tetos, mL/gotas/frascos, cálculo livre e quantidade a dispensar) e
`bulario` (busca, filtro por grupo e por regime de venda, itens em `<details>`); formato no docs/BRIEF.md
("Blocos especiais"); edição em JSON. Módulos que têm um desses blocos aparecem na barra lateral no grupo
**Ferramentas** (abrem direto no bloco), não em Módulos. Os itens do bulário foram escritos em 3 partes
(m20 + `trabalho/bulario_b.json` + `trabalho/bulario_c.json`) e juntados no bloco `m20-bulario`.
Pendente: planilha da DCB que o dono vai mandar (virar tabela de consulta no módulo m16).
