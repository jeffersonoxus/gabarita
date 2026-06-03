-- 10 questoes com texto de apoio e imagem
-- 5 para "compreensao e interpretacao" + 5 para "reconhecimento de tipos e generos"
-- IMAGENS: faça upload dos PNGs no bucket "questoes" e troque as URLs abaixo

DO $$
DECLARE
  c_id UUID; dp UUID;
  ct1 UUID; ct2 UUID;
  img1 TEXT := 'https://placehold.co/600x400/EEE/999?text=Texto+Base+1';
  img2 TEXT := 'https://placehold.co/600x400/DDD/888?text=Texto+Base+2';
  img3 TEXT := 'https://placehold.co/600x400/CCC/777?text=Texto+Base+3';
BEGIN
  SELECT id INTO c_id FROM public.concursos WHERE slug = 'seduc-al-2026';
  SELECT id INTO dp FROM public.disciplinas WHERE nome ILIKE '%portuguesa%' AND tipo = 'basica' AND concurso_id = c_id;
  SELECT id INTO ct1 FROM public.conteudos WHERE disciplina_id = dp AND nome ILIKE '%1 compreensão%' LIMIT 1;
  SELECT id INTO ct2 FROM public.conteudos WHERE disciplina_id = dp AND nome ILIKE '%2 reconhecimento%' LIMIT 1;

  -- === CONTEUDO 1: Compreensão e interpretação (5 questões) ===
  INSERT INTO public.questoes (concurso_id, disciplina_id, conteudo_id, texto_apoio, imagem_url, enunciado, alternativa_a, alternativa_b, gabarito, tipo) VALUES

  (c_id, dp, ct1,
   'Todo texto é um ato de comunicação, produto da interação entre autor e leitor em determinado contexto histórico-social.',
   img1,
   'A compreensão textual depende exclusivamente da decodificação das palavras e estruturas gramaticais, dispensando o conhecimento prévio do leitor.',
   'Certo', 'Errado', 'B', 'certo_errado'),

  (c_id, dp, ct1,
   'Os gêneros textuais manifestam-se em situações comunicativas concretas, refletindo as condições específicas de produção e circulação do discurso.',
   img1,
   'O mesmo gênero textual pode apresentar variações em sua estrutura composicional, dependendo do suporte, do propósito comunicativo e da esfera social em que circula.',
   'Certo', 'Errado', 'A', 'certo_errado'),

  (c_id, dp, ct1,
   'A coerência textual diz respeito à conexão lógica entre as ideias, possibilitando a construção de sentido no processo de leitura.',
   img2,
   'Um texto coerente é aquele que não apresenta contradições internas e cujas ideias mantêm relação de continuidade e progressão temática.',
   'Certo', 'Errado', 'A', 'certo_errado'),

  (c_id, dp, ct1,
   'A intertextualidade caracteriza-se pela presença de elementos de um texto em outro, estabelecendo diálogo entre diferentes produções discursivas.',
   img2,
   'A intertextualidade ocorre apenas quando há citação direta da fonte, sendo obrigatória a referência explícita ao autor do texto original.',
   'Certo', 'Errado', 'B', 'certo_errado'),

  (c_id, dp, ct1,
   'Os implícitos textuais — pressupostos e subentendidos — são informações não explicitadas que o leitor recupera a partir de pistas linguísticas e do contexto.',
   img3,
   'Na frase "Pedro parou de fumar", a informação de que Pedro fumava antes é um pressuposto, pois está inscrita linguisticamente no enunciado.',
   'Certo', 'Errado', 'A', 'certo_errado'),

  -- === CONTEUDO 2: Tipos e gêneros textuais (5 questões) ===
  (c_id, dp, ct2,
   'Os gêneros textuais são formas relativamente estáveis de enunciados, caracterizadas por conteúdo temático, estilo e construção composicional.',
   img1,
   'O editorial, a carta ao leitor e o artigo de opinião são exemplos de gêneros textuais pertencentes à esfera jornalística.',
   'Certo', 'Errado', 'A', 'certo_errado'),

  (c_id, dp, ct2,
   'Conforme Bakhtin, os gêneros do discurso são tipos relativamente estáveis de enunciados elaborados pelas diferentes esferas da atividade humana.',
   img2,
   'Os tipos textuais — narração, descrição, dissertação, injunção e exposição — constituem categorias universais definidas por traços linguísticos predominantes.',
   'Certo', 'Errado', 'A', 'certo_errado'),

  (c_id, dp, ct2,
   'A dissertação argumentativa caracteriza-se pela defesa de um ponto de vista, sustentado por argumentos, com vistas a persuadir o leitor.',
   img3,
   'Na dissertação argumentativa, a presença de operadores argumentativos é facultativa, uma vez que a progressão temática independe de articuladores lógicos.',
   'Certo', 'Errado', 'B', 'certo_errado'),

  (c_id, dp, ct2,
   'O gênero textual "notícia" estrutura-se predominantemente a partir do tipo narrativo, com elementos como fato, tempo, lugar e personagens.',
   img1,
   'Diferentemente da reportagem, a notícia limita-se ao relato objetivo do fato, sem aprofundamento investigativo, análise ou contextualização ampliada.',
   'Certo', 'Errado', 'A', 'certo_errado'),

  (c_id, dp, ct2,
   'Os gêneros textuais sofrem transmutações ao longo do tempo, adaptando-se a novas práticas sociais, o que explica o surgimento de gêneros digitais.',
   img2,
   'O e-mail, o blog e a postagem em redes sociais são exemplos de gêneros textuais digitais que derivam de práticas comunicativas pré-existentes, conservando traços de gêneros anteriores.',
   'Certo', 'Errado', 'A', 'certo_errado');

END $$;

-- Confere
SELECT 'Conteudo 1: ' || COUNT(*) FROM public.questoes WHERE conteudo_id IN (SELECT id FROM public.conteudos WHERE nome ILIKE '%1 compreensão%');
SELECT 'Conteudo 2: ' || COUNT(*) FROM public.questoes WHERE conteudo_id IN (SELECT id FROM public.conteudos WHERE nome ILIKE '%2 reconhecimento%');
SELECT 'Total: ' || COUNT(*) FROM public.questoes;
