-- Seed do concurso SEFAZ-AL a partir do esboço de edital
-- (o arquivo original sefaz.odt foi perdido numa exclusão acidental de
-- pasta local — o conteúdo abaixo já estava aplicado no banco e é
-- mantido aqui só como referência/histórico, não precisa rodar de novo).
--
-- JÁ APLICADO no banco em produção (sjmzlqkqabjpybksmgys) em 2026-08-29.
--
-- Cobre a Prova P1 (Conhecimentos Básicos) e a Prova P2 (Conhecimentos
-- Específicos). A Prova P3 (discursiva) NÃO está incluída: o app hoje
-- só sabe lidar com questões objetivas (certo_errado / multipla_escolha).
--
-- Confirmado por pesquisa: banca é CEBRASPE, todos os itens objetivos
-- (P1 e P2) são no formato Certo/Errado, não múltipla escolha.

BEGIN;

WITH c AS (
  INSERT INTO concursos (nome, slug, status, pontuacao_tipo, ativo)
  VALUES ('SEFAZ-AL', 'sefaz-al', 'pronto', 'cebraspe', true)
  RETURNING id
),
g_basicos AS (
  INSERT INTO grupos (concurso_id, nome, ordem)
  SELECT id, 'Conhecimentos Básicos', 0 FROM c
  RETURNING id
),
g_especificos AS (
  INSERT INTO grupos (concurso_id, nome, ordem)
  SELECT id, 'Conhecimentos Específicos', 1 FROM c
  RETURNING id
),
d AS (
  INSERT INTO disciplinas (grupo_id, nome)
  SELECT gb.id, x.nome
  FROM g_basicos gb, (VALUES
    ('Matemática Financeira'),
    ('Direito Constitucional'),
    ('Direito Administrativo'),
    ('Contabilidade Geral'),
    ('Direito Tributário'),
    ('Estatística e Probabilidade'),
    ('Contabilidade Pública'),
    ('Economia')
  ) AS x(nome)
  UNION ALL
  SELECT ge.id, x.nome
  FROM g_especificos ge, (VALUES
    ('Finanças Públicas'),
    ('Legislação Tributária Estadual'),
    ('Inteligência Artificial'),
    ('Desenvolvimento de Sistemas'),
    ('Infraestrutura de TIC e Segurança da Informação'),
    ('Reforma Tributária'),
    ('Auditoria Fiscal'),
    ('Ciência de Dados')
  ) AS x(nome)
  RETURNING id, nome
)
INSERT INTO conteudos (disciplina_id, nome)
SELECT d.id, t.nome
FROM d
JOIN (VALUES
  -- Matemática Financeira
  ('Matemática Financeira', 'Regra de três e proporcionalidades'),
  ('Matemática Financeira', 'Juros simples e compostos'),
  ('Matemática Financeira', 'Capitalização e desconto'),
  ('Matemática Financeira', 'Taxas (nominal, efetiva, equivalente, real, aparente)'),
  ('Matemática Financeira', 'Rendas'),
  ('Matemática Financeira', 'Sistemas de amortização (Price, SAC, SAM)'),
  ('Matemática Financeira', 'Cálculo financeiro'),
  ('Matemática Financeira', 'Avaliação de projetos'),
  ('Matemática Financeira', 'TIR'),
  -- Direito Constitucional
  ('Direito Constitucional', 'CF/88'),
  ('Direito Constitucional', 'Aplicabilidade das normas'),
  ('Direito Constitucional', 'Direitos e garantias fundamentais'),
  ('Direito Constitucional', 'Organização político-administrativa'),
  ('Direito Constitucional', 'Administração pública'),
  ('Direito Constitucional', 'Poder Executivo'),
  ('Direito Constitucional', 'Poder Legislativo (estrutura, processo legislativo, CPIs)'),
  ('Direito Constitucional', 'Poder Judiciário'),
  ('Direito Constitucional', 'Funções essenciais à justiça'),
  ('Direito Constitucional', 'Controle de constitucionalidade (inclusive súmula vinculante)'),
  ('Direito Constitucional', 'Ordem econômica'),
  ('Direito Constitucional', 'Finanças públicas'),
  -- Direito Administrativo
  ('Direito Administrativo', 'Estado, governo e Adm. Pública'),
  ('Direito Administrativo', 'Direito Adm. (conceito, fontes)'),
  ('Direito Administrativo', 'Ato administrativo (requisitos, atributos, extinção)'),
  ('Direito Administrativo', 'Agentes públicos (cargo, emprego, estabilidade, processo disciplinar)'),
  ('Direito Administrativo', 'Poderes da Adm.'),
  ('Direito Administrativo', 'Regime jurídico-administrativo (princípios)'),
  ('Direito Administrativo', 'Responsabilidade civil do Estado'),
  ('Direito Administrativo', 'Serviços públicos (concessão, permissão)'),
  ('Direito Administrativo', 'Organização administrativa (centralização, descentralização, autarquias, OS, OSCIP)'),
  ('Direito Administrativo', 'Controle da Adm. (improbidade - Lei 8.429)'),
  ('Direito Administrativo', 'Processo adm.'),
  ('Direito Administrativo', 'Licitações e contratos (Lei 14.133/2021 e Decreto 11.462/2013)'),
  -- Contabilidade Geral
  ('Contabilidade Geral', 'Conceitos e finalidades'),
  ('Contabilidade Geral', 'Patrimônio (equação, situação líquida)'),
  ('Contabilidade Geral', 'Atos e fatos adm.'),
  ('Contabilidade Geral', 'Contas (débito, crédito)'),
  ('Contabilidade Geral', 'Plano de contas'),
  ('Contabilidade Geral', 'Escrituração (lançamentos, regime caixa/competência)'),
  ('Contabilidade Geral', 'Operações diversas (juros, tributos, folha, depreciação)'),
  ('Contabilidade Geral', 'Balancete'),
  ('Contabilidade Geral', 'Balanço Patrimonial'),
  ('Contabilidade Geral', 'DRE'),
  ('Contabilidade Geral', 'NBC'),
  -- Direito Tributário
  ('Direito Tributário', 'Sistema Tributário Nacional (princípios, limitações)'),
  ('Direito Tributário', 'Conceito e princípios'),
  ('Direito Tributário', 'Tributos (espécies, impostos da União/Estados/Municípios, imunidades)'),
  ('Direito Tributário', 'Repartição de receitas'),
  ('Direito Tributário', 'CTN (competência, normas, vigência, interpretação)'),
  ('Direito Tributário', 'Obrigação tributária (fato gerador, sujeitos)'),
  ('Direito Tributário', 'Responsabilidade tributária (sucessão, solidariedade)'),
  ('Direito Tributário', 'Crédito tributário (lançamento, suspensão, extinção, decadência, repetição)'),
  ('Direito Tributário', 'Garantias'),
  ('Direito Tributário', 'Administração tributária (fiscalização, sigilo, certidões)'),
  ('Direito Tributário', 'Lei Complementar 118/2005'),
  ('Direito Tributário', 'Lei 8.137/1990 (crimes tributários)'),
  -- Estatística e Probabilidade
  ('Estatística e Probabilidade', 'Estatística descritiva'),
  ('Estatística e Probabilidade', 'Análise exploratória (gráficos, medidas de posição/dispersão/assimetria/curtose)'),
  ('Estatística e Probabilidade', 'Probabilidade (axiomas, condicional, independência)'),
  ('Estatística e Probabilidade', 'Amostragem (aleatória simples, estratificada, sistemática, conglomerados)'),
  -- Contabilidade Pública
  ('Contabilidade Pública', 'Conceito e campo'),
  ('Contabilidade Pública', 'Patrimônio público (ativo/passivo)'),
  ('Contabilidade Pública', 'Variações patrimoniais (receita/despesa sob enfoque patrimonial)'),
  ('Contabilidade Pública', 'Mensuração de ativos (imobilizado, intangível, depreciação)'),
  ('Contabilidade Pública', 'Mensuração de passivos (provisões, contingentes)'),
  ('Contabilidade Pública', 'Tratamento de impostos'),
  ('Contabilidade Pública', 'Sistema de custos'),
  ('Contabilidade Pública', 'PCASP'),
  ('Contabilidade Pública', 'DCASP (BP, Balanço Orçamentário, Financeiro, DVP, Fluxo de Caixa, Mutações do PL, Notas)'),
  ('Contabilidade Pública', 'Transações no setor público'),
  ('Contabilidade Pública', 'NBC TSP'),
  ('Contabilidade Pública', 'MCASP 11ª ed.'),
  ('Contabilidade Pública', 'Regime contábil'),
  -- Economia
  ('Economia', 'Escassez, CPP, fatores de produção'),
  ('Economia', 'Microeconomia (oferta/demanda, elasticidades, custos, concorrência, monopólio, bens públicos)'),
  ('Economia', 'Macroeconomia (contas nacionais, PIB, consumo/poupança, multiplicador, políticas de estabilização)'),
  -- Finanças Públicas
  ('Finanças Públicas', 'Conceitos, funções do Estado, políticas alocativas/distributivas/estabilização'),
  ('Finanças Públicas', 'Política econômica e fiscal (déficit, dívida, reformas)'),
  ('Finanças Públicas', 'Orçamento público (conceitos, princípios, ciclo)'),
  ('Finanças Públicas', 'Orçamento no Brasil (PPA, LDO, LOA, créditos)'),
  ('Finanças Públicas', 'Execução orçamentária (descentralização, controle)'),
  ('Finanças Públicas', 'Receita pública (estágios, dívida ativa)'),
  ('Finanças Públicas', 'Despesa pública (restos a pagar, suprimento de fundos)'),
  ('Finanças Públicas', 'LRF (LC 101/2000) e Lei 4.320/1964'),
  ('Finanças Públicas', 'Fluxo de caixa (VPL, TIR)'),
  ('Finanças Públicas', 'Moeda e SFN (Bacen, meios de pagamento)'),
  ('Finanças Públicas', 'Setor externo (câmbio)'),
  ('Finanças Públicas', 'Mercado financeiro brasileiro'),
  -- Legislação Tributária Estadual
  ('Legislação Tributária Estadual', 'Lei Estadual 5.900/1996 (ICMS)'),
  ('Legislação Tributária Estadual', 'Lei 6.555/2004 (IPVA)'),
  ('Legislação Tributária Estadual', 'Lei 5.077/1989 (ITCD)'),
  ('Legislação Tributária Estadual', 'Lei 6.771/2006 (Processo Adm. Tributário)'),
  ('Legislação Tributária Estadual', 'Lei 8.085/2018 (Programa Contribuinte Arretado)'),
  -- Inteligência Artificial
  ('Inteligência Artificial', 'Fundamentos de IA (relações com ML e Deep Learning)'),
  ('Inteligência Artificial', 'Redes neurais'),
  ('Inteligência Artificial', 'Deep learning'),
  ('Inteligência Artificial', 'PLN (mineração de texto)'),
  ('Inteligência Artificial', 'Visão computacional'),
  ('Inteligência Artificial', 'IA generativa (LLM e RAG)'),
  -- Desenvolvimento de Sistemas
  ('Desenvolvimento de Sistemas', 'Modelagem de processos (BPMN, AS-IS/TO-BE)'),
  ('Desenvolvimento de Sistemas', 'Metodologias ágeis (XP, Scrum, Kanban)'),
  ('Desenvolvimento de Sistemas', 'CI/CD'),
  ('Desenvolvimento de Sistemas', 'Arquitetura de software (3 camadas, DDD, SOA, microsserviços)'),
  ('Desenvolvimento de Sistemas', 'Integração (API REST)'),
  ('Desenvolvimento de Sistemas', 'Testes (unitário, integração, TDD)'),
  ('Desenvolvimento de Sistemas', 'Linguagens (Java, JavaScript)'),
  ('Desenvolvimento de Sistemas', 'Git'),
  ('Desenvolvimento de Sistemas', 'Segurança (OWASP)'),
  ('Desenvolvimento de Sistemas', 'Conceitos avançados (event-driven, mensageria, CAP, OAuth2/JWT, API Gateway)'),
  -- Infraestrutura de TIC e Segurança da Informação
  ('Infraestrutura de TIC e Segurança da Informação', 'Nuvem (IaaS, PaaS, SaaS, serverless, contêineres - Docker/K8s)'),
  ('Infraestrutura de TIC e Segurança da Informação', 'DevOps/DevSecOps'),
  ('Infraestrutura de TIC e Segurança da Informação', 'ITIL v4 (incidentes, problemas, mudanças)'),
  ('Infraestrutura de TIC e Segurança da Informação', 'Forense (evidências, hash, cadeia de custódia, wipe)'),
  ('Infraestrutura de TIC e Segurança da Informação', 'Redes (firewall, WAF, proxy, DNS, MPLS, SD-WAN, segmentação)'),
  ('Infraestrutura de TIC e Segurança da Informação', 'Segurança (Zero Trust, gestão de riscos, vulnerabilidades, PKI, testes de invasão)'),
  -- Reforma Tributária
  ('Reforma Tributária', 'EC 132/2023'),
  ('Reforma Tributária', 'LC 214/2025'),
  ('Reforma Tributária', 'LC 227/2026'),
  ('Reforma Tributária', 'Resolução CGIBS 6/2026 e 13/2026'),
  ('Reforma Tributária', 'IBS, CBS e Imposto Seletivo'),
  ('Reforma Tributária', 'Princípio do destino'),
  ('Reforma Tributária', 'Incidência, não incidência, imunidades'),
  ('Reforma Tributária', 'Não cumulatividade e créditos'),
  ('Reforma Tributária', 'Extinção e ressarcimento'),
  ('Reforma Tributária', 'Importação/exportação'),
  ('Reforma Tributária', 'Cashback e Cesta Básica'),
  ('Reforma Tributária', 'Regimes diferenciados'),
  ('Reforma Tributária', 'Comitê Gestor do IBS'),
  ('Reforma Tributária', 'Processo Adm. do IBS'),
  ('Reforma Tributária', 'Distribuição do IBS'),
  ('Reforma Tributária', 'Regras de transição'),
  ('Reforma Tributária', 'Split payment'),
  ('Reforma Tributária', 'Apuração assistida'),
  ('Reforma Tributária', 'Sinter e CIB'),
  ('Reforma Tributária', 'Tabela cCredPres'),
  ('Reforma Tributária', 'Novas obrigações (DeRE, NF-ABI, NFAg, BP-e Aéreo, NF-e Gás)'),
  -- Auditoria Fiscal
  ('Auditoria Fiscal', 'SPED'),
  ('Auditoria Fiscal', 'MOC NF-e/NFC-e (v7.0)'),
  ('Auditoria Fiscal', 'Guia Prático EFD ICMS/IPI (v3.2.2)'),
  ('Auditoria Fiscal', 'CT-e e CT-e OS (v4.0)'),
  ('Auditoria Fiscal', 'MDF-e (v3.0b)'),
  ('Auditoria Fiscal', 'Tabelas CFOP, CST, CSOSN, cBenef'),
  ('Auditoria Fiscal', 'Cruzamento NF-e x EFD'),
  ('Auditoria Fiscal', 'Omissão de receitas, divergências, créditos indevidos'),
  -- Ciência de Dados
  ('Ciência de Dados', 'Dado, informação, conhecimento'),
  ('Ciência de Dados', 'Coleta e integração'),
  ('Ciência de Dados', 'Bancos relacionais (metadados, chaves, relacionamentos)'),
  ('Ciência de Dados', 'Modelagem relacional/dimensional'),
  ('Ciência de Dados', 'SQL'),
  ('Ciência de Dados', 'CRISP-DM'),
  ('Ciência de Dados', 'Visualização e EDA'),
  ('Ciência de Dados', 'Mineração (classificação, associação, regressão, clusterização, anomalias)'),
  ('Ciência de Dados', 'Aprendizado de máquina (algoritmos, métricas)'),
  ('Ciência de Dados', 'Big Data'),
  ('Ciência de Dados', 'BI')
) AS t(disciplina_nome, nome) ON t.disciplina_nome = d.nome;

COMMIT;

-- Conferência rápida pós-script:
-- SELECT g.nome AS grupo, d.nome AS disciplina, count(c.id) AS topicos
-- FROM concursos co
-- JOIN grupos g ON g.concurso_id = co.id
-- JOIN disciplinas d ON d.grupo_id = g.id
-- LEFT JOIN conteudos c ON c.disciplina_id = d.id
-- WHERE co.slug = 'sefaz-al'
-- GROUP BY g.nome, d.nome, g.ordem
-- ORDER BY g.ordem, d.nome;
