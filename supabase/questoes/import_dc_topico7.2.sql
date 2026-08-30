BEGIN;

WITH conc AS (
  SELECT id FROM concursos WHERE slug = 'sefaz-al'
),
disc AS (
  SELECT d.id FROM disciplinas d
  JOIN grupos g ON g.id = d.grupo_id
  JOIN conc c ON c.id = g.concurso_id
  WHERE d.nome = 'Direito Constitucional'
),
cont AS (
  SELECT c2.id FROM conteudos c2
  JOIN disc d ON d.id = c2.disciplina_id
  WHERE c2.nome = '7.2 Funcionamento e atribuições.'
),
rows AS (
  SELECT * FROM (VALUES
  ('O Congresso Nacional reunir-se-á, anualmente, na Capital Federal, de 2 de fevereiro a 17 de julho e de 1º de agosto a 22 de dezembro.', 'A'),
  ('As reuniões marcadas para o início e o término dos períodos legislativos serão transferidas para o primeiro dia útil subsequente quando recaírem em sábados, domingos ou feriados.', 'A'),
  ('A sessão legislativa não será interrompida sem a aprovação do projeto de lei de diretrizes orçamentárias.', 'A'),
  ('É lícito à Mesa do Congresso Nacional interromper a sessão legislativa ainda que pendente de aprovação o projeto de lei de diretrizes orçamentárias, desde que por decisão da maioria absoluta de seus membros.', 'B'),
  ('Cada uma das Casas do Congresso Nacional reunir-se-á em sessões preparatórias, a partir de 1º de fevereiro, no primeiro ano da legislatura, para a posse de seus membros e a eleição das respectivas Mesas.', 'A'),
  ('As Mesas da Câmara dos Deputados e do Senado Federal são eleitas para mandato de dois anos, sendo permitida a recondução para o mesmo cargo na eleição imediatamente subsequente.', 'B'),
  ('A Mesa do Congresso Nacional é presidida pelo Presidente do Senado Federal, e os demais cargos são exercidos, alternadamente, pelos ocupantes de cargos equivalentes na Câmara dos Deputados e no Senado Federal.', 'A'),
  ('A Mesa do Congresso Nacional é presidida, alternadamente, pelo Presidente da Câmara dos Deputados e pelo Presidente do Senado Federal, a cada ano da legislatura.', 'B'),
  ('A Câmara dos Deputados e o Senado Federal, ou qualquer de suas Comissões, poderão reunir-se em sessão conjunta para deliberar sobre qualquer matéria de interesse comum às duas Casas, ainda que não prevista expressamente na Constituição.', 'B'),
  ('Compete à Câmara dos Deputados e ao Senado Federal, reunidos em sessão conjunta, inaugurar a sessão legislativa.', 'A'),
  ('Cabe ao Congresso Nacional, em sessão conjunta, elaborar o regimento comum e regular a criação de serviços comuns às duas Casas.', 'A'),
  ('O Congresso Nacional, reunido em sessão conjunta, recebe o compromisso do Presidente e do Vice-Presidente da República.', 'A'),
  ('O veto oposto pelo Presidente da República a projeto de lei é conhecido e deliberado por cada uma das Casas do Congresso Nacional isoladamente, e não em sessão conjunta.', 'B'),
  ('A convocação extraordinária do Congresso Nacional, em caso de decretação de estado de defesa ou de intervenção federal, compete ao Presidente do Senado Federal.', 'A'),
  ('A convocação extraordinária do Congresso Nacional, em caso de urgência ou de interesse público relevante, pode ser feita pelo Presidente da República, pelos Presidentes da Câmara dos Deputados e do Senado Federal ou a requerimento da maioria dos membros de ambas as Casas.', 'A'),
  ('A convocação extraordinária do Congresso Nacional é ato discricionário e exclusivo do Presidente da República, não podendo ser deflagrada pelos Presidentes das Casas Legislativas nem por requerimento dos parlamentares.', 'B'),
  ('Na sessão legislativa extraordinária, o Congresso Nacional somente deliberará sobre a matéria para a qual foi convocado, ressalvadas as medidas provisórias em vigor na data da convocação, que serão automaticamente incluídas na pauta.', 'A'),
  ('É devido aos parlamentares o pagamento de parcela indenizatória em razão da convocação extraordinária do Congresso Nacional.', 'B'),
  ('Na constituição das Mesas e de cada Comissão, é assegurada, tanto quanto possível, a representação proporcional dos partidos ou dos blocos parlamentares que participam da respectiva Casa.', 'A'),
  ('Às comissões, em razão da matéria de sua competência, cabe discutir e votar projeto de lei que dispensar, na forma do regimento, a competência do Plenário, sendo essa deliberação da comissão insuscetível de recurso ao Plenário.', 'B'),
  ('As comissões do Congresso Nacional podem realizar audiências públicas com entidades da sociedade civil.', 'A'),
  ('É vedado às comissões de qualquer das Casas do Congresso Nacional convocar Ministros de Estado para prestar informações sobre assuntos inerentes às suas atribuições, sendo essa convocação privativa do Plenário.', 'B'),
  ('Cabe às comissões receber petições, reclamações, representações ou queixas de qualquer pessoa contra atos ou omissões de autoridades ou entidades públicas.', 'A'),
  ('As comissões do Congresso Nacional podem solicitar depoimento de qualquer autoridade ou cidadão.', 'A'),
  ('Compete às comissões apreciar programas de obras, planos nacionais, regionais e setoriais de desenvolvimento e sobre eles emitir parecer.', 'A'),
  ('Durante o recesso parlamentar, funciona uma Comissão Representativa do Congresso Nacional, eleita por suas Casas na última sessão ordinária do período legislativo, cuja composição reproduzirá, quanto possível, a proporcionalidade da representação partidária.', 'A'),
  ('A Comissão Representativa do Congresso Nacional, que funciona durante o recesso parlamentar, é dispensada de observar a proporcionalidade da representação partidária existente nas Casas Legislativas.', 'B'),
  ('A Câmara dos Deputados e o Senado Federal, ou qualquer de suas Comissões, poderão convocar Ministro de Estado para prestar, pessoalmente, informações sobre assunto previamente determinado, importando crime de responsabilidade a ausência sem justificação adequada.', 'A'),
  ('Os Ministros de Estado somente poderão comparecer ao Senado Federal, à Câmara dos Deputados ou a qualquer de suas Comissões quando convocados, sendo-lhes vedado o comparecimento por iniciativa própria.', 'B'),
  ('Os titulares de órgãos diretamente subordinados à Presidência da República não se sujeitam ao dever de comparecimento perante o Congresso Nacional, dever esse restrito, pela Constituição Federal, aos Ministros de Estado.', 'B'),
  ('As Mesas da Câmara dos Deputados e do Senado Federal podem encaminhar pedidos escritos de informação a Ministros de Estado, importando crime de responsabilidade a recusa, ou o não atendimento, no prazo de trinta dias, bem como a prestação de informações falsas.', 'A'),
  ('O prazo constitucional para resposta a pedido escrito de informação encaminhado por Mesa de Casa Legislativa a Ministro de Estado é de sessenta dias, contado do recebimento do requerimento.', 'B'),
  ('É da competência exclusiva do Congresso Nacional resolver definitivamente sobre tratados, acordos ou atos internacionais que acarretem encargos ou compromissos gravosos ao patrimônio nacional.', 'A'),
  ('As matérias de competência exclusiva do Congresso Nacional, previstas no art. 49 da Constituição Federal, são materializadas por lei ordinária, sujeitando-se, portanto, à sanção ou ao veto do Presidente da República.', 'B'),
  ('Compete exclusivamente ao Congresso Nacional autorizar o Presidente e o Vice-Presidente da República a se ausentarem do País, quando a ausência exceder a quinze dias.', 'A'),
  ('É competência exclusiva do Congresso Nacional fiscalizar e controlar, diretamente, ou por qualquer de suas Casas, os atos do Poder Executivo, incluídos os da administração indireta.', 'A'),
  ('Compete exclusivamente ao Congresso Nacional sustar os atos normativos do Poder Executivo que exorbitem do poder regulamentar ou dos limites de delegação legislativa.', 'A'),
  ('A competência para sustar os atos normativos do Poder Executivo que exorbitem do poder regulamentar é do Supremo Tribunal Federal, e não do Congresso Nacional, por se tratar de controle de constitucionalidade.', 'B'),
  ('Compete privativamente ao Presidente da República, e não ao Congresso Nacional, mudar temporariamente a sede do Governo Federal.', 'B'),
  ('Compete exclusivamente ao Congresso Nacional fixar idêntico subsídio para os Deputados Federais e os Senadores.', 'A'),
  ('Compete exclusivamente ao Congresso Nacional fixar os subsídios do Presidente e do Vice-Presidente da República e dos Ministros de Estado.', 'A'),
  ('A fixação dos subsídios do Presidente da República, do Vice-Presidente e dos Ministros de Estado depende de sanção presidencial, por se tratar de matéria de competência comum do Congresso Nacional.', 'B'),
  ('É atribuição exclusiva do Congresso Nacional julgar anualmente as contas prestadas pelo Presidente da República e apreciar os relatórios sobre a execução dos planos de governo.', 'A'),
  ('O julgamento anual das contas do Presidente da República é atribuição privativa do Tribunal de Contas da União, sem qualquer participação do Congresso Nacional.', 'B'),
  ('A apreciação dos atos de concessão e renovação de concessão de emissoras de rádio e televisão é atribuição exclusiva da Agência Nacional de Telecomunicações (Anatel), não competindo ao Congresso Nacional qualquer manifestação sobre a matéria.', 'B'),
  ('É da competência exclusiva do Congresso Nacional autorizar referendo e convocar plebiscito.', 'A'),
  ('Compete exclusivamente ao Congresso Nacional autorizar, em terras indígenas, a exploração e o aproveitamento de recursos hídricos e a pesquisa e a lavra de riquezas minerais.', 'A'),
  ('É da competência exclusiva do Congresso Nacional escolher dois terços dos membros do Tribunal de Contas da União.', 'A'),
  ('Compete ao Congresso Nacional, com a sanção do Presidente da República, dispor sobre criação, transformação e extinção de cargos, empregos e funções públicas, bem como sobre criação e extinção de Ministérios e órgãos da administração pública.', 'A'),
  ('A concessão de anistia é matéria de competência exclusiva do Congresso Nacional, dispensada a sanção do Presidente da República.', 'B')
  ) AS r(enunciado, gabarito)
)
INSERT INTO questoes (concurso_id, disciplina_id, conteudo_id, enunciado, alternativa_a, alternativa_b, gabarito, tipo)
SELECT conc.id, disc.id, cont.id, rows.enunciado, 'Certo', 'Errado', rows.gabarito, 'certo_errado'
FROM rows CROSS JOIN conc CROSS JOIN disc CROSS JOIN cont;

COMMIT;
