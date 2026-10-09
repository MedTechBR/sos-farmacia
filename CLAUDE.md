# SOS Farmácia Comercial

Material didático (11 módulos) para alunos do 9º/10º semestre de Farmácia e recém-formados, criado em 08/10/2026.
Público de farmácia: produto à parte, fora dos portais/vitrine MedTech, sem login. Não publicado (decisão do dono).

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
