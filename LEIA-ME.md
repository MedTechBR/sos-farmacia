# SOS Farmácia Comercial

Material para alunos do 9º e 10º semestres de Farmácia e farmacêuticos recém-formados.
11 módulos, cada um com **Resumo para leitura**, **Mapa mental** e **Material de apoio**
(tabelas, quadros, fluxos, checklists, modelos de receita, POPs, cartões e questões).

## O arquivo

`SOS-Farmacia-Comercial.html`: é o aplicativo inteiro, em um arquivo só, que funciona sem internet.
Abra com dois cliques (Chrome ou Edge recomendados). Pode copiar para pendrive, Drive ou mandar por e-mail.

## No site (medtechbr.com.br/sos-farmacia/)

Desde 10/10/2026 o SOS é vendido no MedTech (R$ 49,90 por mês ou R$ 397 por ano). No site ele pede login com a
conta MedTech e, sem compra, mostra a tela de assinatura. Só a conta de administração vê Modo edição e Salvar
arquivo; o cliente lê, estuda e gera PDF com a marca-d'água "Licenciado para" o e-mail dele. O progresso fica no
aparelho. O arquivo aberto do computador continua funcionando como antes, sem login.

## Modificar o conteúdo

1. Clique em **Modo edição** (barra da esquerda).
2. No **Resumo**: clique no texto e edite. A barra preta tem negrito, itálico, subtítulo, listas, as caixas
   (Ponto-chave, Atenção, No balcão, Norma, Caso) e tabela. Os botões ao lado do título sobem, descem ou
   excluem o tópico. No fim da página: **Novo tópico**.
3. No **Mapa mental**: o lápis abre o mapa como texto (linha sem traço = ramo; `- item`; `-- subitem`).
4. No **Material de apoio**: o lápis abre cada bloco em texto simples (a ajuda aparece em cima do campo).
   No fim da página dá para criar bloco novo de qualquer tipo.
5. Clique em **Salvar arquivo**. O navegador pergunta onde gravar: escolha o mesmo
   `SOS-Farmacia-Comercial.html` para substituir (ou outro nome para guardar uma versão).

Enquanto você não salva, as mudanças ficam guardadas no navegador e aparece um aviso amarelo.
Se fechar sem salvar, ao abrir de novo o app oferece **Recuperar alterações**.
Em **Ajustes** dá para exportar e importar o conteúdo (.json) como cópia de segurança.

## Gerar PDF

Botão **Gerar PDF**: escolha o módulo (ou todos), as partes (capa, resumo, mapas, apoio, gabarito) e o
texto da marca-d'água (ex.: "Licenciado para Fulano" na segunda linha). Na janela que abre, destino
**Salvar como PDF**. Todo PDF sai com marca-d'água em todas as páginas, numeração e mapas mentais em
página deitada. Mesmo o Ctrl/Cmd+P comum sai com marca-d'água.

PDFs prontos ficam na pasta `pdf/` (um por módulo e um completo).

## Para quem mantém pelo computador (pasta do projeto)

- `conteudo/*.json`: conteúdo de cada módulo (fonte). `fonte/`: código do app.
- `python3 monta.py`: gera o `SOS-Farmacia-Comercial.html`.
- `python3 ferramentas/importa.py`: traz para `conteudo/` as edições feitas dentro do app
  (rodar antes do `monta.py` quando alguém editou e salvou pelo app).
- `python3 ferramentas/gera_pdfs.py`: gera todos os PDFs em `pdf/` (aceita `--marca2 "Licenciado para ..."`).
- `python3 ferramentas/checa.py conteudo/*.json`: valida o conteúdo (formato, travessão, frases proibidas).
- `docs/BRIEF.md`: regras de conteúdo e escrita. `docs/REVISAO.md`: pontos para revisão humana.
