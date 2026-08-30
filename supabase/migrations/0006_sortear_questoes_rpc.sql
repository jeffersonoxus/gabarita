-- Move o sorteio de questões do simulado (src/app/simulado/[slug]/exame/page.tsx)
-- do cliente para o banco. Hoje o app busca TODAS as questões que batem com
-- o filtro (concurso + disciplinas/tópicos escolhidos) e só então embaralha
-- e sorteia `qtd` no navegador — funciona, mas baixa muito mais dado do que
-- precisa quando o filtro é amplo (ex: uma disciplina inteira com milhares
-- de questões para escolher só 5).
--
-- Esta função replica a mesma lógica de sorteio balanceado por tópico
-- (round-robin: uma questão por tópico a cada "rodada", pra não deixar um
-- tópico com muitas questões dominar o simulado) usando ROW_NUMBER() OVER
-- (PARTITION BY tópico ORDER BY random()), mas devolve só as `p_qtd` linhas
-- finais — nunca mais que isso, independente de o banco ter mil ou cem mil
-- questões. Escala igual com qualquer número de usuários simultâneos,
-- porque cada chamada é independente e só transfere o necessário.
--
-- security invoker (padrão): roda com os privilégios de quem chama,
-- respeitando as mesmas RLS policies que já valem para o SELECT direto em
-- `questoes` usado pelo app.

CREATE OR REPLACE FUNCTION public.sortear_questoes(
  p_concurso_id uuid,
  p_disciplina_ids uuid[] DEFAULT NULL,
  p_conteudo_ids uuid[] DEFAULT NULL,
  p_qtd int DEFAULT 5
)
RETURNS SETOF questoes
LANGUAGE sql
STABLE
AS $$
  SELECT q.*
  FROM questoes q
  JOIN (
    SELECT id,
           row_number() OVER (
             PARTITION BY coalesce(conteudo_id, disciplina_id)
             ORDER BY random()
           ) AS rn,
           coalesce(conteudo_id, disciplina_id) AS grp
    FROM questoes
    WHERE concurso_id = p_concurso_id
      AND (p_disciplina_ids IS NULL OR disciplina_id = ANY(p_disciplina_ids))
      AND (p_conteudo_ids IS NULL OR conteudo_id = ANY(p_conteudo_ids))
  ) ranked ON ranked.id = q.id
  ORDER BY ranked.rn, ranked.grp
  LIMIT p_qtd;
$$;

GRANT EXECUTE ON FUNCTION public.sortear_questoes(uuid, uuid[], uuid[], int) TO anon, authenticated;

-- Acelera o filtro WHERE da função acima (e outras consultas por concurso/
-- disciplina/tópico) à medida que o banco de questões cresce.
CREATE INDEX IF NOT EXISTS idx_questoes_concurso_disciplina_conteudo
  ON questoes (concurso_id, disciplina_id, conteudo_id);
