# Visita ao SNGPC (10/10/2026), modo leitura

Feita com a conta de uma drogaria (login do dono), só por leitura das páginas (GET). Nenhum formulário foi
enviado. Nada de identificação do estabelecimento, de pessoas ou de estoque entra no material.

## Entrada (sngpc.anvisa.gov.br)
- "Acesso restrito": E-mail + Senha + reCAPTCHA + Entrar; "Esqueci minha senha".
- Botões "Entrar com gov.br" e "Entrar como Anvisa" (servidor da Anvisa).
- Página antiga em frames (cabeçalho, menu à esquerda, área de trabalho à direita); rodapé "SERV: nnn".

## Menu principal (9 itens)
1. **Dados da Empresa**: nome fantasia, razão social, CNPJ, CNAE, cidade, endereço, número da AFE, número da AE
   ("Inexistente" se não houver); "Dados dos responsáveis": cada Responsável Técnico com acesso ao SNGPC (nome,
   CRF/UF, e-mail) e o Responsável Legal com acesso (nome, e-mail). Só leitura.
2. **Alterar Dados CRF**: aviso "Prezado(a) RT, verificamos que os dados referentes à carteirinha de registro
   profissional (CRF) estão pendentes"; campos Número carteira CRF, Data de expedição, UF do órgão expedidor; Salvar.
3. **Inventário Inicial**: título INVENTÁRIO INICIAL; empresa, CNPJ, "Data de confirmação do inventário";
   tabela "Inventário Inicial do Estoque de Produtos" (Registro, Medicamento, Lote, Quantidade) e
   "Inventário Inicial do Estoque de Insumos Farmacêuticos". Enquanto não confirmado: campo de NÚMERO verificador
   e confirmação com o aviso "Uma vez confirmado este inventário não poderá ser modificado. Deseja realmente
   confirmar este inventário?". O inventário chega pelo arquivo XML do software e é CONFIRMADO aqui.
4. **Finalizar Inventário**: lista paginada (Registro, Medicamento, Lote, Quantidade); "Motivo da Finalização"
   com 7 opções: Ajuste de inventário (exige Justificativa); Desligamento do Responsável Técnico: rescisão
   contratual e/ou baixa de responsabilidade técnica; Determinação da autoridade sanitária; Encerramento das
   atividades com produtos controlados; Férias; Licença; Substituição temporária de Responsável Técnico.
   "Favor confirmar o código abaixo para validar as informações" (código verificador) e botão
   "Finalizar Inventário" com confirmação "Deseja realmente finalizar este inventário?".
5. **Informar Ausência**: "Informar ausência do Responsável Técnico" > "Informar Ausência Temporária": Data início
   e Data final; botão "Incluir Ausência"; lista "Ausências do Responsável Técnico". Regras do formulário:
   início e fim não podem ser anteriores à data atual (não se informa ausência passada); o período tem no máximo
   30 dias; fim maior que início; não pode sobrepor o último período cadastrado.
6. **Visualizar Inventário**: "POSIÇÃO ATUAL DO INVENTÁRIO": data de confirmação do inventário, data da
   visualização/geração do relatório, data da validação do último arquivo, data final do último período informado;
   tabelas de medicamentos (Registro, Medicamento, Apresentação, Forma farmacêutica, Qtd, Hist), medicamentos
   transformados e insumos farmacêuticos; passar o mouse mostra fabricante e classe; clicar abre a janela do lote
   (Dados do medicamento + "Selecione Lote"); botão IMPRIMIR. É o espelho do estoque que a Anvisa tem.
7. **Transmissão de arquivos**: "Transmissão de arquivos de Movimentação do SNGPC. Clique em Procurar para localizar
   o arquivo XML compactado em formato ZIP no seu computador e, em seguida, no botão Enviar." Campos: arquivo,
   E-mail, Senha; botão Enviar. Mensagens: "Informar localização do arquivo compactado no formato ZIP."; "O arquivo
   XML a ser enviado deve estar compactado no formato ZIP."
8. **Relatórios** (troca o menu): 
   - **Certificado de transmissão regular**: emite certificado; se irregular: "A referida empresa não está regular
     na transmissão de arquivos, estando impossibilitada de emitir o Certificado de Regularidade de Transmissão",
     com a data do último arquivo enviado. Regra exibida: regular = pelo menos 4 arquivos validados e aceitos nos
     últimos 30 dias E data final do período do último arquivo até 10 dias antes da data de geração.
   - **Histórico de Inventários**: por inventário: DT início, DT finalização, motivo da finalização, RT (nome/CRF),
     DT do último arquivo enviado, justificativa, ausências do período, quantidade de medicamentos e insumos no
     início e na finalização; marca "Inventário em Andamento". Motivo de sistema visto: "Alteração de RTT pelo
     Sistema de Segurança".
   - **Histórico de Movimentações**: tipo (Insumo, Medicamento, Transformado) > filtros Data início, Data final,
     Número de registro (MS), Número do lote, Nome do medicamento > "Gerar Relatório". Mensagens: "A data início não
     pode ser maior que a data fim!", "O registro MS digitado não pertence ao inventário!".
   - **Certificado de Escrituração Digital**: gera PDF.
   - **Status de Transmissão**: por arquivo: Hash de identificação, Data inicial, Data final (período), Data de
     recebimento, Data de validação, Validação executada (SIM/NÃO), Foi aceito? (SIM/NÃO); botões Imprimir e Mais.
   - Voltar.
9. **Sair do Sistema**.

## O que o sistema NÃO faz pela web
Não há digitação de entradas e saídas no site: toda movimentação (e o inventário inicial) vem do software de
gestão da farmácia em XML, compactado em ZIP, enviado na Transmissão de arquivos (ou direto pelo software, quando
ele transmite). No site o RT confirma inventário, finaliza inventário, informa ausência, atualiza CRF e consulta.
