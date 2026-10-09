# Brief de conteúdo do SOS Farmácia Comercial

Material didático em 11 módulos para **alunos de Farmácia do 9º e 10º semestres e farmacêuticos recém-formados**
que vão trabalhar (ou já trabalham) em **farmácia comercial e drogaria**. O objetivo é a pessoa chegar ao balcão
sabendo agir: dispensar com segurança, orientar, reconhecer quando encaminhar, cumprir a legislação sanitária e
registrar o que faz. Cada módulo tem três tipos de conteúdo: **Resumo para leitura**, **Mapa mental** (colorido,
didático) e **Material de apoio** (tabelas, quadros, fluxos, checklists, modelos, cartões e questões de fixação).

Pasta do projeto: `/Users/matheusparente/Documents/Claude/sos-farmacia/`. Hoje é **08/10/2026**.

## Regra de ouro: rigor técnico e legal

- **Nunca escrever dose, prazo, lista, limite de quantidade ou regra legal de memória sem conferir.** Use
  WebSearch/WebFetch para confirmar a versão VIGENTE em outubro de 2026. Normas sanitárias mudam e o seu
  conhecimento de treino pode estar defasado. Antes de escrever sobre qualquer norma, procure se ela foi
  alterada, revogada ou substituída (ex.: a lista de MIP é atualizada por Instrução Normativa; as listas da
  Portaria 344/98 são atualizadas por RDC várias vezes por ano; o SNGPC e o SNCR passaram por mudanças
  recentes; confira se a RDC 471/2021, a RDC 44/2009 e a RDC 430/2020 seguem vigentes ou foram alteradas).
- Fontes preferidas: **gov.br/anvisa** e **in.gov.br** (Diário Oficial), **cff.org.br**, Ministério da Saúde
  (Formulário Terapêutico Nacional, RENAME vigente, cadernos de atenção básica), bulas do Bulário Eletrônico da
  Anvisa (bula do profissional), diretrizes de sociedades (SBC, SBD, SBEM, SBPT, GINA, GOLD, ASBAI), ISMP Brasil.
  Para interações: Stockley, Lexicomp/Micromedex citados por título, FDA/EMA, bulas.
- **Cite fonte e ano** ao lado de cada regra relevante (ex.: "(RDC 471/2021, art. 6º)") e liste as fontes
  conferidas no campo `fontes`. Nunca invente número de artigo, de norma, URL, dose ou ano. Se não conseguiu
  confirmar, escreva de forma que não dependa do dado ou diga que varia (ex.: "conforme a bula do produto").
- **Cota de buscas: no máximo 16 WebSearch por agente** (a sessão inteira tem um teto ~200). Prefira WebFetch
  direto em fonte conhecida (gov.br/anvisa, in.gov.br, cff.org.br, consultas.anvisa.gov.br) a buscar de novo.
- Doses sempre de **adulto** salvo quando a linha disser criança/gestante, em notação brasileira (vírgula
  decimal: 0,5 mg/kg), com unidade explícita (mg, mcg, mL, UI, gotas) e via. Não usar "U" para unidades nem
  "µg" (use mcg); sem zero à direita (5 mg, não 5,0 mg); sem vírgula sem zero à esquerda (0,5 e não ,5).
- Contexto **brasileiro**: nomes pela DCB, apresentações e marcas que existem no Brasil quando ajudar o balcão
  (ex.: "dipirona (Novalgina®)" uma vez, depois só DCB). Disponibilidade no Brasil importa.
- Função renal: estimar TFG por **CKD-EPI 2021 (sem raça)**; nunca Cockcroft-Gault como padrão.
- Direito autoral: escreva texto **próprio**. Não copie parágrafos de livros, bulas ou apostilas. Texto de
  norma (lei, RDC, portaria, resolução) é ato oficial e pode ser citado literalmente em trechos curtos.

## Regras de escrita (o dono rejeita "cara de texto gerado por IA")

- Português do Brasil, registro de manual técnico claro, para estudante. **Explique o básico antes de
  aprofundar** (o leitor é aluno de fim de curso: sabe farmacologia de base, mas não sabe a rotina do balcão).
