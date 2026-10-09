# SOS Farmácia Comercial

Material didático (11 módulos) para alunos do 9º/10º semestre de Farmácia e recém-formados, criado em 08/10/2026.
Público de farmácia: produto à parte, fora dos portais/vitrine MedTech, sem login. No ar desde 08/10/2026 em
https://medtechbr.com.br/sos-farmacia/ (repo público MedTechBR/sos-farmacia, Pages da main na raiz).
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
