# Pontos para revisão humana (08/10/2026; módulos de farmacologia levados ao SOS Farmacologia em 15/10/2026)

Conteúdo escrito por 9 agentes com conferência na web (DOU, Anvisa, CFF, bulas, diretrizes). Abaixo, o que eles
declararam NÃO ter confirmado em fonte primária, ou mudanças normativas que merecem um olhar de farmacêutico.

## Mudanças normativas incorporadas (conferir se seguem vigentes na data da publicação)
- MIP: RDC 98/2016 **revogada** pela RDC 882/2024; lista vigente IN 285/2024 (alterada pelas IN 388/2025 e IN 404/2025,
  que incluiu omeprazol 20 mg). Pauta da Dicol de 05/08/2026 previa nova alteração da lista: conferir no DOU.
- **Resolução CFF 586/2013 declarada ilegal** em 1ª instância (sentença de 18/11/2024, ACP 0060624-78.2013.4.01.3400),
  com recurso do CFF pendente. Res. CFF 5/2025 suspensa por liminar; Res. CFF 12/2024 derrubada em 1ª instância.
  O módulo 1 explica a 586 por inteiro e informa a situação judicial. Conferir se o TRF1 decidiu depois de maio/2026.
- Portaria 344: Anexo I atualizado até a RDC 1.036/2026 (atualização nº 101); modelos de receituário revogados e
  substituídos pela RDC 1.000/2025 (CPF do paciente, talonário por gráfica, numeração da VISA via SNCR); receita
  eletrônica de controlados desde 30/09/2026 (RDC 1.028/2026); SNCR pela RDC 873/2024; SNGPC obrigatório em todo o
  país desde 02/01/2026; zolpidem em Notificação B desde 01/08/2024.
- RDC 471/2021 alterada pela RDC 973/2025 (agonistas de GLP-1 com retenção de receita, validade 90 dias);
  validade das receitas passou para a IN 360/2025 (antimicrobianos: 10 dias). Retém-se a 2ª via.
- Exames em farmácia: RDC 978/2025 revogou a RDC 786/2023 (farmácia = serviço tipo I).