- **Travessão (—, –) proibido.** Use vírgula, dois-pontos, parênteses ou ponto.
- Títulos de tópico e `<h3>` são **substantivos** ("Analgésicos e antitérmicos", "Validade da receita"),
  nunca "Assunto: manchete", nunca numerados, nunca em CAIXA ALTA.
- Sem metanarração: proibido "Neste módulo", "Neste tópico", "Vamos ver", "Em resumo", "É importante
  ressaltar", "Vale lembrar", "Vale destacar", "Fique atento", "Não é X, é Y". Sem frase de efeito, sem
  slogan, sem pergunta retórica, sem fechamento de seção com aforismo.
- **Sem emoji** em nenhum lugar. Negrito com parcimônia (termos-chave, no máximo ~1 por parágrafo).
- Frases informativas e curtas. Exemplos de balcão (casos curtos: "Cliente de 34 anos pede…") são bem-vindos.

## Formato de entrega: um arquivo JSON por parte

Cada agente grava `conteudo/<arquivo>.json` (UTF-8, JSON válido, sem comentários). Depois de gravar, rode
`python3 ferramentas/checa.py conteudo/<arquivo>.json` e corrija até sair `OK`.

```json
{
  "id": "m01",
  "num": 1,
  "parte": "a",
  "titulo": "Medicamentos isentos de prescrição",
  "escopo": "Uma ou duas frases: o que o módulo cobre e as normas/fontes principais.",
  "topicos": [
    { "id": "m01-mip-conceito", "titulo": "Conceito e enquadramento", "resumo": "<p>…</p>" }
  ],
  "mapas": [
    { "id": "m01-mapa-geral", "titulo": "MIP: visão geral", "centro": "MIP",
      "ramos": [ { "t": "Conceito", "itens": ["Item curto", "Item curto"] } ] }
  ],
  "apoio": [ { "tipo": "tabela", "id": "m01-tab-x", "titulo": "…", "colunas": ["…"], "linhas": [["…"]] } ],
  "fontes": [ "Anvisa. RDC nº 98, de 1º de agosto de 2016. Diário Oficial da União, 2016." ]
}
```

- `id` do módulo (`m01`…`m11`), `num`, `titulo`, `escopo`: iguais em todas as partes do mesmo módulo.
  `parte`: "a", "b"… quando o módulo for escrito por mais de um agente (o app junta na ordem). Ids internos
  únicos e com o prefixo do módulo.

### Resumo para leitura (`topicos[].resumo`)

Fragmento HTML. Permitido: `<p> <h3> <h4> <ul> <ol> <li> <strong> <b> <em> <i> <br> <sup> <sub>`, tabelas e
caixas abaixo. Nada de `<h1>`, `<h2>` (o título do tópico já é o h2), `<style>`, `<script>`, `style=""`, `<img>`.

- Tabelas sempre embrulhadas: `<div class="tab"><table><thead><tr><th>…</th></tr></thead><tbody>…</tbody></table></div>`.
  Até 6 colunas; célula curta. Tabela é o melhor jeito de apresentar classes, doses e prazos.
- Caixas (use ao longo do texto, sem exagero):
  - `<div class="cx chave"><b>Ponto-chave</b><p>…</p></div>`
  - `<div class="cx alerta"><b>Atenção</b><p>…</p></div>` (risco, erro grave, infração sanitária)
  - `<div class="cx balcao"><b>No balcão</b><p>…</p></div>` (o que perguntar, como orientar, quando encaminhar) **obrigatória: ao menos uma por tópico de conteúdo clínico**
  - `<div class="cx lei"><b>O que diz a norma</b><p>…</p></div>` (trecho curto da norma com artigo e número)
  - `<div class="cx exemplo"><b>Caso</b><p>…</p></div>` (situação curta de balcão resolvida)
- Extensão: indicada na sua tarefa. Cada tópico com começo (conceito), meio (detalhe técnico) e o que fazer.

### Mapa mental (`mapas[]`)

Um mapa por grande assunto do módulo (1 a 4 por parte). Cada mapa: `centro` (até 28 caracteres),
**4 a 6 ramos**; cada ramo com `t` (até 26 caracteres) e **2 a 5 itens**; cada item com **até 60 caracteres**
(telegráfico: "Validade: 30 dias", "IECA + espironolactona: hipercalemia"). Item pode ser objeto
`{ "t": "Item", "itens": ["sub", "sub"] }` para um terceiro nível (até 3 subitens de até 45 caracteres), use pouco.
O mapa tem que ensinar sozinho: é a revisão de véspera, não um índice dos tópicos.

### Material de apoio (`apoio[]`)

Lista de blocos. Tipos (todos com `id` e `titulo`):

- `tabela`: `colunas` (até 6), `linhas` (lista de listas de texto; pode usar `<b>`, `<i>`, `<br>`), `nota` opcional.
- `quadro`: `html` (mesmas regras do resumo). Para comparativos, esquemas de texto, glossários.
- `checklist`: `itens` (lista de frases curtas, verificáveis: "Conferir a data de emissão").
- `fluxo`: `passos`: lista de `{ "t": "texto", "tipo": "inicio|acao|decisao|alerta|fim", "sim": "…", "nao": "…" }`
  (`sim`/`nao` só em `decisao`, descrevem o que fazer em cada saída). 5 a 12 passos.
- `cartoes`: `itens` de `{ "f": "frente (pergunta curta)", "v": "verso (resposta curta)" }`. 10 a 20 por parte.
- `questoes`: `itens` de `{ "p": "enunciado", "alt": ["A", "B", "C", "D", "E"], "c": 0, "com": "comentário" }`
  (`c` = índice da correta, 0 a 4). **8 a 12 por parte**, no estilo de concurso/residência/prova de conselho,
  com casos de balcão. Distribua a correta entre as posições (não deixe sempre na mesma letra) e **não faça a
  correta ser a alternativa mais longa** (viés clássico de questão gerada). Comentário explica por que a correta
  está certa e por que as erradas estão erradas, citando a norma ou a fonte.
- `receita`: modelo visual de receituário (só módulos 2 e 8). Campos:
  `{ "tipo":"receita", "id":"…", "titulo":"Notificação de Receita A", "cor":"amarela|azul|branca",
     "subtitulo":"Listas A1, A2 e A3", "numeracao":"texto sobre a numeração (ex.: fornecida pela VISA / SNCR)",
     "secoes":[ { "t":"Identificação do emitente", "campos":["Nome","Inscrição no conselho","Endereço completo"] } ],
     "regras":[ ["Validade","30 dias a contar da emissão"], ["Abrangência","…"], ["Quantidade máxima","…"] ],
     "obs":"observação curta" }`
  Os campos devem reproduzir os campos obrigatórios do modelo oficial (anexos da Portaria 344/98 e normas
  posteriores), na ordem do impresso.
- `pop`: modelo de Procedimento Operacional Padrão (módulos 10 e 11):
  `{ "tipo":"pop", "id":"…", "titulo":"Recebimento de medicamentos", "codigo":"POP-REC-01", "objetivo":"…",
     "abrangencia":"…", "responsaveis":["…"], "materiais":["…"], "procedimento":["passo 1","passo 2"],
     "cuidados":["…"], "registros":["…"], "referencias":["RDC 44/2009", "…"] }`

Cada parte deve ter, no mínimo: 1 mapa, 1 tabela, 1 fluxo ou checklist, 1 bloco de cartões e 1 bloco de questões.

### Fontes (`fontes`)

Lista de referências conferidas (entidade/autor, título, número e data da norma, ano). Só o que você realmente
consultou. Pode incluir a URL oficial no fim.

## Antes de entregar

1. `python3 ferramentas/checa.py conteudo/<arquivo>.json` até `OK`.
2. Reler procurando: dose sem unidade, regra sem fonte, travessão, frase proibida, correta mais longa.
3. Na resposta final ao coordenador: arquivos gravados, contagem (palavras, tópicos, questões, cartões), e uma
   lista honesta do que NÃO conseguiu confirmar na web (para revisão humana).