## Não confirmado em fonte primária (por módulo)
**M1** Status MIP de desloratadina, meclozina e ibuprofeno gotas (estão na lista, bulas de marca dizem "sob
prescrição"); posologias lidas em reprodução de bula (o Bulário da Anvisa bloqueou acesso automatizado); doses
deixadas "conforme bula" (miconazol vaginal, carbocisteína, guaifenesina, picossulfato, amorolfina, ciclopirox);
notas Anvisa/Febrasgo sobre paracetamol na gestação (set/2025) lidas só em reportagem.

**M2** Número da RDC de 2024 do zolpidem; ordem exata dos campos nos modelos versão 2 da RDC 1.000/2025 (montados pelo
texto das normas, não pelo impresso); fim da transição das receitas eletrônicas sem número SNCR (29 ou 30/10/2026);
validade/abrangência da Notificação B2.

**M8 (RDC 471)** Inclusão de formas tópicas/oftálmicas na RDC 471 (leitura do texto, sem resposta explícita da Anvisa); coluna RDC 20/2011 do comparativo.

**M10/M11** Prazo de defesa de 15 dias (Lei 6.437/1977); divisão Notivisa × VigiMed; período fora da geladeira de
Humira e Mounjaro; lista ISMP de medicamentos potencialmente perigosos ambulatoriais.

## Módulo 12 (SNGPC), 10/10/2026
Telas conferidas no próprio sistema (docs/sngpc_visita.md). Ficaram sem confirmação em fonte primária: esquema XSD
do XML (403), se o webservice antigo já foi desligado em favor da API, códigos de classe e receituário dos GLP-1 no
XML, texto exato das mensagens de período fora de ordem, duplicidade e CPF/CRM inválido, prazo de baixa de RT no CRF.
Módulo 2 corrigido em 10/10: GLP-1 na abrangência do SNGPC; retirado o limite de 10 caracteres do campo (não
confirmado).

## Módulos novos da reorganização (15/10/2026)
Escritos por agentes com conferência na web; o Bulário da Anvisa e o portal de consultas bloquearam acesso automatizado,
então as bulas foram lidas em reprodução (Consulta Remédios) e o ano no campo "fonte" é o da página, não o da bula.
**Legislação (m13)** RDC 80/2006 sem texto consolidado; IN 9/2009 não aberta; regra de similar intercambiável em receita pela
DCB não encontrada (texto evita afirmar); Lei 15.357/2026 §6º x RDC 44/2009 art. 53 é interpretação.
**Vigilância (m14)** leiaute oficial dos Anexos XXI (BMPO) e XXIV (RMNRA) não obtido: colunas montadas pela lógica do
balanço e por orientações das VISAs de SP e Manaus (o quadro avisa); RDC 58/2007 (RMNRB2) tida como vigente; prazos de
licença e de termos variam por código sanitário local.
**Prateleiras (m15)** vigência atual da IN 9/2009; "validade mês/ano vale até o último dia" é prática, não norma; nenhuma
exigência federal de seção separada para genéricos; revisão da RDC 96/2008 aberta em 05/08/2026.
**Código MS e DCB (m16)** estrutura do número de 13 dígitos confirmada por dados abertos (Anvisa/CMED), não por norma;
algoritmo do dígito verificador não publicado; prefixos de cosmético/saneante/alimento/dispositivo pelos dados abertos;
números das IN de atualização da DCB de 2025/2026 por fontes setoriais.
**Serviços clínicos (m18)** RDC 986/2025 mudou as amostras do Tipo I (cavidade oral incluída; m01 e m10 corrigidos);
"glicemia acima de 250 mg/dL com sintomas: urgência" e "gestante com PA ≥ 140/90: pré-natal no mesmo dia" são condutas de
balcão, não números de diretriz; quantidade de carboidrato na hipoglicemia não citada; nebulização e testes rápidos de
HIV/sífilis/hepatites em farmácia dependem da VISA local.
**Calculadora (m19)** dipirona 10 a 15 mg/kg/dose vem do guia de dengue do MS e de artigo (a bula usa faixas de peso);
tetos de amoxicilina + clavulanato, cefadroxila e nitazoxanida deduzidos da dose de adulto; gotas/mL só de Tylenol®,
Novalgina®, Alivium® e Keflex®; azitromicina dose única de 30 mg/kg não cabe na calculadora (explicada em "obs").
**Bulário (m20, 119 itens)** divergências bula x lista de MIP: ibuprofeno 200 mg/mL e desloratadina (bulas dizem venda
sob prescrição); propranolol e outras apresentações "conforme o fabricante"; cianocobalamina sem bula de referência
(TelessaúdeRS 2023); colchicina com o esquema de dose baixa da EULAR 2016 ao lado do da bula; Plano B dos sais de
reidratação pela versão do cartaz do MS disponível na BVS.

## Calculadora ampliada (16/10/2026): 45 fármacos e parte b do módulo
Fármacos novos lidos em bula reproduzida (Consulta Remédios). Revisar: tetos deduzidos da dose de adulto (penicilina V,
doxiciclina, griseofulvina, betametasona, bromoprida, ambroxol, levetiracetam; dito em "obs"); contradições internas de
bula registradas em "obs" (Hixizine®: 0,7 mg/kg 3x/dia passa do teto de 2 mg/kg/dia; Cataflam® gotas x "não indicado
abaixo de 14 anos"; doxiciclina e o corte de 45 kg); sulfato ferroso: fabricante e volume de frasco não confirmados;
listas C1/B1 de carbamazepina, valproato e fenobarbital vindas do m02. Parte b: dose alta de amoxicilina pela AAP 2013
lida em resumo (AFP); volumes IM por idade de fonte secundária; fórmulas CKD-EPI 2021 e Mosteller escritas de memória
(exemplos recalculados); dipirona: SBP 2021 10 a 12 mg/kg, MS dengue 10 mg/kg, calculadora 10 a 15 (texto explica).
Ficaram fora da calculadora por falta de dose por peso na bula: fluconazol, aciclovir, nitrofurantoína, tinidazol,
mebendazol, albendazol, levamisol, ondansetrona oral, metoclopramida, salbutamol xarope, colecalciferol, dexametasona elixir.

## Calculadora com 99 linhas (22/10/2026)
Entraram dose por idade (`faixasIdade`: albendazol, mebendazol, levamisol, ondansetrona, salbutamol, vitamina D, simeticona,
cetirizina, desloratadina, fexofenadina, levocetirizina, ebastina, acetilcisteína, bromexina, guaifenesina, nistatina,
dexclorfeniramina solução, SRO Plano A, lactulose, montelucaste), anti-infecciosos sólidos e injetáveis (fluconazol,
cetoconazol, azitromicina, amoxicilina, amoxicilina + clavulanato e cefuroxima comprimidos, ciprofloxacino, ceftriaxona IM,
penicilina benzatina por faixa e na sífilis congênita, lincomicina, gentamicina adulto e criança, praziquantel 500 mg) e
outros (enoxaparina 2 esquemas, fondaparinux, prednisona, prednisolona e deflazacorte comprimidos, oxcarbazepina,
fenitoína, topiramato, carbamazepina, levetiracetam e XR, clobazam, fenobarbital comprimido, risperidona por faixa,
hidroxizina comprimido, furosemida, omeprazol MUPS, SRO Plano B). Revisar: vitamina D (bula do Addera D3® 400 UI até
2 anos x SBP 2014 600 UI de 12 a 24 meses; SBP 2024 vista só em resumo); SRO Plano A pelo cartaz antigo do MS e Plano B
pelo cartaz 2023 lido em cópia (BVS fora do ar); ceftriaxona 285 mg/mL declarado na bula x conta (cerca de 278);
gentamicina pediátrica e sífilis congênita (uso na farmácia a decidir); furosemida sem número de tomadas na bula;
fondaparinux 10 mg sem seringa única; tetos deduzidos da dose adulta (fluconazol, lincomicina) ditos em "obs".
Enoxaparina e fondaparinux: a bula fala em clearance; o texto lembra que o SOS estima a TFG pela CKD-EPI 2021.
